import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ENV_FILE = Path(__file__).parents[2] / ".env"


@dataclass(frozen=True)
class CopernicusCredentials:
    client_id: str
    client_secret: str


def copernicus_credentials() -> CopernicusCredentials:
    load_dotenv(ENV_FILE)
    return CopernicusCredentials(
        client_id=os.environ["COPERNICUS_CLIENT_ID"],
        client_secret=os.environ["COPERNICUS_CLIENT_SECRET"],
    )
