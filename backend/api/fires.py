from datetime import date, timedelta

from fastapi import APIRouter

from libs import effis, firms, sentinel
from models import BurntArea, BurntAreaDetail, Hotspot, SatelliteScene

router: APIRouter = APIRouter(prefix="/fires", tags=["fires"])


@router.get("")
async def list_fires(year: int, country: str = "ES", limit: int = 20) -> list[BurntArea]:
    return await effis.list_burnt_areas(country, year, limit)


@router.get("/{fire_id}")
async def get_fire(fire_id: int) -> BurntAreaDetail:
    return await effis.get_burnt_area(fire_id)


@router.get("/{fire_id}/scenes")
async def list_fire_scenes(
    fire_id: int, days_before: int = 15, days_after: int = 45, max_cloud_cover: float = 30
) -> list[SatelliteScene]:
    fire = await effis.get_burnt_area(fire_id)
    fire_day = fire.fire_date.date()
    return await sentinel.search_scenes(
        fire.bbox, fire_day - timedelta(days=days_before), fire_day + timedelta(days=days_after), max_cloud_cover
    )


@router.get("/{fire_id}/hotspots")
async def list_fire_hotspots(fire_id: int, start: date, days: int = 5) -> list[Hotspot]:
    fire = await effis.get_burnt_area(fire_id)
    return await firms.get_hotspots(fire.bbox, start, days)
