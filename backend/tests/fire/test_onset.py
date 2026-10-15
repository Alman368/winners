from datetime import datetime, timezone

import numpy as np
import pytest
from affine import Affine

from libs.copernicus.process import REFLECTANCE_BANDS, BandScene
from libs.fire.onset import Observation, ScarNotFoundError, estimate_onset

SCAR = (slice(20, 60), slice(20, 60))  # 1600 px = 64 ha at 20 m
FIELD = (slice(80, 90), slice(80, 90))  # 100 px = 4 ha at 20 m
CLOUD_HIGH_PROBABILITY = 9


def scene(burned: tuple[tuple[slice, slice], ...] = (), cloud: tuple[tuple[slice, slice], ...] = ()) -> BandScene:
    reflectance = {band: np.zeros((100, 100), np.float32) for band in REFLECTANCE_BANDS}
    reflectance["B08"][:] = 0.30
    reflectance["B12"][:] = 0.10
    for region in burned:
        reflectance["B08"][region] = 0.15
        reflectance["B12"][region] = 0.25
    scl = np.full((100, 100), 4, np.uint8)
    for region in cloud:
        scl[region] = CLOUD_HIGH_PROBABILITY
    return BandScene(
        reflectance=reflectance,
        scl=scl,
        data_mask=np.ones((100, 100), bool),
        epsg=32629,
        transform=Affine(20, 0, 690000, 0, -20, 4150000),
        metres_per_px=20.0,
        geotiff=b"",
    )


def at(month: int, day: int) -> datetime:
    return datetime(2026, month, day, 11, 6, tzinfo=timezone.utc)


def test_brackets_the_start_between_the_last_clean_pass_and_the_first_burned_one() -> None:
    earlier = [
        Observation(at(7, 20), scene()),
        Observation(at(7, 25), scene()),
        Observation(at(7, 30), scene()),
        Observation(at(8, 4), scene(burned=(SCAR,))),
    ]

    onset = estimate_onset(earlier, Observation(at(8, 8), scene(burned=(SCAR,))))

    assert (onset.after, onset.before) == (at(7, 30), at(8, 4))


def test_skips_passes_where_clouds_hide_the_scar() -> None:
    earlier = [
        Observation(at(7, 20), scene()),
        Observation(at(7, 30), scene()),
        Observation(at(8, 4), scene(cloud=(SCAR,))),
    ]

    onset = estimate_onset(earlier, Observation(at(8, 8), scene(burned=(SCAR,))))

    assert (onset.after, onset.before) == (at(7, 30), at(8, 8))
    assert [check.status for check in onset.checks] == ["unburned", "cloudy"]


def test_ignores_small_changes_outside_the_fire_scar() -> None:
    earlier = [
        Observation(at(7, 20), scene()),
        Observation(at(7, 25), scene(burned=(FIELD,))),
        Observation(at(7, 30), scene(burned=(FIELD,))),
    ]

    onset = estimate_onset(earlier, Observation(at(8, 8), scene(burned=(SCAR, FIELD))))

    assert (onset.after, onset.before) == (at(7, 30), at(8, 8))


def test_fails_when_the_fire_day_shows_no_scar() -> None:
    earlier = [Observation(at(7, 20), scene())]

    with pytest.raises(ScarNotFoundError):
        estimate_onset(earlier, Observation(at(8, 8), scene(burned=(FIELD,))))
