import time
from datetime import date
from io import BytesIO
from typing import Literal

import httpx
from PIL import Image

from libs.copernicus.process import PROCESS_URL
from libs.georeferencing.mercator import to_mercator

Composite = Literal["true_color", "swir"]

MAX_SIDE_PX: int = 2048
COMPOSITE_BANDS: dict[Composite, tuple[str, str, str]] = {
    "true_color": ("B04", "B03", "B02"),
    "swir": ("B12", "B8A", "B04"),
}
GAIN: float = 2.5
WEBP_QUALITY: int = 80
"""Lossy WebP keeps the no-data transparency and weighs ~0.5 MB against ~7.6 MB for the PNG the API returns."""
RATE_LIMIT_RETRIES: int = 6
RATE_LIMIT_WAIT_S: int = 10
"""The Process API answers 429 when the per-minute limit is hit; each retry waits this much longer than the last."""


def evalscript(composite: Composite) -> str:
    red, green, blue = COMPOSITE_BANDS[composite]
    return f"""//VERSION=3
function setup() {{
  return {{ input: ["{red}", "{green}", "{blue}", "dataMask"], output: {{ bands: 4 }} }};
}}
function evaluatePixel(s) {{
  return [{GAIN} * s.{red}, {GAIN} * s.{green}, {GAIN} * s.{blue}, s.dataMask];
}}
"""


def render_composite(
    client: httpx.Client,
    token: str,
    bbox: tuple[float, float, float, float],
    day: date,
    composite: Composite,
) -> bytes:
    """Renders one day of a lon/lat bbox as a WebP in Web Mercator, so it overlays the map without warping."""
    west, south, east, north = bbox
    min_x, min_y = to_mercator(west, south)
    max_x, max_y = to_mercator(east, north)
    scale = MAX_SIDE_PX / max(max_x - min_x, max_y - min_y)
    request: dict[str, object] = {
        "input": {
            "bounds": {
                "bbox": [min_x, min_y, max_x, max_y],
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/3857"},
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {"from": f"{day.isoformat()}T00:00:00Z", "to": f"{day.isoformat()}T23:59:59Z"},
                        "mosaickingOrder": "leastCC",
                    },
                }
            ],
        },
        "output": {
            "width": round((max_x - min_x) * scale),
            "height": round((max_y - min_y) * scale),
            "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
        },
        "evalscript": evalscript(composite),
    }
    for attempt in range(RATE_LIMIT_RETRIES):
        response = client.post(PROCESS_URL, headers={"Authorization": f"Bearer {token}", "Accept": "image/png"}, json=request)
        if response.status_code != 429:
            break
        time.sleep(RATE_LIMIT_WAIT_S * (attempt + 1))
    response.raise_for_status()
    webp = BytesIO()
    Image.open(BytesIO(response.content)).save(webp, "WEBP", quality=WEBP_QUALITY)
    return webp.getvalue()
