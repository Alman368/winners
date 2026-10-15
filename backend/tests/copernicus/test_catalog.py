import json
from datetime import date, datetime, timezone
from pathlib import Path

import httpx

from libs.copernicus.catalog import CATALOG_URL, Acquisition, search_acquisitions

NIEBLA_BBOX = (-6.8413, 37.3996, -6.4791, 37.5774)
RECORDED_SEARCH = json.loads((Path(__file__).parent / "fixtures" / "catalog_niebla.json").read_text())


def catalog_server(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    if (
        str(request.url) != CATALOG_URL
        or request.headers["Authorization"] != "Bearer eyJ.token"
        or body["collections"] != ["sentinel-2-l2a"]
        or body["bbox"] != list(NIEBLA_BBOX)
        or body["datetime"] != "2026-07-25T00:00:00Z/2026-08-20T23:59:59Z"
    ):
        return httpx.Response(400)
    return httpx.Response(200, json=RECORDED_SEARCH)


def test_lists_acquisitions_over_a_bbox_in_chronological_order() -> None:
    client = httpx.Client(transport=httpx.MockTransport(catalog_server))

    acquisitions = search_acquisitions(client, "eyJ.token", NIEBLA_BBOX, date(2026, 7, 25), date(2026, 8, 20))

    assert len(acquisitions) == 16
    assert acquisitions[0] == Acquisition(
        acquired_at=datetime(2026, 7, 26, 11, 21, 13, 381000, tzinfo=timezone.utc),
        platform="sentinel-2a",
        tile="T29SQB",
        cloud_cover=0.0,
        epsg=32629,
    )
    assert acquisitions[-1].acquired_at == datetime(2026, 8, 18, 11, 20, 55, 392000, tzinfo=timezone.utc)
    assert [a.cloud_cover for a in acquisitions if a.acquired_at.date() == date(2026, 8, 3)] == [60.07, 11.37]


def paged_catalog_server(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content)
    start = body.get("next", 0)
    features = RECORDED_SEARCH["features"][start : start + 10]
    context = {"returned": len(features)} | ({"next": start + 10} if start + 10 < len(RECORDED_SEARCH["features"]) else {})
    return httpx.Response(200, json={"features": features, "context": context})


def test_follows_every_result_page() -> None:
    client = httpx.Client(transport=httpx.MockTransport(paged_catalog_server))

    acquisitions = search_acquisitions(client, "eyJ.token", NIEBLA_BBOX, date(2026, 7, 25), date(2026, 8, 20))

    assert len(acquisitions) == 16
    assert acquisitions == sorted(acquisitions, key=lambda a: a.acquired_at)
