import cv2
import httpx
import numpy as np
import pytest

from libs.georeferencing.mercator import MercatorBox
from libs.georeferencing.reference import fetch_reference

BOX = MercatorBox(west=-700000.0, south=4500000.0, east=-600000.0, north=4550000.0)


def gradient_wms(request: httpx.Request) -> httpx.Response:
    params = request.url.params
    if params["layers"] != "s2cloudless-2025_3857" or params["srs"] != "EPSG:3857":
        return httpx.Response(400)
    west, _, east, _ = (float(v) for v in params["bbox"].split(","))
    width, height = int(params["width"]), int(params["height"])
    centres = west + (np.arange(width) + 0.5) * (east - west) / width
    row = np.uint8(np.round(255 * (centres - BOX.west) / (BOX.east - BOX.west)))
    tile = np.tile(row, (height, 1))
    return httpx.Response(200, content=cv2.imencode(".png", tile)[1].tobytes())


def test_stitches_tiles_into_one_seamless_mosaic() -> None:
    client = httpx.Client(transport=httpx.MockTransport(gradient_wms))

    reference = fetch_reference(client, BOX, width_px=2550)

    assert reference.box == BOX
    assert reference.pixels.shape == (1275, 2550)
    assert reference.pixels[700, [0, 1274, 1275, 2549]].tolist() == pytest.approx([0, 127, 128, 255], abs=1)
    assert np.abs(np.diff(reference.pixels.astype(int), axis=1)).max() <= 1
