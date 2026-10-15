import httpx

from libs.copernicus.credentials import copernicus_credentials

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"


def fetch_token(client: httpx.Client, client_id: str, client_secret: str) -> str:
    response = client.post(
        TOKEN_URL,
        data={"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret},
    )
    response.raise_for_status()
    return response.json()["access_token"]


def copernicus_token(client: httpx.Client) -> str:
    credentials = copernicus_credentials()
    return fetch_token(client, credentials.client_id, credentials.client_secret)
