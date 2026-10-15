import math
from dataclasses import dataclass

EARTH_RADIUS_M = 6378137.0


@dataclass(frozen=True)
class MercatorBox:
    """Axis-aligned box in EPSG:3857 metres."""

    west: float
    south: float
    east: float
    north: float


def to_mercator(lon: float, lat: float) -> tuple[float, float]:
    x = EARTH_RADIUS_M * math.radians(lon)
    y = EARTH_RADIUS_M * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return x, y


def from_mercator(x: float, y: float) -> tuple[float, float]:
    lon = math.degrees(x / EARTH_RADIUS_M)
    lat = math.degrees(2 * math.atan(math.exp(y / EARTH_RADIUS_M)) - math.pi / 2)
    return lon, lat
