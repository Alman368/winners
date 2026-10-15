import math
from pathlib import Path

import cv2
import httpx
import numpy as np
import pytest

from app.georeferencing.locate import locate
from tests.replay import ReplayTransport
from tests.scenes import SCENES_DIR



def load_gray(path: Path) -> np.ndarray:
    return cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_GRAYSCALE)


def distance_m(lon_a: float, lat_a: float, lon_b: float, lat_b: float) -> float:
    x = math.radians(lon_b - lon_a) * math.cos(math.radians((lat_a + lat_b) / 2))
    y = math.radians(lat_b - lat_a)
    return 6371000 * math.hypot(x, y)


@pytest.mark.scenes
@pytest.mark.parametrize(
    ("image", "place", "centre_lon", "centre_lat", "metres_per_px"),
    [
        (
            "Niebla (Huelva)/2026-08-08-00_00_2026-08-08-23_59_Sentinel-2_L2A_True_color.jpg",
            "Niebla (Huelva)",
            -6.6601,
            37.4885,
            12.8,
        ),
        (
            "La Mierla (Guadalajara)/2026-07-21-00_00_2026-07-21-23_59_Sentinel-2_L2A_True_color.jpg",
            "La Mierla (Guadalajara)",
            -3.0582,
            41.0939,
            24.2,
        ),
        (
            "Madrid-Avila/2026-07-26-00_00_2026-07-26-23_59_Sentinel-2_L2A_True_color.jpg",
            "Madrid-Avila",
            -4.2124,
            40.4707,
            12.4,
        ),
    ],
)
def test_locates_challenge_scene_from_its_place_name(
    image: str, place: str, centre_lon: float, centre_lat: float, metres_per_px: float
) -> None:
    client = httpx.Client(transport=ReplayTransport())

    location = locate(client, load_gray(SCENES_DIR / image), place)

    assert distance_m(location.centre_lon, location.centre_lat, centre_lon, centre_lat) < 500
    assert location.metres_per_px == pytest.approx(metres_per_px, rel=0.03)
