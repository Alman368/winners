import asyncio
from collections.abc import Awaitable, Callable
from datetime import date, timedelta, timezone
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse
from pydantic import BaseModel
from shapely import box, unary_union
from shapely.geometry import MultiPolygon, Polygon, shape

from api.georeferencing import georeference_image
from libs import cache
from libs.copernicus.auth import copernicus_token
from libs.copernicus.catalog import Acquisition, search_acquisitions
from libs.effis import FireStartNotFoundError, find_fire_start
from libs.http_client import TIMEOUT_S, get_http_client
from libs.roads import affected_roads, fetch_roads
from libs.weather import fetch_weather
from models import AnalysisInProgress, AnalysisReport, AnalysisResult, FireContext, FireDays
from pipeline.config import CONFIG
from pipeline.models import FireAnalysis, SceneInput
from pipeline.pipeline import analyze

router: APIRouter = APIRouter(prefix="/analysis", tags=["analysis"])

EFFIS_TIMEOUT_S: int = 180
PIPELINE_DIR: Path = Path(__file__).resolve().parents[1] / "pipeline"
DEMO_SCENES_DIR: Path = PIPELINE_DIR / "scenes"
SCENE_RESULTS_DIR: Path = DEMO_SCENES_DIR / "results"
PIPELINE_SOURCE: str = cache.cache_key(*(path.read_bytes() for path in sorted(PIPELINE_DIR.glob("*.py"))))
"""Fingerprint of the algorithm code. It is part of every analysis cache key, so any change to the pipeline (results
or output schema) computes new analyses instead of serving ones made by older code."""

FIRE_DAYS_MAX_CLOUD_PCT: float = 20.0
"""Passes with more cloud than this in any of their tiles are skipped: clouds hide both the fire front and the scar."""
FIRE_DAYS_MIN_COVERAGE: float = 0.99
"""Share of the scene a day's tiles must cover. Passes at the edge of an orbit swath leave part of the scene empty, and
the burned area measured on them shrinks."""
FIRE_DAYS_SEARCH_DAYS: int = 30
"""Days after the challenge image searched for the end of the fire."""
FIRE_OUT_MAX_FRONT_KM: float = 2.0
"""Active front below which the fire counts as out. Fixed industrial heat sources add up to ~1.3 km every day
(Madrid-Ávila, Niebla), while the fires themselves show 12-42 km on their challenge images."""

_background_tasks: dict[str, asyncio.Task[BaseModel]] = {}


async def _analyze_image(client: httpx.Client, content: bytes, filename: str, place: str) -> AnalysisResult:
    georeference = await georeference_image(client, content, filename, place)
    async with httpx.AsyncClient(timeout=EFFIS_TIMEOUT_S) as effis_client:
        try:
            fire_start = await find_fire_start(
                effis_client,
                georeference.country_code,
                georeference.bbox,
                georeference.date,
                CONFIG.pre_fire_window_days,
            )
        except FireStartNotFoundError:
            raise HTTPException(status_code=422, detail="fire_start_not_found")
    scene = SceneInput(
        bbox=georeference.bbox,
        acquisition_date=georeference.date,
        fire_start=fire_start.astimezone(timezone.utc).date(),
        image_size=georeference.image_size,
    )
    return AnalysisResult(georeference=georeference, fire_start=fire_start, analysis=await analyze(scene))


def _burned_area(analysis: FireAnalysis) -> MultiPolygon:
    return MultiPolygon(
        [Polygon(polygon.exterior.lonlat, [hole.lonlat for hole in polygon.holes]) for polygon in analysis.burned_area.polygons]
    )


def _fire_context(client: httpx.Client, analysis: FireAnalysis, fire_start: date) -> FireContext:
    burned = _burned_area(analysis)
    # Only roads inside the burned area's bounds can cross it, and a smaller query answers faster.
    roads = [] if burned.is_empty else affected_roads(fetch_roads(client, burned.bounds), burned)
    west, south, east, north = analysis.scene.bbox
    return FireContext(
        roads=roads,
        weather=fetch_weather(client, (west + east) / 2, (south + north) / 2, fire_start, analysis.scene.acquisition_date),
    )


async def fire_context(client: httpx.Client, analysis: FireAnalysis, fire_start: date) -> FireContext:
    """Roads cut by the burned area and the weather from the fire start to the image, cached in `data/cache/context/`."""
    return await cache.cached(
        cache.CACHE_DIR / "context",
        cache.cache_key(analysis.model_dump_json(), fire_start.isoformat()),
        FireContext,
        lambda: run_in_threadpool(_fire_context, client, analysis, fire_start),
    )


@router.post("")
async def analyze_upload(
    image: UploadFile,
    place: Annotated[str, Form()],
    client: Annotated[httpx.Client, Depends(get_http_client)],
) -> AnalysisReport:
    """Locates a Copernicus Browser export, finds its fire start in EFFIS, runs the fire detection pipeline and adds
    the roads cut by the fire and the weather.

    The analysis is cached per image and place in `data/cache/analysis/` and the context in `data/cache/context/`.
    """
    content = await image.read()
    result = await cache.cached(
        cache.CACHE_DIR / "analysis",
        cache.cache_key(content, image.filename, place, PIPELINE_SOURCE),
        AnalysisResult,
        lambda: _analyze_image(client, content, image.filename, place),
    )
    context = await fire_context(client, result.analysis, result.fire_start.astimezone(timezone.utc).date())
    return AnalysisReport(**result.model_dump(), context=context)


