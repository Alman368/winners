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


class AnalysisInProgress(BaseModel):
    status: Literal["processing"] = "processing"
