from datetime import date
from typing import Any

from pydantic import BaseModel


class SceneInput(BaseModel):
    bbox: tuple[float, float, float, float]
    """(min_lon, min_lat, max_lon, max_lat) in EPSG:4326, covering exactly the input image."""
    acquisition_date: date
    fire_start: date
    image_size: tuple[int, int]
    """(width, height) in pixels of the input image."""


class Ring(BaseModel):
    lonlat: list[tuple[float, float]]
    pixel: list[tuple[float, float]]
    """Coordinates in pixels of the input image."""


class BurnedPolygon(BaseModel):
    exterior: Ring
    holes: list[Ring]


class SceneInfo(BaseModel):
    acquisition_date: date
    pre_fire_window: tuple[date, date]
    pre_fire_coverage: float
    pre_fire_median_age_days: float
    bbox: tuple[float, float, float, float]
    image_size: tuple[int, int]


class BurnedArea(BaseModel):
    polygons: list[BurnedPolygon]
    area_ha: float
    perimeter_km: float
    severity_ha: dict[str, float]


class Point(BaseModel):
    lonlat: tuple[float, float]
    pixel: tuple[float, float]


class ActiveFire(BaseModel):
    id: int
    centroid: Point
    bbox_pixel: tuple[float, float, float, float]
    pixels: int
    area_ha: float
    front_length_km: float


class FireAnalysis(BaseModel):
    scene: SceneInfo
    burned_area: BurnedArea
    not_assessable_ha: float
    active_fires: list[ActiveFire]
    active_front_km: float
    geojson: dict[str, Any]
