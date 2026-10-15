import math
from dataclasses import dataclass

import httpx
import numpy as np

from libs.georeferencing.geocoding import geocode
from libs.georeferencing.matching import match
from libs.georeferencing.mercator import MercatorBox, from_mercator, to_mercator
from libs.georeferencing.reference import fetch_reference

SEARCH_RADIUS_M = 120_000
REFERENCE_WIDTH_PX = 4000
REFINE_MARGIN = 0.1


@dataclass(frozen=True)
class Location:
    bbox: tuple[float, float, float, float]
    image_size: tuple[int, int]
    centre_lon: float
    centre_lat: float
    metres_per_px: float
    inliers: int


def locate(client: httpx.Client, image: np.ndarray, place: str) -> Location:
    """Finds where a grayscale Sentinel-2 export lies, searching around a named place."""
    lon, lat = geocode(client, place)
    x, y = to_mercator(lon, lat)
    # Mercator stretches distances by 1/cos(lat), so the radius is scaled to stay in ground metres.
    radius = SEARCH_RADIUS_M / math.cos(math.radians(lat))
    search_box = MercatorBox(west=x - radius, south=y - radius, east=x + radius, north=y + radius)
    coarse = match(image, fetch_reference(client, search_box, REFERENCE_WIDTH_PX)).box

    margin_x = (coarse.east - coarse.west) * REFINE_MARGIN
    margin_y = (coarse.north - coarse.south) * REFINE_MARGIN
    refine_box = MercatorBox(
        west=coarse.west - margin_x,
        south=coarse.south - margin_y,
        east=coarse.east + margin_x,
        north=coarse.north + margin_y,
    )
    fine = match(image, fetch_reference(client, refine_box, REFERENCE_WIDTH_PX))

    west, south = from_mercator(fine.box.west, fine.box.south)
    east, north = from_mercator(fine.box.east, fine.box.north)
    centre_lon, centre_lat = from_mercator(
        (fine.box.west + fine.box.east) / 2, (fine.box.south + fine.box.north) / 2
    )
    metres_per_px = (fine.box.east - fine.box.west) / image.shape[1] * math.cos(math.radians(centre_lat))
    return Location(
        bbox=(west, south, east, north),
        image_size=(image.shape[1], image.shape[0]),
        centre_lon=centre_lon,
        centre_lat=centre_lat,
        metres_per_px=metres_per_px,
        inliers=fine.inliers,
    )
