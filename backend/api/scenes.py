from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from libs import cache
from libs.copernicus import render
from libs.copernicus.auth import copernicus_token
from libs.copernicus.catalog import Acquisition, search_acquisitions
from libs.copernicus.render import Composite, render_composite
from libs.detection import analyze_swir
from libs.http_client import get_http_client
from models import SceneAnalysis

router: APIRouter = APIRouter(prefix="/scenes", tags=["scenes"])

PUBLICATION_LATENCY_DAYS: int = 3
"""Sentinel-2 tiles can take up to ~39 h to be published, so a day is only rendered for good once 48 h have passed
since it ended."""
RENDER_SOURCE: str = cache.cache_key(Path(render.__file__).read_bytes())
SETTLED_CACHE_CONTROL: str = "public, max-age=86400"
RECENT_CACHE_CONTROL: str = "no-cache"


@router.post("/analyze")
async def analyze_scene(swir: UploadFile) -> SceneAnalysis:
    image = Image.open(swir.file)
    return await run_in_threadpool(analyze_swir, image)


@router.get("/passes")
async def list_passes(
    west: float,
    south: float,
    east: float,
    north: float,
    start: date,
    end: date,
    client: Annotated[httpx.Client, Depends(get_http_client)],
) -> list[Acquisition]:
    token = await run_in_threadpool(copernicus_token, client)
    return await run_in_threadpool(search_acquisitions, client, token, (west, south, east, north), start, end)


def _render(client: httpx.Client, bbox: tuple[float, float, float, float], day: date, composite: Composite) -> bytes:
    return render_composite(client, copernicus_token(client), bbox, day, composite)


@router.get("/image")
async def scene_image(
    west: float,
    south: float,
    east: float,
    north: float,
    day: date,
    composite: Composite,
    client: Annotated[httpx.Client, Depends(get_http_client)],
) -> Response:
    bbox = (west, south, east, north)
    if day > datetime.now(timezone.utc).date() - timedelta(days=PUBLICATION_LATENCY_DAYS):
        png = await run_in_threadpool(_render, client, bbox, day, composite)
        return Response(content=png, media_type="image/png", headers={"Cache-Control": RECENT_CACHE_CONTROL})
    png = await cache.cached_bytes(
        cache.CACHE_DIR / "renders",
        cache.cache_key(str(bbox), day.isoformat(), composite, RENDER_SOURCE),
        lambda: run_in_threadpool(_render, client, bbox, day, composite),
    )
    return Response(content=png, media_type="image/png", headers={"Cache-Control": SETTLED_CACHE_CONTROL})
