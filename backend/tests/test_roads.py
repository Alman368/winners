import json
from pathlib import Path
from urllib.parse import parse_qs

import httpx
import pytest
from shapely.geometry import LineString, MultiPolygon, box

from libs import roads
from libs.roads import OVERPASS_URL, RoadWay, affected_roads, fetch_roads

RECORDED = json.loads((Path(__file__).parent / "fixtures" / "overpass_roads_niebla.json").read_text(encoding="utf-8"))
NIEBLA_BBOX = (-6.84116, 37.39951, -6.47896, 37.57728)
BURNED = MultiPolygon([box(-6.70, 37.45, -6.60, 37.55)])
KM_PER_0_1_DEG_LON_AT_37_5 = 8.84  # WGS84 parallel length at 37.5°N
KM_PER_0_02_DEG_LAT = 2.22


def way(osm_id: int, ref: str | None, name: str | None, road_type: str, *coords: tuple[float, float]) -> RoadWay:
    return RoadWay(osm_id=osm_id, ref=ref, name=name, road_type=road_type, line=LineString(coords))


def test_reads_the_roads_of_a_bbox_from_overpass() -> None:
    def overpass(request: httpx.Request) -> httpx.Response:
        query = parse_qs(request.content.decode())["data"][0]
        if str(request.url) != OVERPASS_URL or "37.39951,-6.84116,37.57728,-6.47896" not in query:
            return httpx.Response(400)
        return httpx.Response(200, json=RECORDED)

    ways = fetch_roads(httpx.Client(transport=httpx.MockTransport(overpass)), NIEBLA_BBOX)

    assert len(ways) == 326
    first = next(w for w in ways if w.osm_id == 22568747)
    assert (first.ref, first.name, first.road_type) == ("HU-3106", None, "tertiary")
    assert first.line.coords[0] == (-6.7019365, 37.5229495)


def test_retries_when_overpass_is_overloaded(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(roads.time, "sleep", lambda seconds: None)
    responses = iter([httpx.Response(504), httpx.Response(200, json=RECORDED)])

    ways = fetch_roads(httpx.Client(transport=httpx.MockTransport(lambda request: next(responses))), NIEBLA_BBOX)

    assert len(ways) == 326


def test_measures_the_kilometres_of_each_road_inside_the_burned_area() -> None:
    ways = [
        way(1, "A-1", "Autovía del Sur", "motorway", (-6.75, 37.50), (-6.55, 37.50)),
        way(2, "A-1", "Autovía del Sur", "motorway_link", (-6.65, 37.46), (-6.65, 37.48)),
        way(3, None, "Camino de la Sierra", "tertiary", (-6.62, 37.52), (-6.58, 37.52)),
        way(4, "N-9", None, "primary", (-6.80, 37.40), (-6.75, 37.40)),
    ]

    result = affected_roads(ways, BURNED)

    assert [(r.ref, r.name, r.road_type) for r in result] == [
        ("A-1", "Autovía del Sur", "motorway"),
        (None, "Camino de la Sierra", "tertiary"),
    ]
    assert result[0].km_inside == pytest.approx(KM_PER_0_1_DEG_LON_AT_37_5 + KM_PER_0_02_DEG_LAT, rel=0.01)
    assert result[1].km_inside == pytest.approx(KM_PER_0_1_DEG_LON_AT_37_5 / 5, rel=0.01)
    assert result[0].geometry["type"] == "MultiLineString"


def test_groups_unnamed_roads_by_type() -> None:
    ways = [
        way(10, None, None, "unclassified", (-6.69, 37.46), (-6.69, 37.48)),
        way(11, None, None, "unclassified", (-6.68, 37.46), (-6.68, 37.48)),
    ]

    [unnamed] = affected_roads(ways, BURNED)

    assert (unnamed.ref, unnamed.name, unnamed.road_type) == (None, None, "unclassified")
    assert unnamed.km_inside == pytest.approx(2 * KM_PER_0_02_DEG_LAT, rel=0.01)
