from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from pipeline.bands import Bands
from pipeline.burned_area import detect_burned
from pipeline.config import CONFIG
from pipeline.indices import dnbr, observable

ONSET_FRACTION = 0.05
MIN_CLEAR_FRACTION = 0.5


class ScarNotFoundError(Exception):
    pass


@dataclass(frozen=True)
class Observation:
    acquired_at: datetime
    bands: Bands


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


def estimate_onset(earlier: list[Observation], fire: Observation, pixel_area_ha: float) -> Onset:
    """Brackets the fire start using passes before the fire day, oldest first; the oldest mostly clear one is the baseline."""
    start = next(i for i, o in enumerate(earlier) if observable(o.bands).mean() >= MIN_CLEAR_FRACTION)
    baseline = earlier[start]
    scar = detect_burned(
        dnbr(baseline.bands, fire.bands), observable(baseline.bands) & observable(fire.bands), pixel_area_ha
    )
    if not scar.any():
        raise ScarNotFoundError(fire.acquired_at)
    scar_ha = float(scar.sum() * pixel_area_ha)

    after = baseline.acquired_at
    checks: list[PassCheck] = []
    for observation in earlier[start + 1 :]:
        visible = scar & observable(observation.bands)
        if visible.sum() < MIN_CLEAR_FRACTION * scar.sum():
            checks.append(PassCheck(observation.acquired_at, "cloudy"))
            continue
        if (dnbr(baseline.bands, observation.bands)[visible] > CONFIG.dnbr_seed).mean() >= ONSET_FRACTION:
            checks.append(PassCheck(observation.acquired_at, "burned"))
            return Onset(after, observation.acquired_at, baseline.acquired_at, scar_ha, checks)
        checks.append(PassCheck(observation.acquired_at, "unburned"))
        after = observation.acquired_at
    return Onset(after, fire.acquired_at, baseline.acquired_at, scar_ha, checks)
