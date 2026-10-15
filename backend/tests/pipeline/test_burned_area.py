import numpy as np

from pipeline.burned_area import detect_burned

PIXEL_AREA_HA = 0.04


def test_keeps_burned_land_that_touches_the_image_border() -> None:
    dnbr = np.zeros((200, 200), np.float32)
    dnbr[50:150, 0:80] = 0.5

    burned = detect_burned(dnbr, np.ones_like(dnbr, bool), PIXEL_AREA_HA)

    assert burned[50:150, 0].all()
    assert burned.sum() >= 0.99 * 100 * 80


def test_joins_burned_patches_split_by_one_pixel() -> None:
    dnbr = np.zeros((200, 200), np.float32)
    dnbr[50:150, 50:80] = 0.5
    dnbr[50:150, 81:110] = 0.5

    burned = detect_burned(dnbr, np.ones_like(dnbr, bool), PIXEL_AREA_HA)

    assert burned[60:140, 80].all()
