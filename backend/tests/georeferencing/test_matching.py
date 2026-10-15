import cv2
import numpy as np
import pytest

from libs.georeferencing.matching import GeoreferenceError, ReferenceImage, match
from libs.georeferencing.mercator import MercatorBox


def landscape(seed: int, size: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    image = np.zeros((size, size), np.float32)
    for scale in (4, 16, 64):
        noise = rng.random((size // scale, size // scale)).astype(np.float32)
        image += cv2.resize(noise, (size, size), interpolation=cv2.INTER_CUBIC)
    for _ in range(300):
        x, y = rng.integers(0, size, 2)
        w, h = rng.integers(10, 80, 2)
        cv2.rectangle(image, (int(x), int(y)), (int(x + w), int(y + h)), float(rng.random() * 3), -1)
    return cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)


REFERENCE = ReferenceImage(
    pixels=landscape(seed=7, size=2000),
    box=MercatorBox(west=0.0, south=0.0, east=20000.0, north=20000.0),
)


def test_locates_a_zoomed_crop_of_the_reference() -> None:
    crop = REFERENCE.pixels[500:1000, 600:1400]
    query = cv2.resize(crop, (1600, 1000), interpolation=cv2.INTER_CUBIC)

    result = match(query, REFERENCE)

    assert result.box.west == pytest.approx(6000.0, abs=20.0)
    assert result.box.east == pytest.approx(14000.0, abs=20.0)
    assert result.box.north == pytest.approx(15000.0, abs=20.0)
    assert result.box.south == pytest.approx(10000.0, abs=20.0)


def test_rejects_an_image_from_somewhere_else() -> None:
    query = landscape(seed=99, size=1000)

    with pytest.raises(GeoreferenceError):
        match(query, REFERENCE)
