from datetime import date
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image

from libs.copernicus.auth import copernicus_token
from libs.copernicus.catalog import Acquisition, search_acquisitions
from libs.copernicus.render import Composite, render_composite
from libs.detection import analyze_swir
from libs.http_client import get_http_client
from models import SceneAnalysis

router: APIRouter = APIRouter(prefix="/scenes", tags=["scenes"])

IMAGE_CACHE_CONTROL: str = "public, max-age=86400, immutable"


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
    token = await run_in_threadpool(copernicus_token, client)
    png = await run_in_threadpool(render_composite, client, token, (west, south, east, north), day, composite)
    return Response(content=png, media_type="image/png", headers={"Cache-Control": IMAGE_CACHE_CONTROL})