@router.get("/scenes/{scene_id}")
async def demo_scene_analysis(scene_id: str) -> FileResponse:
    """Fire analysis of one of the example scenes, precomputed and stored in `pipeline/scenes/results/`.

    Running the pipeline downloads hundreds of MB from Copernicus and takes minutes, so the demo serves results
    made beforehand with `uv run python -m pipeline <scene_id>`.
    """
    result_file = SCENE_RESULTS_DIR / f"{scene_id}.json"
    if not result_file.exists():
        raise HTTPException(status_code=404, detail="scene_not_found")
    return FileResponse(result_file, media_type="application/json")


async def _in_background[M: BaseModel](
    directory: Path, key: str, model: type[M], compute: Callable[[], Awaitable[M]], response: Response
) -> M | AnalysisInProgress:
    """Answers 202 while `compute` runs as a task of its own, so a client that disconnects does not cancel it, and
    the result once it is ready, from then on from `directory`."""
    task = _background_tasks.get(key)
    if task is None:
        stored = cache.load(directory, key, model)
        if stored is not None:
            return stored
        _background_tasks[key] = asyncio.create_task(cache.cached(directory, key, model, compute))
    elif task.done():
        del _background_tasks[key]
        return task.result()
    response.status_code = 202
    return AnalysisInProgress()


def demo_scene(scene_id: str) -> SceneInput:
    scene_file = DEMO_SCENES_DIR / f"{scene_id}.json"
    if not scene_file.exists():
        raise HTTPException(status_code=404, detail="scene_not_found")
    return SceneInput.model_validate_json(scene_file.read_text())


async def analyze_scene_day(scene: SceneInput) -> FireAnalysis:
    """Analysis of an example scene on one day, made once and then read from `data/cache/analysis-scenes/`."""
    return await cache.cached(
        cache.CACHE_DIR / "analysis-scenes",
        cache.cache_key(scene.model_dump_json(), PIPELINE_SOURCE),
        FireAnalysis,
        lambda: analyze(scene),
    )


async def find_fire_days(scene: SceneInput) -> FireDays:
    """Brackets the fire with clear Sentinel-2 passes that cover the whole scene, walking forward from the challenge
    image until the pipeline finds the fire out."""
    with httpx.Client(timeout=TIMEOUT_S) as client:
        passes = await run_in_threadpool(
            search_acquisitions,
            client,
            await run_in_threadpool(copernicus_token, client),
            scene.bbox,
            scene.fire_start + timedelta(days=1),
            scene.acquisition_date + timedelta(days=FIRE_DAYS_SEARCH_DAYS),
        )
    passes_by_day: dict[date, list[Acquisition]] = {}
    for item in passes:
        passes_by_day.setdefault(item.acquired_at.date(), []).append(item)
    scene_box = box(*scene.bbox)
    clear_days = sorted(
        day
        for day, items in passes_by_day.items()
        if max(item.cloud_cover for item in items) <= FIRE_DAYS_MAX_CLOUD_PCT
        and unary_union([shape(item.footprint) for item in items]).intersection(scene_box).area / scene_box.area
        >= FIRE_DAYS_MIN_COVERAGE
    )
    first = min((day for day in clear_days if day < scene.acquisition_date), default=scene.acquisition_date)
    for day in (day for day in clear_days if day > scene.acquisition_date):
        analysis = await analyze_scene_day(scene.model_copy(update={"acquisition_date": day}))
        if analysis.active_front_km < FIRE_OUT_MAX_FRONT_KM:
            return FireDays(first=first, last=day)
    return FireDays(first=first, last=scene.acquisition_date)


def fire_days_key(scene: SceneInput) -> str:
    return cache.cache_key(scene.model_dump_json(), PIPELINE_SOURCE)


@router.get("/scenes/{scene_id}/fire-days", responses={202: {"model": AnalysisInProgress}})
async def demo_scene_fire_days(scene_id: str, response: Response) -> FireDays | AnalysisInProgress:
    """First and last Sentinel-2 days of an example scene's fire, found in the background: it may run the pipeline on
    several days, which takes minutes the first time."""
    scene = demo_scene(scene_id)
    return await _in_background(
        cache.CACHE_DIR / "fire-days", fire_days_key(scene), FireDays, lambda: find_fire_days(scene), response
    )


async def demo_scene_context(scene_id: str) -> FireContext:
    scene = demo_scene(scene_id)
    analysis = FireAnalysis.model_validate_json((SCENE_RESULTS_DIR / f"{scene_id}.json").read_text())
    with httpx.Client(timeout=TIMEOUT_S) as client:
        return await fire_context(client, analysis, scene.fire_start)


@router.get("/scenes/{scene_id}/context", responses={202: {"model": AnalysisInProgress}})
async def demo_scene_context_in_background(scene_id: str, response: Response) -> FireContext | AnalysisInProgress:
    """Roads cut by the fire and weather of an example scene, on its precomputed analysis. Found in the background,
    since Overpass takes ~40 s."""
    demo_scene(scene_id)
    return await _in_background(
        cache.CACHE_DIR / "context-scenes",
        cache.cache_key(scene_id, (SCENE_RESULTS_DIR / f"{scene_id}.json").read_bytes()),
        FireContext,
        lambda: demo_scene_context(scene_id),
        response,
    )
