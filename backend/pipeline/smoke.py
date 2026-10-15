import numpy as np
from numpy.typing import NDArray
from scipy import ndimage

from pipeline.bands import Bands
from pipeline.burned_area import SQUARE, disk
from pipeline.config import CONFIG


def detect_smoke(
    pre: Bands, post: Bands, burned: NDArray[np.bool_], assessable: NDArray[np.bool_]
) -> NDArray[np.bool_]:
    """Smoke plumes attached to the fire: unburned pixels whose red reflectance rose since the pre-fire composite."""
    radius_px = round(CONFIG.smoke_cleaning_m / CONFIG.resolution_m)
    candidates = assessable & ~burned & (post.b04 - pre.b04 > CONFIG.smoke_min_b04_increase)
    candidates = ndimage.binary_opening(candidates, structure=disk(radius_px))
    candidates = ndimage.binary_closing(candidates, structure=disk(radius_px))
    labels, _ = ndimage.label(candidates, structure=SQUARE)
    near_fire = ndimage.distance_transform_edt(~burned) * CONFIG.resolution_m <= CONFIG.smoke_max_distance_m
    attached = np.unique(labels[near_fire & candidates])
    return np.isin(labels, attached[attached > 0])


def burned_under_smoke(
    dnbr2: NDArray[np.float32], smoke: NDArray[np.bool_], burned: NDArray[np.bool_]
) -> NDArray[np.bool_]:
    """Burned land hidden by smoke: smoke pixels above the dNBR2 threshold connected to the visible burned area."""
    candidates = burned | (smoke & (dnbr2 > CONFIG.smoke_dnbr2_grow))
    return ndimage.binary_propagation(burned, structure=SQUARE, mask=candidates) & ~burned
