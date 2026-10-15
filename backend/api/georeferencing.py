from typing import Annotated

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile

from libs.copernicus.browser_export import MultiDayExportError, capture_date
from libs.georeferencing.geocoding import PlaceNotFoundError
from libs.georeferencing.locate import locate
from libs.georeferencing.matching import GeoreferenceError
from libs.http_client import get_http_client
from models import GeoreferencedImage

router: APIRouter = APIRouter(prefix="/georeference", tags=["georeference"])


@router.post("")
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
