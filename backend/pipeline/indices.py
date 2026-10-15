import numpy as np
from numpy.typing import NDArray

from pipeline.bands import Bands
from pipeline.config import CONFIG


def nbr(bands: Bands) -> NDArray[np.float32]:
    """Normalized Burn Ratio. Healthy vegetation reflects strongly in NIR and weakly in SWIR; burning reverses it."""
    return (bands.b8a - bands.b12) / np.maximum(bands.b8a + bands.b12, 1e-6)


def dnbr(pre: Bands, post: Bands) -> NDArray[np.float32]:
    """Change in NBR. Surfaces that did not change (bare soil, cities, dry crops) stay near 0."""
    return nbr(pre) - nbr(post)


def observable(bands: Bands) -> NDArray[np.bool_]:
    """Pixels with a valid, cloud-free, non-water observation."""
    return bands.valid & ~np.isin(bands.scl, CONFIG.excluded_scl_classes)


def assessable(pre: Bands, post: Bands) -> NDArray[np.bool_]:
    """Pixels with valid, cloud-free, non-water observations on both dates."""
    return observable(pre) & observable(post)


def hot_pixels(bands: Bands) -> NDArray[np.bool_]:
    """Active fire signature: fire emits strongly at 2.2 µm (B12) and almost nothing in NIR (B8A)."""
    ratio = bands.b12 / np.maximum(bands.b8a, 1e-6)
    return bands.valid & (bands.b12 >= CONFIG.fire_min_b12) & (ratio >= CONFIG.fire_min_b12_b8a_ratio)
