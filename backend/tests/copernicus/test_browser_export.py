from datetime import date

import pytest

from app.copernicus.browser_export import MultiDayExportError, capture_date


def test_reads_the_capture_date_from_a_single_day_export_name() -> None:
    name = "2026-08-08-00_00_2026-08-08-23_59_Sentinel-2_L2A_True_color.jpg"

    assert capture_date(name) == date(2026, 8, 8)


def test_rejects_an_export_mosaicking_several_days() -> None:
    with pytest.raises(MultiDayExportError):
        capture_date("2026-07-20-00_00_2026-07-26-23_59_Sentinel-2_L2A_True_color.jpg")
