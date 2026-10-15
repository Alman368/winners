"""Roads that cross a burned area, from OpenStreetMap through the Overpass API."""

import time
from collections import defaultdict
from dataclasses import dataclass

import httpx
from pyproj import Geod
from shapely.geometry import LineString, MultiLineString, MultiPolygon, mapping

from models import AffectedRoad

OVERPASS_URL: str = "https://z.overpass-api.de/api/interpreter"
"""The main overpass-api.de balancer returned 502 while its `z` instance answered; queries take ~40 s."""
USER_AGENT: str = "malackathon-wildfire/0.1"
ROAD_TYPES: str = "motorway|trunk|primary|secondary|tertiary|unclassified"
"""Roads between towns, with their `_link` ramps. Streets and forest tracks are left out."""
OVERPASS_RETRIES: int = 3
RETRY_STATUSES: tuple[int, ...] = (429, 500, 502, 503, 504)
"""Overload answers of the public Overpass servers; any other error fails at once."""
RETRY_WAIT_S: float = 10.0
TIMEOUT_S: int = 180
GEOD: Geod = Geod(ellps="WGS84")


@dataclass(frozen=True)
class RoadWay:
    osm_id: int
    ref: str | None
    name: str | None
    road_type: str
    line: LineString
    """lon/lat"""


def fetch_roads(client: httpx.Client, bbox: tuple[float, float, float, float]) -> list[RoadWay]:
    west, south, east, north = bbox
    query = (
        f'[out:json][timeout:{TIMEOUT_S}];'
        f'way["highway"~"^({ROAD_TYPES})(_link)?$"]({south},{west},{north},{east});'
        "out tags geom;"
    )
    for attempt in range(OVERPASS_RETRIES):
        response = client.post(OVERPASS_URL, data={"data": query}, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_S)
        if response.status_code not in RETRY_STATUSES:
            break
        time.sleep(RETRY_WAIT_S * (attempt + 1))
    response.raise_for_status()
    return [
        RoadWay(
            osm_id=element["id"],
            ref=element["tags"].get("ref"),
            name=element["tags"].get("name"),
            road_type=element["tags"]["highway"],
            line=LineString([(point["lon"], point["lat"]) for point in element["geometry"]]),
        )
        for element in response.json()["elements"]
    ]


def affected_roads(ways: list[RoadWay], burned: MultiPolygon) -> list[AffectedRoad]:
    """Stretches of each road inside the burned area, longest first.

    Ways sharing a `ref` (or a `name` when they have no ref) are one road; unnamed ways are grouped by type.
    """
    stretches: dict[tuple[str | None, str | None, str | None], list[tuple[RoadWay, LineString]]] = defaultdict(list)
    for way in ways:
        inside = way.line.intersection(burned)
        if inside.is_empty:
            continue
        key = (way.ref, None, None) if way.ref else (None, way.name, None) if way.name else (None, None, way.road_type)
        stretches[key].extend((way, line) for line in getattr(inside, "geoms", [inside]) if isinstance(line, LineString))

    result = []
    for group in stretches.values():
        km_by_way = [(way, GEOD.geometry_length(line) / 1000) for way, line in group]
        main_way = max(km_by_way, key=lambda item: item[1])[0]
        result.append(
            AffectedRoad(
                ref=main_way.ref,
                name=next((way.name for way, _ in group if way.name), None),
                road_type=main_way.road_type,
                km_inside=round(sum(km for _, km in km_by_way), 2),
                geometry=mapping(MultiLineString([line for _, line in group])),
            )
        )
    return sorted(result, key=lambda road: road.km_inside, reverse=True)
