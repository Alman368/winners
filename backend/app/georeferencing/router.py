from typing import Annotated

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile

from app.georeferencing.geocoding import PlaceNotFoundError
from app.georeferencing.locate import Location, locate
from app.georeferencing.matching import GeoreferenceError
from app.http_client import get_http_client

router = APIRouter()


@router.post("/georeference")
def georeference(
    image: UploadFile,
    place: Annotated[str, Form()],
    client: Annotated[httpx.Client, Depends(get_http_client)],
) -> Location:
    pixels = cv2.imdecode(np.frombuffer(image.file.read(), np.uint8), cv2.IMREAD_GRAYSCALE)
    if pixels is None:
        raise HTTPException(status_code=422, detail="invalid_image")
    try:
        return locate(client, pixels, place)
    except PlaceNotFoundError:
        raise HTTPException(status_code=422, detail="place_not_found")
    except GeoreferenceError:
        raise HTTPException(status_code=422, detail="georeference_failed")
