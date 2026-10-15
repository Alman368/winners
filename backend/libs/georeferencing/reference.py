import cv2
import httpx
import numpy as np

from libs.georeferencing.matching import ReferenceImage
from libs.georeferencing.mercator import MercatorBox

WMS_URL = "https://tiles.maps.eox.at/wms"
LAYER = "s2cloudless-2025_3857"
TILE_PX = 1000


def fetch_reference(client: httpx.Client, box: MercatorBox, width_px: int) -> ReferenceImage:
    height_px = round(width_px * (box.north - box.south) / (box.east - box.west))
    metres_per_px = (box.east - box.west) / width_px
    pixels = np.zeros((height_px, width_px), np.uint8)
    for top in range(0, height_px, TILE_PX):
        bottom = min(top + TILE_PX, height_px)
        for left in range(0, width_px, TILE_PX):
            right = min(left + TILE_PX, width_px)
            bbox = (
                box.west + left * metres_per_px,
                box.north - bottom * metres_per_px,
                box.west + right * metres_per_px,
                box.north - top * metres_per_px,
            )
            response = client.get(
                WMS_URL,
                params={
                    "service": "WMS",
                    "version": "1.1.1",
                    "request": "GetMap",
                    "layers": LAYER,
                    "styles": "",
                    "srs": "EPSG:3857",
                    "bbox": ",".join(str(v) for v in bbox),
                    "width": right - left,
                    "height": bottom - top,
                    "format": "image/jpeg",
                },
            )
            response.raise_for_status()
            tile = cv2.imdecode(np.frombuffer(response.content, np.uint8), cv2.IMREAD_GRAYSCALE)
            pixels[top:bottom, left:right] = tile
    return ReferenceImage(pixels=pixels, box=box)
