import pytest

from app.georeferencing.mercator import from_mercator, to_mercator


@pytest.mark.parametrize(
    ("lon", "lat", "x", "y"),
    [
        (0.0, 0.0, 0.0, 0.0),
        (180.0, 0.0, 20037508.342789244, 0.0),
        (-90.0, 45.0, -10018754.171394622, 5621521.486192066),
    ],
)
def test_converts_between_lonlat_and_web_mercator(lon: float, lat: float, x: float, y: float) -> None:
    assert to_mercator(lon, lat) == pytest.approx((x, y), abs=1e-6)
    assert from_mercator(x, y) == pytest.approx((lon, lat), abs=1e-9)
