import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "malackathon-wildfire/0.1"


class PlaceNotFoundError(Exception):
    pass


def geocode(client: httpx.Client, place: str) -> tuple[float, float]:
    """Returns (lon, lat) of the best Nominatim match for a free-text place name."""
    response = client.get(
        NOMINATIM_URL,
        params={"q": place, "format": "jsonv2", "limit": 1},
        headers={"User-Agent": USER_AGENT},
    )
    response.raise_for_status()
    results = response.json()
    if not results:
        raise PlaceNotFoundError(place)
    return float(results[0]["lon"]), float(results[0]["lat"])
