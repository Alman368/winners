import numpy as np
from numpy.typing import NDArray
import pytest
from shapely.affinity import affine_transform
from shapely.geometry import box, mapping, shape
from shapely.ops import unary_union

from pipeline.active_fire import detect_fires, group_fronts
from pipeline.grid import Grid
from pipeline.models import ActiveFire, Point

GRID: Grid = Grid((0, 0, 0.06, 0.03), 300, 150)


def front(x: int) -> ActiveFire:
    transform = GRID.transform
    geometry = affine_transform(box(x, 70, x + 5, 71), [transform.a, transform.b, transform.d, transform.e, transform.c, transform.f])
    return ActiveFire(
        id=x,
        centroid=Point(lonlat=GRID.pixel_to_lonlat(x + 2.5, 70.5), pixel=(x + 2.5, 70.5)),
        bbox_pixel=(x, 70, x + 5, 71),
        pixels=5,
        area_ha=0.2,
        front_length_km=0.1,
        geometry=mapping(geometry),
    )


def test_groups_nearby_fronts_without_filling_the_gaps_or_inflating_the_length() -> None:
    segments = [front(x) for x in (40, 70, 220)]
    fires = group_fronts(segments, GRID)

    assert sorted(fire.pixels for fire in fires) == [5, 10]
    assert sum(fire.front_length_km for fire in fires) == pytest.approx(0.3)
    assert sum(fire.area_ha for fire in fires) == pytest.approx(0.6)
    assert unary_union([shape(fire.geometry) for fire in fires]).equals(unary_union([shape(fire.geometry) for fire in segments]))


def test_excludes_persistent_and_unrelated_heat_sources_before_grouping() -> None:
    hot: NDArray[np.bool_] = np.zeros((150, 300), bool)
    hot[70, 40:45] = True
    hot[70, 60:65] = True
    hot[70, 170:175] = True
    persistent: NDArray[np.bool_] = np.zeros_like(hot)
    persistent[70, 60:65] = True
    burned: NDArray[np.bool_] = np.zeros_like(hot)
    burned[70, 40:45] = True

    fires = detect_fires(hot, persistent, burned)

    assert len(fires) == 1
    assert fires[0].pixels == 5
    assert set(fires[0].xs.tolist()) == set(range(40, 45))


def test_returns_no_fronts_without_hot_pixels() -> None:
    empty: NDArray[np.bool_] = np.zeros((100, 100), bool)

    assert detect_fires(empty, empty, empty) == []
    assert group_fronts([], GRID) == []
