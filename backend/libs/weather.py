"""Historical hourly weather from Open-Meteo, free for non-commercial use and without an API key."""

import math
from datetime import date, datetime, timezone

import httpx

from models import Weather, WeatherHour

ARCHIVE_URL: str = "https://archive-api.open-meteo.com/v1/archive"
HOURLY: tuple[str, ...] = (
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
)
TIMEOUT_S: int = 60


def fetch_weather(client: httpx.Client, lon: float, lat: float, start: date, end: date) -> Weather:
    response = client.get(
        ARCHIVE_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "hourly": ",".join(HOURLY),
            "timezone": "UTC",
        },
        timeout=TIMEOUT_S,
    )
    response.raise_for_status()
    body = response.json()
    hourly = body["hourly"]
    hours = [
        WeatherHour(
            time=datetime.fromisoformat(time).replace(tzinfo=timezone.utc),
            temperature_c=hourly["temperature_2m"][i],
            relative_humidity_pct=hourly["relative_humidity_2m"][i],
            precipitation_mm=hourly["precipitation"][i],
            wind_speed_kmh=hourly["wind_speed_10m"][i],
            wind_direction_deg=hourly["wind_direction_10m"][i],
            wind_gusts_kmh=hourly["wind_gusts_10m"][i],
        )
        for i, time in enumerate(hourly["time"])
    ]
    # Meteorological directions are where the wind comes from, so the blowing vector points the opposite way.
    east = sum(-h.wind_speed_kmh * math.sin(math.radians(h.wind_direction_deg)) for h in hours)
    north = sum(-h.wind_speed_kmh * math.cos(math.radians(h.wind_direction_deg)) for h in hours)
    towards = math.degrees(math.atan2(east, north)) % 360
    return Weather(
        latitude=body["latitude"],
        longitude=body["longitude"],
        hours=hours,
        wind_from_deg=round((towards + 180) % 360, 1),
        wind_towards_deg=round(towards, 1),
        mean_wind_kmh=round(sum(h.wind_speed_kmh for h in hours) / len(hours), 1),
        max_gust_kmh=max(h.wind_gusts_kmh for h in hours),
        max_temperature_c=max(h.temperature_c for h in hours),
        min_relative_humidity_pct=min(h.relative_humidity_pct for h in hours),
        total_precipitation_mm=round(sum(h.precipitation_mm for h in hours), 1),
    )
