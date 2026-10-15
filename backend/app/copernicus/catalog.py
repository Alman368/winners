from dataclasses import dataclass
from datetime import date, datetime

import httpx

CATALOG_URL = "https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search"
COLLECTION = "sentinel-2-l2a"
MAX_RESULTS = 100


@dataclass(frozen=True)
class Acquisition:
    acquired_at: datetime
    platform: str
    tile: str
    cloud_cover: float
    epsg: int


def search_acquisitions(
    client: httpx.Client,
    token: str,
    bbox: tuple[float, float, float, float],
    start: date,
    end: date,
) -> list[Acquisition]:
    """Lists every Sentinel-2 L2A tile acquisition touching a lon/lat bbox, oldest first."""
    response = client.post(
        CATALOG_URL,
        headers={"Authorization": f"Bearer {token}"},
        json={
            "collections": [COLLECTION],
            "bbox": list(bbox),
            "datetime": f"{start.isoformat()}T00:00:00Z/{end.isoformat()}T23:59:59Z",
            "limit": MAX_RESULTS,
        },
    )
    response.raise_for_status()
    acquisitions = [
        Acquisition(
            acquired_at=datetime.fromisoformat(feature["properties"]["datetime"]),
            platform=feature["properties"]["platform"],
            tile=feature["id"].split("_")[5],
            cloud_cover=feature["properties"]["eo:cloud_cover"],
            epsg=feature["properties"]["proj:epsg"],
        )
        for feature in response.json()["features"]
    ]
    return sorted(acquisitions, key=lambda a: a.acquired_at)
