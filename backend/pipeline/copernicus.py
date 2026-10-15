import asyncio
import hashlib
from datetime import date, timedelta
from pathlib import Path

import httpx
import numpy as np
from numpy.typing import NDArray
from rasterio.io import MemoryFile

from libs import cache
from libs.copernicus.auth import fetch_token
from libs.copernicus.credentials import copernicus_credentials
from pipeline.bands import Bands, PreFireComposite
from pipeline.config import CONFIG
from pipeline.grid import Grid

PROCESS_URL: str = "https://sh.dataspace.copernicus.eu/api/v1/process"
CACHE_DIR: Path = cache.CACHE_DIR / "copernicus"

BANDS_EVALSCRIPT: str = """//VERSION=3
function setup() {
  return {input: [{bands: ["B04", "B08", "B8A", "B11", "B12", "SCL", "dataMask"]}], output: {bands: 7, sampleType: "UINT16"}};
}
function evaluatePixel(s) {
  return [s.B04 * 10000, s.B08 * 10000, s.B8A * 10000, s.B11 * 10000, s.B12 * 10000, s.SCL, s.dataMask];
}"""

PRE_FIRE_EVALSCRIPT: str = """//VERSION=3
function setup() {
  return {
    input: [{bands: ["B04", "B08", "B8A", "B11", "B12", "SCL", "dataMask"]}],
    output: {bands: 8, sampleType: "UINT16"},
    mosaicking: "ORBIT"
  };
}
function preProcessScenes(collections) {
  collections.scenes.orbits.sort((a, b) => new Date(b.dateFrom) - new Date(a.dateFrom));
  return collections;
}
const FIRE_START = new Date("%(fire_start)sT00:00:00Z").getTime();
const CLOUD_CLASSES = %(cloud_classes)s;
function evaluatePixel(samples, scenes) {
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.dataMask === 1 && CLOUD_CLASSES.indexOf(s.SCL) < 0) {
      const ageDays = Math.round((FIRE_START - new Date(scenes[i].date).getTime()) / 86400000);
      return [s.B04 * 10000, s.B08 * 10000, s.B8A * 10000, s.B11 * 10000, s.B12 * 10000, s.SCL, 1, ageDays];
    }
  }
  return [0, 0, 0, 0, 0, 0, 0, 0];
}"""


def _process_request(
    bbox: tuple[float, float, float, float], width: int, height: int, evalscript: str, start: date, end: date
) -> dict[str, object]:
    return {
        "input": {
            "bounds": {"bbox": bbox, "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}},
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {"timeRange": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"}},
                    "processing": {"upsampling": "NEAREST", "downsampling": "NEAREST"},
                }
            ],
        },
        "output": {"width": width, "height": height, "responses": [{"identifier": "default", "format": {"type": "image/tiff"}}]},
        "evalscript": evalscript,
    }


def _token() -> str:
    """Shared Copernicus token (`libs/copernicus/auth.py`), with the same credentials as the rest of the backend."""
    credentials = copernicus_credentials()
    with httpx.Client(timeout=60) as client:
        return fetch_token(client, credentials.client_id, credentials.client_secret)


async def _fetch_tile(client: httpx.AsyncClient, semaphore: asyncio.Semaphore, request: dict[str, object]) -> NDArray[np.uint16]:
    async with semaphore:
        for attempt in range(CONFIG.download_retries):
            try:
                token = await asyncio.to_thread(_token)
                response = await client.post(PROCESS_URL, json=request, headers={"Authorization": f"Bearer {token}"})
                if response.status_code == 200:
                    with MemoryFile(response.content) as file, file.open() as dataset:
                        return dataset.read()
            except httpx.TransportError:
                pass
            await asyncio.sleep(5 * (attempt + 1))
    raise RuntimeError(f"Copernicus Process API failed {CONFIG.download_retries} times for bbox {request['input']['bounds']['bbox']}")


async def _fetch_raster(grid: Grid, evalscript: str, start: date, end: date) -> NDArray[np.uint16]:
    """Downloads the grid in tiles of at most CONFIG.tile_size_px and caches the mosaic on disk."""
    key = hashlib.sha1(f"{grid}{evalscript}{start}{end}".encode()).hexdigest()
    cache_file = CACHE_DIR / f"{key}.npy"
    if cache_file.exists():
        return np.load(cache_file)

    xs = np.linspace(0, grid.width, -(-grid.width // CONFIG.tile_size_px) + 1).astype(int).tolist()
    ys = np.linspace(0, grid.height, -(-grid.height // CONFIG.tile_size_px) + 1).astype(int).tolist()
    windows = [(x0, y0, x1, y1) for x0, x1 in zip(xs, xs[1:]) for y0, y1 in zip(ys, ys[1:])]
    semaphore = asyncio.Semaphore(CONFIG.download_concurrency)
    async with httpx.AsyncClient(timeout=300) as client:
        tiles = await asyncio.gather(
            *(
                _fetch_tile(
                    client,
                    semaphore,
                    _process_request(grid.sub_bbox(x0, y0, x1, y1), x1 - x0, y1 - y0, evalscript, start, end),
                )
                for x0, y0, x1, y1 in windows
            )
        )

    raster = np.zeros((tiles[0].shape[0], grid.height, grid.width), np.uint16)
    for (x0, y0, x1, y1), tile in zip(windows, tiles):
        raster[:, y0:y1, x0:x1] = tile
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    np.save(cache_file, raster)
    return raster


async def fetch_post_fire(grid: Grid, acquisition: date) -> Bands:
    return Bands.from_raster(await _fetch_raster(grid, BANDS_EVALSCRIPT, acquisition, acquisition))


async def fetch_pre_fire(grid: Grid, fire_start: date) -> PreFireComposite:
    """Per pixel, the most recent cloud-free observation in the window before the fire start.

    The window ends the day before the fire, so the composite cannot contain the fire. Compositing per pixel
    handles scenes wider than one satellite pass and partial clouds.
    """
    evalscript = PRE_FIRE_EVALSCRIPT % {"fire_start": fire_start, "cloud_classes": list(CONFIG.cloud_scl_classes)}
    start = fire_start - timedelta(days=CONFIG.pre_fire_window_days)
    end = fire_start - timedelta(days=1)
    return PreFireComposite.from_raster(await _fetch_raster(grid, evalscript, start, end))
