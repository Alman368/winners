import asyncio
import json
from datetime import date, datetime, timezone
from pathlib import Path

import httpx
import pytest

from libs.effis import EFFIS_BURNT_AREAS_URL, FireStartNotFoundError, find_fire_start

RECORDED = json.loads((Path(__file__).parent / "fixtures" / "effis_burnt_areas_es_2026.json").read_text(encoding="utf-8"))
NIEBLA_BBOX = (-6.84116, 37.39951, -6.47896, 37.57728)
MADRID_AVILA_BBOX = (-4.93704, 40.12956, -3.48751, 40.81228)
ATLANTIC_BBOX = (-12.0, 43.0, -11.0, 44.0)


def effis_server(expected_from: str, expected_to: str):
    def handle(request: httpx.Request) -> httpx.Response:
        params = request.url.params
        if (
            str(request.url.copy_with(query=None)) != EFFIS_BURNT_AREAS_URL
            or params["country"] != "ES"
            or params["firedate__gte"] != expected_from
            or params["firedate__lte"] != expected_to
        ):
            return httpx.Response(400)
        return httpx.Response(200, json=RECORDED)

    return handle


def find(bbox: tuple[float, float, float, float], acquisition: date, expected_from: str, expected_to: str) -> datetime:
    client = httpx.AsyncClient(transport=httpx.MockTransport(effis_server(expected_from, expected_to)))
    return asyncio.run(find_fire_start(client, "es", bbox, acquisition, lookback_days=30))


def test_returns_the_start_of_the_effis_fire_inside_the_scene_in_utc() -> None:
    start = find(NIEBLA_BBOX, date(2026, 8, 8), "2026-07-09T00:00:00", "2026-08-08T23:59:59")

    assert start == datetime(2026, 8, 6, 23, 28, tzinfo=timezone.utc)


def test_picks_the_earliest_of_several_fires_inside_the_scene() -> None:
    start = find(MADRID_AVILA_BBOX, date(2026, 7, 26), "2026-06-26T00:00:00", "2026-07-26T23:59:59")

    assert start == datetime(2026, 7, 22, 11, 36, tzinfo=timezone.utc)


def test_fails_when_no_effis_fire_touches_the_scene() -> None:
    with pytest.raises(FireStartNotFoundError):
        find(ATLANTIC_BBOX, date(2026, 8, 8), "2026-07-09T00:00:00", "2026-08-08T23:59:59")
