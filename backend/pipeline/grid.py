from dataclasses import dataclass
from math import cos, radians

from affine import Affine

from libs.georeferencing.mercator import to_mercator
from pipeline.config import CONFIG

METERS_PER_DEGREE_LAT: float = 110_950.0
METERS_PER_DEGREE_LON_EQUATOR: float = 111_320.0


@dataclass(frozen=True)
class Grid:
    """Working grid: the scene bbox in EPSG:4326 sampled at about CONFIG.resolution_m per pixel.

    The input image covers the same bbox in Web Mercator; `lonlat_to_image_pixel` converts between both.
    """

    bbox: tuple[float, float, float, float]
    width: int
    height: int

    @classmethod
    def for_bbox(cls, bbox: tuple[float, float, float, float]) -> "Grid":
        min_lon, min_lat, max_lon, max_lat = bbox
        mid_lat = (min_lat + max_lat) / 2
        width_m = (max_lon - min_lon) * METERS_PER_DEGREE_LON_EQUATOR * cos(radians(mid_lat))
        height_m = (max_lat - min_lat) * METERS_PER_DEGREE_LAT
        return cls(bbox, round(width_m / CONFIG.resolution_m), round(height_m / CONFIG.resolution_m))

    @property
    def pixel_area_ha(self) -> float:
        return CONFIG.resolution_m**2 / 10_000

    @property
    def transform(self) -> Affine:
        min_lon, min_lat, max_lon, max_lat = self.bbox
        return Affine((max_lon - min_lon) / self.width, 0, min_lon, 0, -(max_lat - min_lat) / self.height, max_lat)

    def pixel_to_lonlat(self, x: float, y: float) -> tuple[float, float]:
        return self.transform * (x, y)

    def sub_bbox(self, x0: int, y0: int, x1: int, y1: int) -> tuple[float, float, float, float]:
        west, north = self.pixel_to_lonlat(x0, y0)
        east, south = self.pixel_to_lonlat(x1, y1)
        return west, south, east, north


def lonlat_to_image_pixel(
    lon: float, lat: float, bbox: tuple[float, float, float, float], image_size: tuple[int, int]
) -> tuple[float, float]:
    """Copernicus Browser exports are Web Mercator: columns are linear in longitude, rows in Mercator y, not latitude."""
    min_lon, min_lat, max_lon, max_lat = bbox
    width, height = image_size
    west, south = to_mercator(min_lon, min_lat)
    east, north = to_mercator(max_lon, max_lat)
    x, y = to_mercator(lon, lat)
    return (x - west) / (east - west) * width, (north - y) / (north - south) * height
