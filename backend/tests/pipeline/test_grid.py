import pytest

from libs.georeferencing.mercator import from_mercator, to_mercator
from pipeline.grid import lonlat_to_image_pixel

MADRID_AVILA_BBOX = (-4.93704, 40.12956, -3.48751, 40.81228)
MADRID_AVILA_SIZE = (9930, 6141)


def test_maps_lonlat_to_the_web_mercator_rows_of_a_copernicus_browser_export() -> None:
    west, south, east, north = MADRID_AVILA_BBOX
    _, y_south = to_mercator(0, south)
    _, y_north = to_mercator(0, north)
    _, lat_at_middle_row = from_mercator(0, (y_south + y_north) / 2)

    x, y = lonlat_to_image_pixel((west + east) / 2, lat_at_middle_row, MADRID_AVILA_BBOX, MADRID_AVILA_SIZE)

    assert x == pytest.approx(4965, abs=0.01)
    assert y == pytest.approx(3070.5, abs=0.01)


def test_maps_the_bbox_corners_to_the_image_corners() -> None:
    west, south, east, north = MADRID_AVILA_BBOX

    assert lonlat_to_image_pixel(west, north, MADRID_AVILA_BBOX, MADRID_AVILA_SIZE) == pytest.approx((0, 0), abs=1e-6)
    assert lonlat_to_image_pixel(east, south, MADRID_AVILA_BBOX, MADRID_AVILA_SIZE) == pytest.approx((9930, 6141), abs=1e-6)
