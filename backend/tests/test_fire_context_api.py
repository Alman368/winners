from collections.abc import Iterator
from datetime import date, datetime, timezone

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from shapely.geometry import LineString

from api import analysis
from libs.http_client import get_http_client
from libs.roads import RoadWay
from models import KilometrePoint, Weather
from pipeline.models import BurnedArea, BurnedPolygon, FireAnalysis, Ring, SceneInfo, SceneInput, SmokeArea
from tests.replay import ReplayTransport
from tests.scenes import SCENES_DIR

NIEBLA_TRUE_COLOR = SCENES_DIR / "niebla_huelva_2026-08-08/2026-08-08-00_00_2026-08-08-23_59_Sentinel-2_L2A_True_color.jpg"
BURNED_SQUARE = [(-6.70, 37.45), (-6.60, 37.45), (-6.60, 37.55), (-6.70, 37.55), (-6.70, 37.45)]

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
        burned_area=BurnedArea(
            polygons=[BurnedPolygon(exterior=Ring(lonlat=BURNED_SQUARE, pixel=[(0, 0)] * 5), holes=[])],
            area_ha=8000.0,
            perimeter_km=40.0,
            under_smoke_ha=0.0,
            severity=[],
        ),
        smoke=SmokeArea(area_ha=0.0, geometry={"type": "MultiPolygon", "coordinates": []}),
        not_assessable_ha=0.0,
        active_fires=[],
        active_front_km=0.0,
        geojson={"type": "FeatureCollection", "features": []},
    )


WEATHER = Weather(
    latitude=37.49,
    longitude=-6.66,
    hours=[],
    wind_from_deg=280.0,
    wind_towards_deg=100.0,
    mean_wind_kmh=12.0,
    max_gust_kmh=41.0,
    max_temperature_c=38.2,
    min_relative_humidity_pct=12.0,
    total_precipitation_mm=0.0,
)


@pytest.fixture
def services(monkeypatch: pytest.MonkeyPatch) -> Iterator[dict[str, list[object]]]:
    calls: dict[str, list[object]] = {"roads": [], "weather": []}

    async def find_fire_start(*args: object, **kwargs: object) -> datetime:
        return datetime(2026, 8, 6, 23, 28, tzinfo=timezone.utc)

    async def analyze(scene: SceneInput) -> FireAnalysis:
        return fire_analysis(scene)

    def fetch_roads(client: httpx.Client, bbox: tuple[float, float, float, float]) -> list[RoadWay]:
        calls["roads"].append(bbox)
        return [
            RoadWay(osm_id=1, ref="N-435", name=None, road_type="trunk", line=LineString([(-6.75, 37.50), (-6.55, 37.50)])),
            RoadWay(osm_id=2, ref="A-472", name=None, road_type="primary", line=LineString([(-6.80, 37.40), (-6.75, 37.40)])),
        ]

    def fetch_kilometre_points(
        client: httpx.Client, bboxes: list[tuple[float, float, float, float]]
    ) -> dict[str, list[KilometrePoint]]:
        return {}

    def fetch_weather(client: httpx.Client, lon: float, lat: float, start: date, end: date) -> Weather:
        calls["weather"].append((lon, lat, start, end))
        return WEATHER

    monkeypatch.setattr(analysis, "find_fire_start", find_fire_start)
    monkeypatch.setattr(analysis, "analyze", analyze)
    monkeypatch.setattr(analysis, "fetch_roads", fetch_roads)
    monkeypatch.setattr(analysis, "fetch_kilometre_points", fetch_kilometre_points)
    monkeypatch.setattr(analysis, "fetch_weather", fetch_weather)
    yield calls


def upload(client: TestClient) -> httpx.Response:
    return client.post(
        "/analysis",
        files={"image": (NIEBLA_TRUE_COLOR.name, NIEBLA_TRUE_COLOR.read_bytes())},
        data={"place": "Niebla (Huelva)"},
    )


@pytest.mark.scenes
def test_an_uploaded_scene_reports_the_roads_cut_by_the_fire_and_the_weather(services: dict[str, list[object]]) -> None:
    response = upload(TestClient(app))

    assert response.status_code == 200
    context = response.json()["context"]
    assert [(road["ref"], road["road_type"]) for road in context["roads"]] == [("N-435", "trunk")]
    assert context["roads"][0]["km_inside"] == pytest.approx(8.84, rel=0.01)
    assert context["weather"]["wind_from_deg"] == 280.0
    assert services["roads"] == [pytest.approx((-6.70, 37.45, -6.60, 37.55))]
    [(lon, lat, start, end)] = services["weather"]
    assert (start, end) == (date(2026, 8, 6), date(2026, 8, 8))
    assert (lon, lat) == pytest.approx((-6.66006, 37.48845), abs=0.001)


@pytest.mark.scenes
def test_the_fire_context_of_an_uploaded_scene_is_cached(services: dict[str, list[object]]) -> None:
    client = TestClient(app)
    first = upload(client)

    second = upload(client)

    assert second.json() == first.json()
    assert len(services["roads"]) == 1
    assert len(services["weather"]) == 1


def test_a_demo_scene_reports_its_fire_context_in_the_background(services: dict[str, list[object]]) -> None:
    with TestClient(app) as client:
        first = client.get("/analysis/scenes/niebla/context")
        responses = [client.get("/analysis/scenes/niebla/context") for _ in range(50)]
        ready = next(response for response in responses if response.status_code == 200)

    assert first.status_code == 202
    assert first.json() == {"status": "processing"}
    assert ready.json()["weather"]["wind_from_deg"] == 280.0
    [(lon, lat, start, end)] = services["weather"]
    assert (start, end) == (date(2026, 8, 7), date(2026, 8, 8))
