from typing import Annotated

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from libs import cache
from libs.copernicus.browser_export import MultiDayExportError, capture_date
from libs.georeferencing.geocoding import PlaceNotFoundError
from libs.georeferencing.locate import locate
from libs.georeferencing.matching import GeoreferenceError
from libs.http_client import get_http_client
from models import GeoreferencedImage

router: APIRouter = APIRouter(prefix="/georeference", tags=["georeference"])


def _locate_image(client: httpx.Client, content: bytes, filename: str, place: str) -> GeoreferencedImage:
    pixels = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_GRAYSCALE)
    if pixels is None:
        raise HTTPException(status_code=422, detail="invalid_image")
    try:
        day = capture_date(filename)
        location = locate(client, pixels, place)
    except MultiDayExportError:
        raise HTTPException(status_code=422, detail="multi_day_export")
    except PlaceNotFoundError:
        raise HTTPException(status_code=422, detail="place_not_found")
    except GeoreferenceError:
        raise HTTPException(status_code=422, detail="georeference_failed")
    return GeoreferencedImage(
        date=day,
        bbox=location.bbox,
        image_size=location.image_size,
        country_code=location.country_code,
        centre_lon=location.centre_lon,
        centre_lat=location.centre_lat,
        metres_per_px=location.metres_per_px,
        inliers=location.inliers,
    )


async def georeference_image(client: httpx.Client, content: bytes, filename: str, place: str) -> GeoreferencedImage:
    """Locates an uploaded Copernicus Browser export; the same image and place are only located once."""
    return await cache.cached(
        cache.CACHE_DIR / "georeference",
        cache.cache_key(content, filename, place),
        GeoreferencedImage,
        lambda: run_in_threadpool(_locate_image, client, content, filename, place),
    )


@router.post("")
async def georeference(
    image: UploadFile,
    place: Annotated[str, Form()],
    client: Annotated[httpx.Client, Depends(get_http_client)],
) -> GeoreferencedImage:
    return await georeference_image(client, await image.read(), image.filename, place)
