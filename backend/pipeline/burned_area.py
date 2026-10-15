from collections.abc import Callable

import numpy as np
from numpy.typing import NDArray
from scipy import ndimage

from pipeline.config import CONFIG
from pipeline.models import SeverityName

CROSS: NDArray[np.bool_] = ndimage.generate_binary_structure(2, 1)
SQUARE: NDArray[np.bool_] = ndimage.generate_binary_structure(2, 2)


def disk(radius_px: int) -> NDArray[np.bool_]:
    offsets = np.arange(-radius_px, radius_px + 1)
    return np.hypot(*np.meshgrid(offsets, offsets)) <= radius_px


def _edge_padded(operation: Callable[..., NDArray[np.bool_]], mask: NDArray[np.bool_], structure: NDArray[np.bool_]) -> NDArray[np.bool_]:
    """Runs a morphological operation on the mask extended with its own edge.

    scipy treats everything outside the image as empty, so an erosion step would erase burned or smoke pixels that
    touch the image border.
    """
    pad = structure.shape[0] // 2
    return operation(np.pad(mask, pad, mode="edge"), structure=structure)[pad:-pad, pad:-pad]


def opening(mask: NDArray[np.bool_], structure: NDArray[np.bool_]) -> NDArray[np.bool_]:
    return _edge_padded(ndimage.binary_opening, mask, structure)


def closing(mask: NDArray[np.bool_], structure: NDArray[np.bool_]) -> NDArray[np.bool_]:
    return _edge_padded(ndimage.binary_closing, mask, structure)


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
    recovers the fire edges without accepting isolated weak pixels. A small closing then joins patches split by
    one or two pixels, so the fire is not reported as dozens of fragments.
    """
    seeds = assessable & (dnbr > CONFIG.dnbr_seed)
    candidates = assessable & (dnbr > CONFIG.dnbr_grow)
    burned = ndimage.binary_propagation(seeds, structure=SQUARE, mask=candidates)
    burned = opening(burned, CROSS)
    burned = closing(burned, disk(round(CONFIG.burned_closing_m / CONFIG.resolution_m)))
    burned = _remove_small_components(burned, round(CONFIG.min_burned_area_ha / pixel_area_ha))
    return _fill_small_holes(burned, round(CONFIG.min_hole_area_ha / pixel_area_ha))


SEVERITY_NAMES: tuple[SeverityName, ...] = ("low", "moderate_low", "moderate_high", "high")


def severity_masks(dnbr: NDArray[np.float32], burned: NDArray[np.bool_]) -> dict[SeverityName, NDArray[np.bool_]]:
    """Burned pixels split into the USGS dNBR severity classes."""
    classes = np.digitize(dnbr, CONFIG.severity_breaks)
    return {name: burned & (classes == index) for index, name in enumerate(SEVERITY_NAMES)}
