from datetime import timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile

from api.georeferencing import georeference_image
from libs import cache
from libs.effis import FireStartNotFoundError, find_fire_start
from libs.http_client import get_http_client
from models import AnalysisResult
from pipeline.config import CONFIG
from pipeline.models import SceneInput
from pipeline.pipeline import analyze

router: APIRouter = APIRouter(prefix="/analysis", tags=["analysis"])

EFFIS_TIMEOUT_S: int = 180


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


@router.post("")
async def analyze_upload(
    image: UploadFile,
    place: Annotated[str, Form()],
    client: Annotated[httpx.Client, Depends(get_http_client)],
) -> AnalysisResult:
    """Locates a Copernicus Browser export, finds its fire start in EFFIS and runs the fire detection pipeline.

    The whole result is cached per image and place: an image analysed before is answered from `data/cache/analysis/`.
    """
    content = await image.read()
    return await cache.cached(
        cache.CACHE_DIR / "analysis",
        cache.cache_key(content, image.filename, place),
        AnalysisResult,
        lambda: _analyze_image(client, content, image.filename, place),
    )
