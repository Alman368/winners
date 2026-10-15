import asyncio
from datetime import date, datetime, timedelta

import httpx

from libs.copernicus.auth import copernicus_token
from libs.copernicus.catalog import search_acquisitions
from libs.fire.onset import Observation, Onset, estimate_onset
from pipeline import copernicus
from pipeline.grid import Grid

LOOKBACK_DAYS = 30


def _last_pass_per_day(bbox: tuple[float, float, float, float], fire_day: date) -> dict[date, datetime]:
    with httpx.Client(timeout=60) as client:
        token = copernicus_token(client)
        acquisitions = search_acquisitions(client, token, bbox, fire_day - timedelta(days=LOOKBACK_DAYS), fire_day)
    # Daily mosaics keep the most recent pass of each day, so that pass's time stamps the day.
    return {a.acquired_at.date(): a.acquired_at for a in acquisitions}


async def find_onset(bbox: tuple[float, float, float, float], fire_day: date) -> Onset:
    """Estimates when the fire seen on `fire_day` started, from the Sentinel-2 passes of the previous weeks."""
    last_pass = await asyncio.to_thread(_last_pass_per_day, bbox, fire_day)
    grid = Grid.for_bbox(bbox)
    observations = [
        Observation(acquired_at, await copernicus.fetch_post_fire(grid, day)) for day, acquired_at in last_pass.items()
    ]
    return estimate_onset(observations[:-1], observations[-1], grid.pixel_area_ha)
