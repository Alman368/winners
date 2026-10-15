from datetime import date, datetime, timedelta, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from libs import cache
from libs.copernicus.auth import copernicus_token
from libs.copernicus.catalog import Acquisition, search_acquisitions
from libs.copernicus.render import Composite, render_composite
from libs.detection import analyze_swir
from libs.http_client import get_http_client
from models import SceneAnalysis

router: APIRouter = APIRouter(prefix="/scenes", tags=["scenes"])

PUBLICATION_LATENCY_DAYS: int = 2
"""Sentinel-2 tiles can take up to ~39 h to be published, so renders of more recent days may still be incomplete."""
SETTLED_CACHE_CONTROL: str = "public, max-age=31536000, immutable"
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


def is_settled(day: date) -> bool:
    return day <= datetime.now(timezone.utc).date() - timedelta(days=PUBLICATION_LATENCY_DAYS)


async def cached_render(client: httpx.Client, bbox: tuple[float, float, float, float], day: date, composite: Composite) -> bytes:
    """Render of a settled day, made once and then read from `data/cache/renders/`."""
    return await cache.cached_bytes(
        cache.CACHE_DIR / "renders",
        cache.cache_key(str(bbox), day.isoformat(), composite, "webp"),
        lambda: run_in_threadpool(_render, client, bbox, day, composite),
    )


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
    if not is_settled(day):
        webp = await run_in_threadpool(_render, client, bbox, day, composite)
        return Response(content=webp, media_type="image/webp", headers={"Cache-Control": RECENT_CACHE_CONTROL})
    webp = await cached_render(client, bbox, day, composite)
    return Response(content=webp, media_type="image/webp", headers={"Cache-Control": SETTLED_CACHE_CONTROL})
