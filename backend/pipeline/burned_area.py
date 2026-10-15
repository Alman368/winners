import numpy as np
from numpy.typing import NDArray
from scipy import ndimage

from pipeline.config import CONFIG

CROSS: NDArray[np.bool_] = ndimage.generate_binary_structure(2, 1)
SQUARE: NDArray[np.bool_] = ndimage.generate_binary_structure(2, 2)


def _remove_small_components(mask: NDArray[np.bool_], min_pixels: int) -> NDArray[np.bool_]:
    labels, _ = ndimage.label(mask, structure=SQUARE)
    sizes = np.bincount(labels.ravel())
    keep = sizes >= min_pixels
    keep[0] = False
    return keep[labels]


def _fill_small_holes(mask: NDArray[np.bool_], max_pixels: int) -> NDArray[np.bool_]:
    labels, _ = ndimage.label(~mask, structure=CROSS)
    sizes = np.bincount(labels.ravel())
    touches_border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    fill = sizes < max_pixels
    fill[0] = False
    fill[touches_border] = False
    return mask | fill[labels]


def detect_burned(dnbr: NDArray[np.float32], assessable: NDArray[np.bool_], pixel_area_ha: float) -> NDArray[np.bool_]:
    """Burned mask by hysteresis on dNBR.

    Seeds above the moderate-low threshold grow through connected pixels above the low-severity bound, which
    recovers the fire edges without accepting isolated weak pixels.
    """
    seeds = assessable & (dnbr > CONFIG.dnbr_seed)
    candidates = assessable & (dnbr > CONFIG.dnbr_grow)
    burned = ndimage.binary_propagation(seeds, structure=SQUARE, mask=candidates)
    burned = ndimage.binary_opening(burned, structure=CROSS)
    burned = _remove_small_components(burned, round(CONFIG.min_burned_area_ha / pixel_area_ha))
    return _fill_small_holes(burned, round(CONFIG.min_hole_area_ha / pixel_area_ha))


def severity_ha(dnbr: NDArray[np.float32], burned: NDArray[np.bool_], pixel_area_ha: float) -> dict[str, float]:
    classes = np.digitize(dnbr[burned], CONFIG.severity_breaks)
    counts = np.bincount(classes, minlength=4)
    names = ("low", "moderate_low", "moderate_high", "high")
    return {name: round(float(count * pixel_area_ha), 1) for name, count in zip(names, counts)}
