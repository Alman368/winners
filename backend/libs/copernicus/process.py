import math
from dataclasses import dataclass
from datetime import date

import httpx
import numpy as np
from affine import Affine
from rasterio.io import MemoryFile
from rasterio.warp import transform_bounds

PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"
REFLECTANCE_BANDS = ("B02", "B03", "B04", "B08", "B8A", "B11", "B12")
REFLECTANCE_SCALE = 10000
EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "B08", "B8A", "B11", "B12", "SCL", "dataMask"],
    output: { bands: 9, sampleType: "UINT16" }
  };
}
function evaluatePixel(s) {
  return [s.B02, s.B03, s.B04, s.B08, s.B8A, s.B11, s.B12].map(v => v * 10000).concat([s.SCL, s.dataMask]);
}
"""


@dataclass(frozen=True)
class BandScene:
    """Sentinel-2 L2A bands of one day over a bbox, in a UTM grid."""

    reflectance: dict[str, np.ndarray]
    scl: np.ndarray
    data_mask: np.ndarray
    epsg: int
    transform: Affine
    metres_per_px: float
    geotiff: bytes


def utm_epsg(lon: float, lat: float) -> int:
    zone = math.floor((lon + 180) / 6) + 1
    return (32600 if lat >= 0 else 32700) + zone


def read_bands(geotiff: bytes) -> BandScene:
    with MemoryFile(geotiff) as memory, memory.open() as dataset:
        pixels = dataset.read()
        return BandScene(
            reflectance={
                name: pixels[i].astype(np.float32) / REFLECTANCE_SCALE for i, name in enumerate(REFLECTANCE_BANDS)
            },
            scl=pixels[7].astype(np.uint8),
            data_mask=pixels[8] == 1,
            epsg=dataset.crs.to_epsg(),
            transform=dataset.transform,
            metres_per_px=dataset.transform.a,
            geotiff=geotiff,
        )


def fetch_bands(
    client: httpx.Client,
    token: str,
    bbox: tuple[float, float, float, float],
    day: date,
    resolution_m: float,
) -> BandScene:
    """Requests the reflectance bands, scene classification and data mask of a lon/lat bbox on one day."""
    west, south, east, north = bbox
    epsg = utm_epsg((west + east) / 2, (south + north) / 2)
    response = client.post(
        PROCESS_URL,
        headers={"Authorization": f"Bearer {token}", "Accept": "image/tiff"},
        json={
            "input": {
                "bounds": {
                    "bbox": list(transform_bounds("EPSG:4326", f"EPSG:{epsg}", west, south, east, north)),
                    "properties": {"crs": f"http://www.opengis.net/def/crs/EPSG/0/{epsg}"},
                },
                "data": [
                    {
                        "type": "sentinel-2-l2a",
                        "dataFilter": {
                            "timeRange": {"from": f"{day.isoformat()}T00:00:00Z", "to": f"{day.isoformat()}T23:59:59Z"},
                            "mosaickingOrder": "mostRecent",
                        },
                    }
                ],
            },
            "output": {
                "resx": resolution_m,
                "resy": resolution_m,
                "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}],
            },
            "evalscript": EVALSCRIPT,
        },
    )
    response.raise_for_status()
    return read_bands(response.content)
