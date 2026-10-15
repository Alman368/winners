from datetime import date

import httpx

from models import SatelliteScene

STAC_SEARCH_URL: str = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
COLLECTION: str = "sentinel-2-l2a"


async def search_scenes(
    bbox: tuple[float, float, float, float], start: date, end: date, max_cloud_cover: float
) -> list[SatelliteScene]:
    body = {
        "collections": [COLLECTION],
        "bbox": bbox,
        "datetime": f"{start.isoformat()}T00:00:00Z/{end.isoformat()}T23:59:59Z",
        "query": {"eo:cloud_cover": {"lte": max_cloud_cover}},
        "sortby": [{"field": "datetime", "direction": "asc"}],
        "limit": 100,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(STAC_SEARCH_URL, json=body)
    response.raise_for_status()
    return [
        SatelliteScene(
            id=feature["id"],
            platform=feature["properties"]["platform"],
            acquired_at=feature["properties"]["datetime"],
            cloud_cover=feature["properties"]["eo:cloud_cover"],
            tile=feature["properties"]["s2:mgrs_tile"],
        )
        for feature in response.json()["features"]
    ]

