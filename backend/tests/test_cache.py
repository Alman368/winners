import asyncio
import shutil
from pathlib import Path

from pydantic import BaseModel

from libs.cache import cache_key, cached


class Result(BaseModel):
    value: int


def test_reuses_a_stored_result_until_the_cache_folder_is_deleted(tmp_path: Path) -> None:
    calls: list[int] = []

    async def compute() -> Result:
        calls.append(1)
        return Result(value=42)

    key = cache_key(b"image bytes", "Niebla (Huelva)")
    first = asyncio.run(cached(tmp_path / "georeference", key, Result, compute))
    second = asyncio.run(cached(tmp_path / "georeference", key, Result, compute))
    shutil.rmtree(tmp_path / "georeference")
    third = asyncio.run(cached(tmp_path / "georeference", key, Result, compute))

    assert first == second == third == Result(value=42)
    assert len(calls) == 2


def test_different_inputs_get_different_keys() -> None:
    assert cache_key(b"image bytes", "Niebla (Huelva)") != cache_key(b"image bytes", "La Mierla (Guadalajara)")
    assert cache_key(b"image bytes", "Niebla (Huelva)") != cache_key(b"other bytes", "Niebla (Huelva)")
