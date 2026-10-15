import math
from datetime import date, datetime, timedelta

import httpx

from libs.copernicus.catalog import search_acquisitions
from libs.copernicus.process import fetch_bands
from libs.fire.onset import Observation, Onset, estimate_onset

LOOKBACK_DAYS = 30
TARGET_WIDTH_PX = 1000
MIN_RESOLUTION_M = 60
METRES_PER_DEGREE = 111_320


def find_onset(client: httpx.Client, token: str, bbox: tuple[float, float, float, float], fire_day: date) -> Onset:
    """Estimates when the fire seen on `fire_day` started, from the Sentinel-2 passes of the previous weeks."""
    acquisitions = search_acquisitions(client, token, bbox, fire_day - timedelta(days=LOOKBACK_DAYS), fire_day)
    # Daily mosaics keep the most recent pass of each day, so that pass's time stamps the day.
    last_pass: dict[date, datetime] = {a.acquired_at.date(): a.acquired_at for a in acquisitions}

    west, south, east, north = bbox
    width_m = (east - west) * METRES_PER_DEGREE * math.cos(math.radians((south + north) / 2))
    resolution_m = max(MIN_RESOLUTION_M, width_m / TARGET_WIDTH_PX)
    observations = [
        Observation(acquired_at, fetch_bands(client, token, bbox, day, resolution_m))
        for day, acquired_at in last_pass.items()
    ]
    return estimate_onset(observations[:-1], observations[-1])
