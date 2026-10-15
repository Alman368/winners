import json
from datetime import date

import httpx

from libs.copernicus.process import PROCESS_URL
from libs.copernicus.render import render_composite
from libs.georeferencing.mercator import to_mercator

NIEBLA_BBOX = (-6.8413, 37.3996, -6.4791, 37.5774)
PNG = b"\x89PNG\r\n\x1a\nimage"


def process_server(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    west, south = to_mercator(NIEBLA_BBOX[0], NIEBLA_BBOX[1])
    east, north = to_mercator(NIEBLA_BBOX[2], NIEBLA_BBOX[3])
    if (
        str(request.url) != PROCESS_URL
        or request.headers["Authorization"] != "Bearer eyJ.token"
        or body["input"]["bounds"]["properties"]["crs"] != "http://www.opengis.net/def/crs/EPSG/0/3857"
        or body["input"]["bounds"]["bbox"] != [west, south, east, north]
        or body["input"]["data"][0]["dataFilter"]["timeRange"]
        != {"from": "2026-08-05T00:00:00Z", "to": "2026-08-05T23:59:59Z"}
        or max(body["output"]["width"], body["output"]["height"]) != 2048
        or '"B12", "B8A", "B04"' not in body["evalscript"]
    ):
        return httpx.Response(400)
    return httpx.Response(200, content=PNG, headers={"Content-Type": "image/png"})


def test_renders_a_day_of_a_bbox_as_a_web_mercator_png() -> None:
    client = httpx.Client(transport=httpx.MockTransport(process_server))

    assert render_composite(client, "eyJ.token", NIEBLA_BBOX, date(2026, 8, 5), "swir") == PNG
