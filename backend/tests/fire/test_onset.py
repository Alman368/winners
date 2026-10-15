from datetime import datetime, timezone

import numpy as np
import pytest

from libs.fire.onset import Observation, ScarNotFoundError, estimate_onset
from pipeline.bands import Bands

PIXEL_AREA_HA = 0.04  # 20 m pixels
SCAR = (slice(20, 60), slice(20, 60))  # 1600 px = 64 ha
FIELD = (slice(80, 90), slice(80, 90))  # 100 px = 4 ha, below the minimum burned area
CLOUD_HIGH_PROBABILITY = 9
VEGETATION = 4


def bands(burned: tuple[tuple[slice, slice], ...] = (), cloud: tuple[tuple[slice, slice], ...] = ()) -> Bands:
    b8a = np.full((100, 100), 0.30, np.float32)
    b12 = np.full((100, 100), 0.10, np.float32)
    for region in burned:
        b8a[region] = 0.15
        b12[region] = 0.25
    scl = np.full((100, 100), VEGETATION, np.uint8)
    for region in cloud:
        scl[region] = CLOUD_HIGH_PROBABILITY
    zeros = np.zeros((100, 100), np.float32)
    return Bands(b04=zeros, b08=zeros, b8a=b8a, b11=zeros, b12=b12, scl=scl, valid=np.ones((100, 100), bool))


def at(month: int, day: int) -> datetime:
    return datetime(2026, month, day, 11, 6, tzinfo=timezone.utc)


def test_brackets_the_start_between_the_last_clean_pass_and_the_first_burned_one() -> None:
    earlier = [
        Observation(at(7, 20), bands()),
        Observation(at(7, 25), bands()),
        Observation(at(7, 30), bands()),
        Observation(at(8, 4), bands(burned=(SCAR,))),
    ]

    onset = estimate_onset(earlier, Observation(at(8, 8), bands(burned=(SCAR,))), PIXEL_AREA_HA)

    assert (onset.after, onset.before) == (at(7, 30), at(8, 4))
    assert onset.scar_ha == pytest.approx(64, abs=0.5)


def test_skips_passes_where_clouds_hide_the_scar() -> None:
    earlier = [
        Observation(at(7, 20), bands()),
        Observation(at(7, 30), bands()),
        Observation(at(8, 4), bands(cloud=(SCAR,))),
    ]

    onset = estimate_onset(earlier, Observation(at(8, 8), bands(burned=(SCAR,))), PIXEL_AREA_HA)

    assert (onset.after, onset.before) == (at(7, 30), at(8, 8))
    assert [check.status for check in onset.checks] == ["unburned", "cloudy"]


def test_ignores_small_changes_outside_the_fire_scar() -> None:
    earlier = [
        Observation(at(7, 20), bands()),
        Observation(at(7, 25), bands(burned=(FIELD,))),
        Observation(at(7, 30), bands(burned=(FIELD,))),
    ]

    onset = estimate_onset(earlier, Observation(at(8, 8), bands(burned=(SCAR, FIELD))), PIXEL_AREA_HA)

    assert (onset.after, onset.before) == (at(7, 30), at(8, 8))


def test_fails_when_the_fire_day_shows_no_scar() -> None:
    earlier = [Observation(at(7, 20), bands())]

    with pytest.raises(ScarNotFoundError):
        estimate_onset(earlier, Observation(at(8, 8), bands(burned=(FIELD,))), PIXEL_AREA_HA)
