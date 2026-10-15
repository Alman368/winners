import numpy as np
from affine import Affine
from numpy.typing import NDArray
from pyproj import Geod
from rasterio.features import shapes
from shapely import get_parts, make_valid
from shapely.affinity import affine_transform
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.ops import unary_union

from pipeline.config import CONFIG

GEOD: Geod = Geod(ellps="WGS84")


def mask_to_multipolygon(mask: NDArray[np.bool_], transform: Affine, min_pixels: float = 0) -> MultiPolygon:
    """Mask to lon/lat polygons with their holes, using the pixel-to-lon/lat `transform` of the mask.

    Polygons are simplified in pixel space (pixels are square in metres) before projecting to lon/lat, and the ones
    smaller than `min_pixels` are dropped.
    """
    tolerance_px = CONFIG.simplify_tolerance_m / CONFIG.resolution_m
    polygons = [
        make_valid(shape(geometry).simplify(tolerance_px))
        for geometry, value in shapes(mask.astype(np.uint8), mask=mask, connectivity=8)
        if value == 1 and shape(geometry).area >= min_pixels
    ]
    t = transform
    merged = affine_transform(unary_union(polygons), [t.a, t.b, t.d, t.e, t.c, t.f])
    return MultiPolygon([part for part in get_parts(merged) if isinstance(part, Polygon)])


def area_ha(geometry: MultiPolygon) -> float:
    return abs(GEOD.geometry_area_perimeter(geometry)[0]) / 10_000


def exterior_perimeter_km(geometry: MultiPolygon) -> float:
    """Perimeter of the outer boundaries of the polygons from CONFIG.perimeter_min_polygon_ha.

    Holes are unburned islands, not part of the fire perimeter, and small scattered patches would add many
    kilometres of edge that are not the fire front.
    """
    exteriors = [Polygon(polygon.exterior) for polygon in geometry.geoms]
    return sum(
        GEOD.geometry_length(exterior)
        for exterior in exteriors
        if area_ha(MultiPolygon([exterior])) >= CONFIG.perimeter_min_polygon_ha
    ) / 1000
