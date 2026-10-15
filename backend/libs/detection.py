import numpy as np
from numpy.typing import NDArray
from PIL import Image
from rasterio.features import shapes
from scipy import ndimage
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

from models import ActiveFire, SceneAnalysis

MIN_BURNED_FRACTION: float = 0.002
SIMPLIFY_TOLERANCE_PX: float = 2.0


def detect_active_fire(rgb: NDArray[np.float32]) -> NDArray[np.bool_]:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    fire = (r > 200) & (r - g > 60) & (r - b > 60)
    return ndimage.binary_opening(fire, iterations=1)


def detect_burned(rgb: NDArray[np.float32], fire: NDArray[np.bool_]) -> NDArray[np.bool_]:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    burned = (r > g + 8) & (r > b + 8) & (r < 200) & ~fire
    burned = ndimage.binary_opening(burned, iterations=2)
    burned = ndimage.binary_closing(burned, iterations=4)
    labels, count = ndimage.label(burned)
    sizes = ndimage.sum(burned, labels, range(1, count + 1))
    large = np.isin(labels, 1 + np.flatnonzero(sizes > burned.size * MIN_BURNED_FRACTION))
    return ndimage.binary_fill_holes(large)


def analyze_swir(image: Image.Image) -> SceneAnalysis:
    rgb = np.asarray(image.convert("RGB")).astype(np.float32)
    fire = detect_active_fire(rgb)
    burned = detect_burned(rgb, fire)

    polygons = [shape(geom) for geom, value in shapes(burned.astype(np.uint8), mask=burned) if value == 1]
    perimeter = unary_union(polygons).simplify(SIMPLIFY_TOLERANCE_PX)

    labels, count = ndimage.label(fire)
    centers = ndimage.center_of_mass(fire, labels, range(1, count + 1))
    sizes = ndimage.sum(fire, labels, range(1, count + 1))

    return SceneAnalysis(
        width=rgb.shape[1],
        height=rgb.shape[0],
        burned_fraction=float(burned.mean()),
        burned_perimeter=mapping(perimeter),
        active_fires=[ActiveFire(x=x, y=y, area_px=int(size)) for (y, x), size in zip(centers, sizes)],
    )
