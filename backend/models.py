from datetime import datetime
from typing import Any

from pydantic import BaseModel


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


class SatelliteScene(BaseModel):
    id: str
    platform: str
    acquired_at: datetime
    cloud_cover: float
    tile: str


class Hotspot(BaseModel):
    latitude: float
    longitude: float
    acquired_at: datetime
    satellite: str
    confidence: str
    frp_mw: float
    daynight: str
