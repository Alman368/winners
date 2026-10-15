"""On-disk cache for slow or quota-consuming results.

Everything lives under `CACHE_DIR` (`backend/data/cache/`, ignored by git, a Docker volume in production):

- `georeference/`: location of each uploaded image, keyed by image bytes and place name.
- `copernicus/`: Sentinel-2 rasters downloaded by the pipeline.
- `analysis/`: fire analysis of each scene, keyed by its `SceneInput`.

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


async def cached[M: BaseModel](directory: Path, key: str, model: type[M], compute: Callable[[], Awaitable[M]]) -> M:
    path = directory / f"{key}.json"
    if path.exists():
        return model.model_validate_json(path.read_text(encoding="utf-8"))
    result = await compute()
    directory.mkdir(parents=True, exist_ok=True)
    path.write_text(result.model_dump_json(), encoding="utf-8")
    return result
