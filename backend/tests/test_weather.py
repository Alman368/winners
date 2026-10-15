from datetime import date, datetime, timezone

import httpx
import pytest

from libs.weather import ARCHIVE_URL, fetch_weather


def open_meteo(request: httpx.Request) -> httpx.Response:
    params = request.url.params
    if (
        str(request.url.copy_with(query=None)) != ARCHIVE_URL
        or (params["latitude"], params["longitude"]) != ("37.4885", "-6.6601")
        or (params["start_date"], params["end_date"]) != ("2026-08-06", "2026-08-08")
        or params["timezone"] != "UTC"
    ):
        return httpx.Response(400)
    return httpx.Response(
        200,
        json={
            "latitude": 37.50439,
            "longitude": -6.7110596,
            "generationtime_ms": 1.2,
            "utc_offset_seconds": 0,
            "timezone": "UTC",
            "timezone_abbreviation": "GMT",
            "elevation": 202.0,
            "hourly_units": {
                "time": "iso8601",
                "temperature_2m": "°C",
                "relative_humidity_2m": "%",
                "precipitation": "mm",
                "wind_speed_10m": "km/h",
                "wind_direction_10m": "°",
                "wind_gusts_10m": "km/h",
            },
            "hourly": {
                "time": ["2026-08-06T12:00", "2026-08-06T13:00", "2026-08-06T14:00", "2026-08-06T15:00"],
                "temperature_2m": [34.0, 37.5, 38.2, 36.0],
                "relative_humidity_2m": [20, 15, 12, 18],
                "precipitation": [0.0, 0.0, 0.4, 0.1],
                "wind_speed_10m": [10.0, 20.0, 20.0, 10.0],
                "wind_direction_10m": [270, 290, 270, 290],
                "wind_gusts_10m": [25.0, 41.0, 38.0, 22.0],
            },
        },
    )


def test_summarises_the_hourly_weather_during_the_fire() -> None:
    client = httpx.Client(transport=httpx.MockTransport(open_meteo))

    weather = fetch_weather(client, -6.6601, 37.4885, date(2026, 8, 6), date(2026, 8, 8))

    assert len(weather.hours) == 4
    assert weather.hours[1].time == datetime(2026, 8, 6, 13, tzinfo=timezone.utc)
    assert weather.hours[1].wind_gusts_kmh == 41.0
    assert weather.wind_from_deg == pytest.approx(280, abs=0.5)
    assert weather.wind_towards_deg == pytest.approx(100, abs=0.5)
    assert weather.mean_wind_kmh == pytest.approx(15.0)
    assert weather.max_gust_kmh == 41.0
    assert weather.max_temperature_c == 38.2
    assert weather.min_relative_humidity_pct == 12
    assert weather.total_precipitation_mm == pytest.approx(0.5)


def test_wind_direction_is_a_vector_mean_across_north() -> None:
    def northerly(request: httpx.Request) -> httpx.Response:
        response = open_meteo(request)
        body = response.json()
        body["hourly"]["wind_direction_10m"] = [350, 10, 350, 10]
        body["hourly"]["wind_speed_10m"] = [10.0, 10.0, 10.0, 10.0]
        return httpx.Response(200, json=body)

    weather = fetch_weather(httpx.Client(transport=httpx.MockTransport(northerly)), -6.6601, 37.4885, date(2026, 8, 6), date(2026, 8, 8))

    assert min(weather.wind_from_deg, 360 - weather.wind_from_deg) == pytest.approx(0, abs=0.5)
