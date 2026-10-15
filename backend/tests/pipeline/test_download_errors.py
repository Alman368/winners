import asyncio

import httpx
import numpy as np
from numpy.typing import NDArray
import pytest

from pipeline import copernicus


def test_stops_processing_immediately_when_the_account_has_no_quota(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(copernicus, "_token", lambda: "test-token")

    async def download() -> NDArray[np.uint16]:
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: httpx.Response(403))) as client:
            return await asyncio.wait_for(copernicus._fetch_tile(client, asyncio.Semaphore(1), {}), timeout=1)

    with pytest.raises(copernicus.QuotaExhaustedError):
        asyncio.run(download())
