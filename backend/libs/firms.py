import csv
import io
import os
from datetime import date, datetime

import httpx

from models import Hotspot

FIRMS_AREA_URL: str = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
FIRMS_MAP_KEY: str = os.environ["FIRMS_MAP_KEY"]
FIRMS_SOURCES: tuple[str, ...] = (
    "VIIRS_SNPP_NRT",
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
    "VIIRS_SNPP_SP",
    "VIIRS_NOAA20_SP",
)


async def get_hotspots(bbox: tuple[float, float, float, float], start: date, days: int) -> list[Hotspot]:
    area = ",".join(str(coord) for coord in bbox)
    hotspots: list[Hotspot] = []
    async with httpx.AsyncClient(timeout=60) as client:
        for source in FIRMS_SOURCES:
            response = await client.get(f"{FIRMS_AREA_URL}/{FIRMS_MAP_KEY}/{source}/{area}/{days}/{start.isoformat()}")
            response.raise_for_status()
            for row in csv.DictReader(io.StringIO(response.text)):
                hotspots.append(
                    Hotspot(
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"]),
                        acquired_at=datetime.strptime(f"{row['acq_date']} {row['acq_time']}", "%Y-%m-%d %H%M"),
                        satellite=row["satellite"],
                        confidence=row["confidence"],
                        frp_mw=float(row["frp"]),
                        daynight=row["daynight"],
                    )
                )
    return hotspots
