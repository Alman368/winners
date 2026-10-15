import asyncio
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from models import BurntArea, BurntAreaDetail, LandCoverShares

EFFIS_BURNT_AREAS_URL: str = "https://api.effis.emergency.copernicus.eu/rest/2/burntareas/current/"
MAX_BURNT_AREAS: int = 1000
FIRE_START_ATTEMPTS: int = 3


class FireStartNotFoundError(Exception):
    pass


def _to_burnt_area(raw: dict[str, Any]) -> BurntArea:
    return BurntArea(
        id=raw["id"],
        province=raw["province"],
        commune=raw["commune"],
        fire_date=raw["firedate"],
        area_ha=raw["area_ha"],
        natura2000_pct=raw["percna2k"],
        land_cover_pct=LandCoverShares(
            broadleaf=raw["broadlea"],
            conifer=raw["conifer"],
            mixed=raw["mixed"],
            sclerophyllous=raw["scleroph"],
            transitional=raw["transit"],
            other_natural=raw["othernatlc"],
            agriculture=raw["agriareas"],
            artificial=raw["artifsurf"],
            other=raw["otherlc"],
        ),
        centroid=raw["centroid"]["coordinates"],
        bbox=raw["bbox"],
    )


async def list_burnt_areas(country: str, year: int, limit: int) -> list[BurntArea]:
    params: dict[str, str | int] = {
        "country": country,
        "firedate__gte": f"{year}-01-01T00:00:00",
        "firedate__lt": f"{year + 1}-01-01T00:00:00",
        "ordering": "-area_ha",
        "limit": limit,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(EFFIS_BURNT_AREAS_URL, params=params)
    response.raise_for_status()
    return [_to_burnt_area(raw) for raw in response.json()["results"]]


async def get_burnt_area(burnt_area_id: int) -> BurntAreaDetail:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(f"{EFFIS_BURNT_AREAS_URL}{burnt_area_id}/")
    response.raise_for_status()
    raw = response.json()
    return BurntAreaDetail(**_to_burnt_area(raw).model_dump(), perimeter=raw["shape"])


async def find_fire_start(
    client: httpx.AsyncClient,
    country_code: str,
    bbox: tuple[float, float, float, float],
    acquisition: date,
    lookback_days: int,
) -> datetime:
    """Earliest start (UTC) of the EFFIS burnt areas touching `bbox` that started in the `lookback_days` up to `acquisition`.

    EFFIS cannot filter by area, so the country's fires of the window are listed and intersected here.
    """
    params: dict[str, str | int] = {
        "country": country_code.upper(),
        "firedate__gte": f"{(acquisition - timedelta(days=lookback_days)).isoformat()}T00:00:00",
        "firedate__lte": f"{acquisition.isoformat()}T23:59:59",
        "limit": MAX_BURNT_AREAS,
    }
    for attempt in range(FIRE_START_ATTEMPTS):
        response = await client.get(EFFIS_BURNT_AREAS_URL, params=params)
        if response.status_code not in (502, 503, 504) or attempt == FIRE_START_ATTEMPTS - 1:
            break
        await asyncio.sleep(attempt + 1)
    response.raise_for_status()
    west, south, east, north = bbox
    starts = [
        datetime.fromisoformat(raw["firedate"]).astimezone(timezone.utc)
        for raw in response.json()["results"]
        if raw["bbox"][0] < east and raw["bbox"][2] > west and raw["bbox"][1] < north and raw["bbox"][3] > south
    ]
    if not starts:
        raise FireStartNotFoundError(bbox)
    return min(starts)
