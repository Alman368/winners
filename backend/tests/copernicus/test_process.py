import json
from datetime import date

import httpx
import numpy as np
import pytest
from affine import Affine
from rasterio.io import MemoryFile

from libs.copernicus.process import PROCESS_URL, fetch_bands, utm_epsg

NIEBLA_BBOX = (-6.8413, 37.3996, -6.4791, 37.5774)


@pytest.mark.parametrize(
    ("lon", "lat", "epsg"),
    [(-6.66, 37.49, 32629), (-3.06, 41.09, 32630), (-4.21, 40.47, 32630), (2.17, 41.39, 32631)],
)
def test_picks_the_utm_zone_of_a_point(lon: float, lat: float, epsg: int) -> None:
    assert utm_epsg(lon, lat) == epsg


def sentinel_geotiff() -> bytes:
    bands = np.zeros((9, 3, 4), np.uint16)
    bands[2] = 1234
    bands[7] = 6
    bands[8] = 1
    bands[8, 0, 0] = 0
    with MemoryFile() as memory:
        with memory.open(
            driver="GTiff", width=4, height=3, count=9, dtype="uint16",
            crs="EPSG:32629", transform=Affine(20, 0, 690000, 0, -20, 4150000),
        ) as dataset:
            dataset.write(bands)
        return memory.read()


GEOTIFF = sentinel_geotiff()


def process_server(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    west, south, east, north = body["input"]["bounds"]["bbox"]
    if (
        str(request.url) != PROCESS_URL
        or request.headers["Authorization"] != "Bearer eyJ.token"
        or body["input"]["bounds"]["properties"]["crs"] != "http://www.opengis.net/def/crs/EPSG/0/32629"
        or not (680_000 < west < east < 730_000 and 4_130_000 < south < north < 4_170_000)
        or body["input"]["data"][0]["type"] != "sentinel-2-l2a"
        or body["input"]["data"][0]["dataFilter"]["timeRange"]
        != {"from": "2026-08-08T00:00:00Z", "to": "2026-08-08T23:59:59Z"}
        or (body["output"]["resx"], body["output"]["resy"]) != (20, 20)
    ):
        return httpx.Response(400)
    return httpx.Response(200, content=GEOTIFF, headers={"Content-Type": "image/tiff"})


def test_fetches_reflectance_scene_classes_and_georeferencing_for_a_day() -> None:
    client = httpx.Client(transport=httpx.MockTransport(process_server))

    scene = fetch_bands(client, "eyJ.token", NIEBLA_BBOX, date(2026, 8, 8), resolution_m=20)

    assert scene.epsg == 32629
    assert scene.metres_per_px == 20
    assert scene.transform.c == 690000 and scene.transform.f == 4150000
    assert scene.reflectance["B04"][1, 1] == pytest.approx(0.1234)
    assert scene.reflectance["B12"][1, 1] == 0
    assert scene.scl[1, 1] == 6
    assert scene.data_mask.tolist() == [[False, True, True, True], [True] * 4, [True] * 4]
    assert scene.geotiff == GEOTIFF
