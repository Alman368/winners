"""On-disk cache for slow or quota-consuming results.

Everything lives under `CACHE_DIR` (`backend/data/cache/`, ignored by git, a Docker volume in production):

- `georeference/`: location of each uploaded image, keyed by image bytes and place name.
- `copernicus/`: Sentinel-2 rasters downloaded by the pipeline.
- `analysis/`: fire analysis of each uploaded image, keyed by the image, its place name and the pipeline code.
- `analysis-scenes/`: fire analysis of the example scenes in `pipeline/scenes/` on other days than their challenge image,
  keyed by the scene, its day and the pipeline code.
- `fire-days/`: first and last Sentinel-2 days of each example scene's fire, keyed by the scene and the pipeline code.
- `context/`: roads cut by each burned area and the weather of the fire, keyed by the analysis and fire start.
- `context-scenes/`: the same for the example scenes, keyed by the scene and its precomputed analysis.

Deleting the folder (or one namespace) forces everything to be computed again from scratch.
"""

import hashlib
from collections.abc import Awaitable, Callable
from pathlib import Path

from pydantic import BaseModel

CACHE_DIR: Path = Path(__file__).resolve().parents[1] / "data" / "cache"


def cache_key(*parts: bytes | str) -> str:
    digest = hashlib.sha256()
    for part in parts:
        digest.update(part if isinstance(part, bytes) else part.encode())
        digest.update(b"\0")
    return digest.hexdigest()


def load[M: BaseModel](directory: Path, key: str, model: type[M]) -> M | None:
    path = directory / f"{key}.json"
    return model.model_validate_json(path.read_text(encoding="utf-8")) if path.exists() else None


async def cached[M: BaseModel](directory: Path, key: str, model: type[M], compute: Callable[[], Awaitable[M]]) -> M:
    stored = load(directory, key, model)
    if stored is not None:
        return stored
    result = await compute()
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f"{key}.json").write_text(result.model_dump_json(), encoding="utf-8")
    return result
