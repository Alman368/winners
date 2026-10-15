from datetime import date, timedelta
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from libs import effis, firms
from libs.copernicus.auth import fetch_token
from libs.copernicus.catalog import Acquisition, search_acquisitions
from libs.copernicus.credentials import copernicus_credentials
from libs.http_client import get_http_client
from models import BurntArea, BurntAreaDetail, Hotspot

router: APIRouter = APIRouter(prefix="/fires", tags=["fires"])


@router.get("")
async def list_fires(year: int, country: str = "ES", limit: int = 20) -> list[BurntArea]:
    return await effis.list_burnt_areas(country, year, limit)


@router.get("/{fire_id}")
async def get_fire(fire_id: int) -> BurntAreaDetail:
    return await effis.get_burnt_area(fire_id)


@router.get("/{fire_id}/scenes")
async def list_fire_scenes(
    fire_id: int,
    client: Annotated[httpx.Client, Depends(get_http_client)],
    days_before: int = 15,
    days_after: int = 45,
    max_cloud_cover: float = 30,
) -> list[Acquisition]:
    fire = await effis.get_burnt_area(fire_id)
    fire_day = fire.fire_date.date()
    credentials = copernicus_credentials()
    token = await run_in_threadpool(fetch_token, client, credentials.client_id, credentials.client_secret)
    acquisitions = await run_in_threadpool(
        search_acquisitions,
        client,
        token,
        fire.bbox,
        fire_day - timedelta(days=days_before),
        fire_day + timedelta(days=days_after),
    )
    return [acquisition for acquisition in acquisitions if acquisition.cloud_cover <= max_cloud_cover]


@router.get("/{fire_id}/hotspots")
async def list_fire_hotspots(fire_id: int, start: date, days: int = 5) -> list[Hotspot]:
    fire = await effis.get_burnt_area(fire_id)
    return await firms.get_hotspots(fire.bbox, start, days)
