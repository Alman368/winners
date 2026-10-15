import numpy as np
from numpy.typing import NDArray
from pyproj import Geod
from rasterio.features import shapes
from shapely import get_parts, make_valid
from shapely.affinity import affine_transform
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import unary_union

from pipeline.config import CONFIG
from pipeline.grid import Grid

GEOD: Geod = Geod(ellps="WGS84")


def mask_to_multipolygon(mask: NDArray[np.bool_], grid: Grid) -> MultiPolygon:
    """Burned mask to lon/lat polygons with their unburned holes.

    Polygons are simplified in pixel space (pixels are square in metres) before projecting to lon/lat.
    """
    tolerance_px = CONFIG.simplify_tolerance_m / CONFIG.resolution_m
    polygons = [
        make_valid(shape(geometry).simplify(tolerance_px))
        for geometry, value in shapes(mask.astype(np.uint8), mask=mask, connectivity=8)
        if value == 1
    ]
    t = grid.transform
    merged = affine_transform(unary_union(polygons), [t.a, t.b, t.d, t.e, t.c, t.f])
    return MultiPolygon([part for part in get_parts(merged) if isinstance(part, Polygon)])


def area_ha(geometry: MultiPolygon) -> float:
    return abs(GEOD.geometry_area_perimeter(geometry)[0]) / 10_000


def exterior_perimeter_km(geometry: MultiPolygon) -> float:
    """Perimeter of the outer boundaries only: holes are unburned islands, not part of the fire perimeter."""
    return sum(GEOD.geometry_length(Polygon(polygon.exterior)) for polygon in geometry.geoms) / 1000
