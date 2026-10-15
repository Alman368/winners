from collections.abc import Iterator

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.georeferencing import router
from libs.http_client import get_http_client
from tests.replay import ReplayTransport
from tests.scenes import SCENES_DIR

app = FastAPI()
app.include_router(router)

NIEBLA_TRUE_COLOR = SCENES_DIR / "niebla_huelva_2026-08-08/2026-08-08-00_00_2026-08-08-23_59_Sentinel-2_L2A_True_color.jpg"


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
    assert body["date"] == "2026-08-08"
    assert body["image_size"] == [2500, 1546]
    assert body["bbox"] == pytest.approx([-6.84125, 37.39963, -6.47903, 37.57739], abs=0.0005)
    assert body["centre_lat"] == pytest.approx(37.4885, abs=0.005)
    assert body["centre_lon"] == pytest.approx(-6.6601, abs=0.005)
    assert body["metres_per_px"] == pytest.approx(12.8, rel=0.03)


def test_an_export_mosaicking_several_days_is_rejected(unknown_place_api: TestClient) -> None:
    response = unknown_place_api.post(
        "/georeference",
        files={"image": ("2026-07-20-00_00_2026-07-26-23_59_Sentinel-2_L2A_True_color.jpg", NIEBLA_TRUE_COLOR.read_bytes())},
        data={"place": "Niebla (Huelva)"},
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "multi_day_export"}


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
