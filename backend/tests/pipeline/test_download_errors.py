import asyncio
import io

import httpx
import numpy as np
from numpy.typing import NDArray
import pytest
import rasterio

from pipeline import copernicus


def test_stops_processing_immediately_when_the_account_has_no_quota(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(copernicus, "_token", lambda: "test-token")

    async def download() -> NDArray[np.uint16]:
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(403))) as client:
            return await asyncio.wait_for(copernicus._fetch_tile(client, asyncio.Semaphore(1), {}), timeout=1)

    with pytest.raises(copernicus.QuotaExhaustedError):
        asyncio.run(download())


def test_waits_out_the_rate_limit_however_many_times_copernicus_answers_429(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(copernicus, "_token", lambda: "test-token")
    tile = io.BytesIO()
    with rasterio.open(tile, "w", driver="GTiff", width=2, height=2, count=1, dtype="uint16") as dataset:
        dataset.write(np.full((1, 2, 2), 7, np.uint16))
    answers = iter(
        [httpx.Response(429, headers={"Retry-After": "1"})] * (copernicus.CONFIG.download_retries + 2)
        + [httpx.Response(200, content=tile.getvalue())]
    )

    async def download() -> NDArray[np.uint16]:
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: next(answers))) as client:
            return await copernicus._fetch_tile(client, asyncio.Semaphore(1), {})

    assert (asyncio.run(download()) == 7).all()
