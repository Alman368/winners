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


def _chaikin(ring: NDArray[np.float64]) -> NDArray[np.float64]:
    """Chaikin corner cutting of a closed ring: each edge is replaced by its points at 1/4 and 3/4."""
    points = ring[:-1]
    for _ in range(CONFIG.outline_chaikin_iterations):
        following = np.roll(points, -1, axis=0)
        cut = np.empty((len(points) * 2, 2))
        cut[0::2] = 0.75 * points + 0.25 * following
        cut[1::2] = 0.25 * points + 0.75 * following
        points = cut
    return np.vstack([points, points[:1]])


def _smooth(polygon: Polygon) -> Polygon:
    """Rounds the corners and drops the near-collinear points the corner cutting leaves on straight stretches."""
    rounded = Polygon(
        _chaikin(np.asarray(polygon.exterior.coords)), [_chaikin(np.asarray(hole.coords)) for hole in polygon.interiors]
    )
    return rounded.simplify(CONFIG.outline_vertex_tolerance_px)


def mask_to_multipolygon(
    mask: NDArray[np.bool_], transform: Affine, min_pixels: float = 0, rounding_px: float = 0
) -> MultiPolygon:
    """Mask to lon/lat polygons with their holes, using the pixel-to-lon/lat `transform` of the mask.

    In pixel space (pixels are square in metres): polygons smaller than `min_pixels` are dropped, a rounded opening
    and closing of `rounding_px` removes one-pixel spikes and steps, Douglas-Peucker simplifies and Chaikin rounds
    the corners. Then they are projected to lon/lat.
    """
    tolerance_px = CONFIG.simplify_tolerance_m / CONFIG.resolution_m
    merged = unary_union(
        [shape(geometry) for geometry, value in shapes(mask.astype(np.uint8), mask=mask, connectivity=8) if value == 1]
    )
    if rounding_px > 0:
        merged = merged.buffer(rounding_px).buffer(-2 * rounding_px).buffer(rounding_px)
    polygons = [
        _smooth(part)
        for part in get_parts(make_valid(merged.simplify(tolerance_px)))
        if isinstance(part, Polygon) and part.area >= min_pixels
    ]
    t = transform
    projected = affine_transform(make_valid(unary_union(polygons)), [t.a, t.b, t.d, t.e, t.c, t.f])
    return MultiPolygon([part for part in get_parts(projected) if isinstance(part, Polygon)])


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
