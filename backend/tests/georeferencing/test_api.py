from collections.abc import Iterator

import httpx
import pytest
from fastapi.testclient import TestClient

from app.http_client import get_http_client
from app.main import app
from tests.replay import ReplayTransport
from tests.scenes import SCENES_DIR

NIEBLA_TRUE_COLOR = SCENES_DIR / "Niebla (Huelva)/2026-08-08-00_00_2026-08-08-23_59_Sentinel-2_L2A_True_color.jpg"


def use_transport(transport: httpx.BaseTransport) -> Iterator[TestClient]:
    app.dependency_overrides[get_http_client] = lambda: httpx.Client(transport=transport)
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def replay_api() -> Iterator[TestClient]:
    yield from use_transport(ReplayTransport())


@pytest.fixture
def unknown_place_api() -> Iterator[TestClient]:
    yield from use_transport(httpx.MockTransport(lambda request: httpx.Response(200, json=[])))


@pytest.mark.scenes
def test_georeferences_an_uploaded_scene(replay_api: TestClient) -> None:
    response = replay_api.post(
        "/georeference",
        files={"image": NIEBLA_TRUE_COLOR.open("rb")},
        data={"place": "Niebla (Huelva)"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["centre_lat"] == pytest.approx(37.4885, abs=0.005)
    assert body["centre_lon"] == pytest.approx(-6.6601, abs=0.005)
    assert body["west"] < body["centre_lon"] < body["east"]
    assert body["south"] < body["centre_lat"] < body["north"]
    assert body["metres_per_px"] == pytest.approx(12.8, rel=0.03)


def test_a_file_that_is_not_an_image_is_rejected(unknown_place_api: TestClient) -> None:
    response = unknown_place_api.post(
        "/georeference",
        files={"image": ("informe.pdf", b"%PDF-1.7 not an image")},
        data={"place": "Niebla (Huelva)"},
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "invalid_image"}


def test_unknown_place_is_rejected(unknown_place_api: TestClient) -> None:
    response = unknown_place_api.post(
        "/georeference",
        files={"image": NIEBLA_TRUE_COLOR.open("rb")},
        data={"place": "Lugar inexistente"},
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "place_not_found"}
