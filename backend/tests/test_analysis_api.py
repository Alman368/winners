from collections.abc import Iterator
from datetime import date, datetime, timezone

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api import analysis
from libs.effis import FireStartNotFoundError
from libs.http_client import get_http_client
from pipeline.models import BurnedArea, FireAnalysis, SceneInfo, SceneInput
from tests.replay import ReplayTransport
from tests.scenes import SCENES_DIR

NIEBLA_TRUE_COLOR = SCENES_DIR / "niebla_huelva_2026-08-08/2026-08-08-00_00_2026-08-08-23_59_Sentinel-2_L2A_True_color.jpg"
NIEBLA_START = datetime(2026, 8, 6, 23, 28, tzinfo=timezone.utc)

app = FastAPI()
app.include_router(analysis.router)
app.dependency_overrides[get_http_client] = lambda: httpx.Client(transport=ReplayTransport())


def fire_analysis(scene: SceneInput) -> FireAnalysis:
    return FireAnalysis(
        scene=SceneInfo(
            acquisition_date=scene.acquisition_date,
            pre_fire_window=(date(2026, 7, 6), date(2026, 8, 4)),
            pre_fire_coverage=1.0,
            pre_fire_median_age_days=3.0,
            bbox=scene.bbox,
            image_size=scene.image_size,
        ),
        burned_area=BurnedArea(polygons=[], area_ha=2455.0, perimeter_km=40.0, severity=[]),
        not_assessable_ha=0.0,
        active_fires=[],
        active_front_km=0.0,
        geojson={"type": "FeatureCollection", "features": []},
    )


@pytest.fixture
def services(monkeypatch: pytest.MonkeyPatch) -> Iterator[dict[str, list[object]]]:
    calls: dict[str, list[object]] = {"effis": [], "pipeline": []}

    async def find_fire_start(*args: object, **kwargs: object) -> datetime:
        calls["effis"].append(args)
        return NIEBLA_START

    async def analyze(scene: SceneInput) -> FireAnalysis:
        calls["pipeline"].append(scene)
        return fire_analysis(scene)

    monkeypatch.setattr(analysis, "find_fire_start", find_fire_start)
    monkeypatch.setattr(analysis, "analyze", analyze)
    yield calls


def upload(client: TestClient) -> httpx.Response:
    return client.post(
        "/analysis",
        files={"image": (NIEBLA_TRUE_COLOR.name, NIEBLA_TRUE_COLOR.read_bytes())},
        data={"place": "Niebla (Huelva)"},
    )


@pytest.mark.scenes
def test_runs_the_algorithm_on_the_located_scene_from_the_effis_fire_start(services: dict[str, list[object]]) -> None:
    response = upload(TestClient(app))

    assert response.status_code == 200
    [scene] = services["pipeline"]
    assert scene.acquisition_date == date(2026, 8, 8)
    assert scene.fire_start == date(2026, 8, 6)
    assert scene.image_size == (2500, 1546)
    assert scene.bbox == pytest.approx((-6.84116, 37.39951, -6.47896, 37.57728), abs=0.0005)
    assert response.json()["fire_start"] == "2026-08-06T23:28:00Z"
    assert response.json()["analysis"]["burned_area"]["area_ha"] == 2455.0


@pytest.mark.scenes
def test_serves_an_image_analysed_before_from_the_cache(services: dict[str, list[object]]) -> None:
    client = TestClient(app)
    first = upload(client)

    second = upload(client)

    assert second.json() == first.json()
    assert len(services["pipeline"]) == 1
    assert len(services["effis"]) == 1


@pytest.mark.scenes
def test_rejects_a_scene_without_an_effis_fire(monkeypatch: pytest.MonkeyPatch) -> None:
    async def no_fire(*args: object, **kwargs: object) -> datetime:
        raise FireStartNotFoundError(args)

    monkeypatch.setattr(analysis, "find_fire_start", no_fire)

    response = upload(TestClient(app))

    assert response.status_code == 422
    assert response.json() == {"detail": "fire_start_not_found"}
