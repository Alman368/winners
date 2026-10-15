from collections.abc import Iterator

import httpx

TIMEOUT_S = 120


def get_http_client() -> Iterator[httpx.Client]:
    with httpx.Client(timeout=TIMEOUT_S) as client:
        yield client
