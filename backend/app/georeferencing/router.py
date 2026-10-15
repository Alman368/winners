from dataclasses import dataclass
from datetime import date
from typing import Annotated

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile

from app.copernicus.browser_export import MultiDayExportError, capture_date
from app.georeferencing.geocoding import PlaceNotFoundError
from app.georeferencing.locate import locate
from app.georeferencing.matching import GeoreferenceError
from app.http_client import get_http_client

router = APIRouter()


@dataclass(frozen=True)
class GeoreferencedImage:
    date: date
    bbox: tuple[float, float, float, float]
    image_size: tuple[int, int]
    centre_lon: float
    centre_lat: float
    metres_per_px: float
    inliers: int


@router.post("/georeference")
def georeference(
    image: UploadFile,
    place: Annotated[str, Form()],
    client: Annotated[httpx.Client, Depends(get_http_client)],
) -> GeoreferencedImage:
    pixels = cv2.imdecode(np.frombuffer(image.file.read(), np.uint8), cv2.IMREAD_GRAYSCALE)
    if pixels is None:
        raise HTTPException(status_code=422, detail="invalid_image")
    try:
        day = capture_date(image.filename)
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
        centre_lon=location.centre_lon,
        centre_lat=location.centre_lat,
        metres_per_px=location.metres_per_px,
        inliers=location.inliers,
    )
