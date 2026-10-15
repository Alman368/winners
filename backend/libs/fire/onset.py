from dataclasses import dataclass
from datetime import datetime
from typing import Literal

import cv2
import numpy as np

from libs.copernicus.process import BandScene

DNBR_BURNED = 0.27
MIN_SCAR_HA = 20.0
ONSET_FRACTION = 0.05
MIN_CLEAR_FRACTION = 0.5
CLOUD_CLASSES = (3, 8, 9, 10)
WATER_CLASS = 6


class ScarNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class Observation:
    acquired_at: datetime
    scene: BandScene


@dataclass(frozen=True)
class PassCheck:
    acquired_at: datetime
    status: Literal["unburned", "burned", "cloudy"]


@dataclass(frozen=True)
class Onset:
    """The fire started after `after` (last clear pass without the scar) and before `before`."""

    after: datetime
    before: datetime
    baseline: datetime
    scar_ha: float
    checks: list[PassCheck]


def nbr(scene: BandScene) -> np.ndarray:
    nir, swir = scene.reflectance["B08"], scene.reflectance["B12"]
    return (nir - swir) / np.maximum(nir + swir, 1e-6)


def clear(scene: BandScene) -> np.ndarray:
    return scene.data_mask & ~np.isin(scene.scl, CLOUD_CLASSES) & (scene.scl != WATER_CLASS)


def scar_mask(baseline: BandScene, fire: BandScene) -> np.ndarray:
    burned = (nbr(baseline) - nbr(fire) > DNBR_BURNED) & clear(baseline) & clear(fire)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(burned.astype(np.uint8), connectivity=8)
    min_px = MIN_SCAR_HA * 10_000 / fire.metres_per_px**2
    large = [label for label in range(1, count) if stats[label, cv2.CC_STAT_AREA] >= min_px]
    return np.isin(labels, large)


def estimate_onset(earlier: list[Observation], fire: Observation) -> Onset:
    """Brackets the fire start using passes before the fire day, oldest first; the oldest mostly clear one is the baseline."""
    start = next(i for i, o in enumerate(earlier) if clear(o.scene).mean() >= MIN_CLEAR_FRACTION)
    baseline = earlier[start]
    scar = scar_mask(baseline.scene, fire.scene)
    if not scar.any():
        raise ScarNotFoundError(fire.acquired_at)

    baseline_nbr = nbr(baseline.scene)
    after = baseline.acquired_at
    checks: list[PassCheck] = []
    for observation in earlier[start + 1 :]:
        visible = scar & clear(observation.scene)
        if visible.sum() < MIN_CLEAR_FRACTION * scar.sum():
            checks.append(PassCheck(observation.acquired_at, "cloudy"))
            continue
        burned = baseline_nbr[visible] - nbr(observation.scene)[visible] > DNBR_BURNED
        if burned.mean() >= ONSET_FRACTION:
            checks.append(PassCheck(observation.acquired_at, "burned"))
            return Onset(after, observation.acquired_at, baseline.acquired_at, _hectares(scar, fire.scene), checks)
        checks.append(PassCheck(observation.acquired_at, "unburned"))
        after = observation.acquired_at
    return Onset(after, fire.acquired_at, baseline.acquired_at, _hectares(scar, fire.scene), checks)


def _hectares(mask: np.ndarray, scene: BandScene) -> float:
    return float(mask.sum() * scene.metres_per_px**2 / 10_000)
