import asyncio
from datetime import date, timezone
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from shapely.geometry import MultiPolygon, Polygon

from api.georeferencing import georeference_image
from libs import cache
from libs.effis import FireStartNotFoundError, find_fire_start
from libs.http_client import get_http_client
from libs.roads import affected_roads, fetch_roads
from libs.weather import fetch_weather
from models import AnalysisInProgress, AnalysisReport, AnalysisResult, FireContext
from pipeline.config import CONFIG
from pipeline.models import FireAnalysis, SceneInput
from pipeline.pipeline import analyze

router: APIRouter = APIRouter(prefix="/analysis", tags=["analysis"])

EFFIS_TIMEOUT_S: int = 180
DEMO_SCENES_DIR: Path = Path(__file__).resolve().parents[1] / "pipeline" / "scenes"

_scene_analyses: dict[str, asyncio.Task[FireAnalysis]] = {}


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
        cache.cache_key(content, image.filename, place),
        AnalysisResult,
        lambda: _analyze_image(client, content, image.filename, place),
    )
    context = await fire_context(client, result.analysis, result.fire_start.astimezone(timezone.utc).date())
    return AnalysisReport(**result.model_dump(), context=context)


@router.get("/scenes/{scene_id}", responses={202: {"model": AnalysisInProgress}})
async def analyze_demo_scene(scene_id: str, response: Response) -> FireAnalysis | AnalysisInProgress:
    """Analyses one of the example scenes in `pipeline/scenes/`, in the background.

    The first run downloads Sentinel-2 data and takes minutes, longer than a request should stay open. It answers
    202 while the analysis runs, and the result once it is ready, from then on from `data/cache/analysis-scenes/`.
    The analysis is a task of its own, so a client that disconnects does not cancel it.
    """
    scene_file = DEMO_SCENES_DIR / f"{scene_id}.json"
    if not scene_file.exists():
        raise HTTPException(status_code=404, detail="scene_not_found")
    key = cache.cache_key(scene_file.read_bytes())
    task = _scene_analyses.get(key)
    if task is None:
        stored = cache.load(cache.CACHE_DIR / "analysis-scenes", key, FireAnalysis)
        if stored is not None:
            return stored
        scene = SceneInput.model_validate_json(scene_file.read_text())
        _scene_analyses[key] = asyncio.create_task(
            cache.cached(cache.CACHE_DIR / "analysis-scenes", key, FireAnalysis, lambda: analyze(scene))
        )
    elif task.done():
        del _scene_analyses[key]
        return task.result()
    response.status_code = 202
    return AnalysisInProgress()


@router.get("/scenes/{scene_id}/context", responses={202: {"model": AnalysisInProgress}})
async def demo_scene_context(
    scene_id: str, response: Response, client: Annotated[httpx.Client, Depends(get_http_client)]
) -> FireContext | AnalysisInProgress:
    """Roads cut by the fire and weather for one of the example scenes in `pipeline/scenes/`.

    Like the scene analysis it builds on, it answers 202 until that analysis is ready.
    """
    analysis = await analyze_demo_scene(scene_id, response)
    if isinstance(analysis, AnalysisInProgress):
        return analysis
    scene = SceneInput.model_validate_json((DEMO_SCENES_DIR / f"{scene_id}.json").read_text())
    return await fire_context(client, analysis, scene.fire_start)
