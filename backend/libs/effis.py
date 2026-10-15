from typing import Any

import httpx

from models import BurntArea, BurntAreaDetail, LandCoverShares

EFFIS_BURNT_AREAS_URL: str = "https://api.effis.emergency.copernicus.eu/rest/2/burntareas/current/"


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
