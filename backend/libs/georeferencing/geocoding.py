from dataclasses import dataclass

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "malackathon-wildfire/0.1"


class PlaceNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class Place:
    lon: float
    lat: float
    country_code: str
    """ISO 3166-1 alpha-2 in lowercase, as Nominatim returns it (e.g. "es")."""


def geocode(client: httpx.Client, place: str) -> Place:
    """Best Nominatim match for a free-text place name."""
    response = client.get(
        NOMINATIM_URL,
        params={"q": place, "format": "jsonv2", "limit": 1, "addressdetails": 1},
        headers={"User-Agent": USER_AGENT},
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        raise PlaceNotFoundError(place)
    best = results[0]
    return Place(lon=float(best["lon"]), lat=float(best["lat"]), country_code=best["address"]["country_code"])
