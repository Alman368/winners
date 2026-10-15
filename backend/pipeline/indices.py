import numpy as np
from numpy.typing import NDArray

from pipeline.bands import Bands
from pipeline.config import CONFIG


def nbr(bands: Bands) -> NDArray[np.float32]:
    """Normalized Burn Ratio. Healthy vegetation reflects strongly in NIR and weakly in SWIR; burning reverses it."""
    return (bands.b8a - bands.b12) / np.maximum(bands.b8a + bands.b12, 1e-6)


def nbr2(bands: Bands) -> NDArray[np.float32]:
    """NBR with the two SWIR bands only (B11, B12), which see through smoke far better than NIR."""
    return (bands.b11 - bands.b12) / np.maximum(bands.b11 + bands.b12, 1e-6)


def dnbr2(pre: Bands, post: Bands) -> NDArray[np.float32]:
    return nbr2(pre) - nbr2(post)


def dnbr(pre: Bands, post: Bands) -> NDArray[np.float32]:
    """Change in NBR. Surfaces that did not change (bare soil, cities, dry crops) stay near 0."""
    return nbr(pre) - nbr(post)


def observable(bands: Bands) -> NDArray[np.bool_]:
    """Pixels with a valid, cloud-free, non-water observation."""
    return bands.valid & ~np.isin(bands.scl, CONFIG.excluded_scl_classes)


def assessable(pre: Bands, post: Bands) -> NDArray[np.bool_]:
    """Pixels with valid, cloud-free, non-water observations on both dates."""
    return observable(pre) & observable(post)


def burn_evidence(pre: Bands, post: Bands) -> NDArray[np.bool_]:
    """Assessable pixels where the SWIR bands also show burning, so dNBR is not raised by smoke alone.

    Everywhere dNBR2 must pass CONFIG.burned_min_dnbr2; under a smoke veil (red reflectance rose), the stricter
    CONFIG.smoke_dnbr2_grow.
    """
    change2 = dnbr2(pre, post)
    hazy = post.b04 - pre.b04 > CONFIG.haze_min_b04_increase
    swir_burn = (change2 > CONFIG.burned_min_dnbr2) & (~hazy | (change2 > CONFIG.smoke_dnbr2_grow))
    return assessable(pre, post) & swir_burn


def assessable_through_smoke(pre: Bands, post: Bands) -> NDArray[np.bool_]:
    """Like `assessable`, but also accepts fire-day pixels the SCL marks as cloud: dense smoke falls into those classes."""
    smoke_like = np.isin(post.scl, CONFIG.smoke_hiding_scl_classes)
    return observable(pre) & post.valid & (observable(post) | smoke_like)


def hot_pixels(bands: Bands) -> NDArray[np.bool_]:
    """Active fire signature: fire emits strongly at 2.2 µm (B12) and almost nothing in NIR (B8A)."""
    ratio = bands.b12 / np.maximum(bands.b8a, 1e-6)
    return bands.valid & (bands.b12 >= CONFIG.fire_min_b12) & (ratio >= CONFIG.fire_min_b12_b8a_ratio)
