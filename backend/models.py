from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel

from pipeline.models import FireAnalysis


class ActiveFire(BaseModel):
    x: float
    y: float
    area_px: int


class SceneAnalysis(BaseModel):
    width: int
    height: int
    burned_fraction: float
    burned_perimeter: dict[str, Any]
    active_fires: list[ActiveFire]


class LandCoverShares(BaseModel):
    broadleaf: float
    conifer: float
    mixed: float
    sclerophyllous: float
    transitional: float
    other_natural: float
    agriculture: float
    artificial: float
    other: float


class BurntArea(BaseModel):
    id: int
    province: str
    commune: str
    fire_date: datetime
    area_ha: float
    natura2000_pct: float
    land_cover_pct: LandCoverShares
    centroid: tuple[float, float]
    bbox: tuple[float, float, float, float]


class BurntAreaDetail(BurntArea):
    perimeter: dict[str, Any]


class Hotspot(BaseModel):
    latitude: float
    longitude: float
    acquired_at: datetime
    satellite: str
    confidence: str
    frp_mw: float
    daynight: str


class GeoreferencedImage(BaseModel):
    date: date
    bbox: tuple[float, float, float, float]
    image_size: tuple[int, int]
    country_code: str
    centre_lon: float
    centre_lat: float
    metres_per_px: float
    inliers: int


class AnalysisResult(BaseModel):
    georeference: GeoreferencedImage
    fire_start: datetime
    """Earliest EFFIS fire start (UTC) inside the scene."""
    analysis: FireAnalysis


class AffectedRoad(BaseModel):
    """A road crossing the burned area, so presumably cut during the fire (estimated, not an official closure)."""

    ref: str | None
    name: str | None
    road_type: str
    """OpenStreetMap `highway` class of the longest affected stretch (motorway, trunk, primary, ...)."""
    km_inside: float
    geometry: dict[str, Any]
    """GeoJSON MultiLineString (lon/lat) of the stretches inside the burned area."""


class WeatherHour(BaseModel):
    time: datetime
    temperature_c: float
    relative_humidity_pct: float
    precipitation_mm: float
    wind_speed_kmh: float
    wind_direction_deg: float
    """Direction the wind blows from, clockwise from north."""
    wind_gusts_kmh: float


class Weather(BaseModel):
    """Hourly weather at the scene centre between the fire start and the image, from Open-Meteo (ERA5 reanalysis)."""

    latitude: float
    longitude: float
    hours: list[WeatherHour]
    wind_from_deg: float
    """Vector mean of the hourly winds: where the wind mostly came from."""
    wind_towards_deg: float
    """Where that wind pushed the fire."""
    mean_wind_kmh: float
    max_gust_kmh: float
    max_temperature_c: float
    min_relative_humidity_pct: float
    total_precipitation_mm: float


class FireContext(BaseModel):
    roads: list[AffectedRoad]
    """Roads crossing the burned area, longest stretch first: estimated as cut during the fire."""
    weather: Weather


class AnalysisReport(AnalysisResult):
    context: FireContext


class AnalysisInProgress(BaseModel):
    status: Literal["processing"] = "processing"
