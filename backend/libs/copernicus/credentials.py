import os
from dataclasses import dataclass


@dataclass(frozen=True)
class CopernicusCredentials:
    client_id: str
    client_secret: str


def copernicus_credentials() -> CopernicusCredentials:
    return CopernicusCredentials(
        client_id=os.environ["COPERNICUS_CLIENT_ID"],
        client_secret=os.environ["COPERNICUS_CLIENT_SECRET"],
    )
