from urllib.parse import parse_qs

import httpx

from app.copernicus.auth import TOKEN_URL, fetch_token


def identity_server(request: httpx.Request) -> httpx.Response:
    form = parse_qs(request.content.decode())
    if str(request.url) != TOKEN_URL or form != {
        "grant_type": ["client_credentials"],
        "client_id": ["my-client"],
        "client_secret": ["my-secret"],
    }:
        return httpx.Response(401, json={"error": "unauthorized_client"})
    return httpx.Response(
        200,
        json={
            "access_token": "eyJ.token",
            "expires_in": 600,
            "refresh_expires_in": 0,
            "token_type": "Bearer",
            "not-before-policy": 0,
            "scope": "email profile",
        },
    )


def test_exchanges_client_credentials_for_an_access_token() -> None:
    client = httpx.Client(transport=httpx.MockTransport(identity_server))

    assert fetch_token(client, "my-client", "my-secret") == "eyJ.token"
