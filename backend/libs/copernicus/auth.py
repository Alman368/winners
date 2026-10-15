import threading
import time
from dataclasses import dataclass

import httpx

from libs.copernicus.credentials import copernicus_credentials

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
REFRESH_MARGIN_S: float = 60


@dataclass(frozen=True)
class AccessToken:
    value: str
    expires_at: float
    """`time.monotonic()` instant after which the token is no longer valid."""


def fetch_token(client: httpx.Client, client_id: str, client_secret: str) -> AccessToken:
    response = client.post(
        TOKEN_URL,
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret},
    )
    response.raise_for_status()
    body = response.json()
    return AccessToken(value=body["access_token"], expires_at=time.monotonic() + body["expires_in"])


_token: AccessToken | None = None
_token_lock: threading.Lock = threading.Lock()


def copernicus_token(client: httpx.Client) -> str:
    """Process-wide token, refreshed shortly before it expires instead of once per request."""
    global _token
    with _token_lock:
        if _token is None or time.monotonic() > _token.expires_at - REFRESH_MARGIN_S:
            credentials = copernicus_credentials()
            _token = fetch_token(client, credentials.client_id, credentials.client_secret)
        return _token.value
