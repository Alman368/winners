import hashlib
import os
from pathlib import Path

import cv2
import httpx
import numpy as np

RECORDINGS_DIR = Path(__file__).parent / "fixtures" / "http"
JPEG_MAGIC = b"\xff\xd8"


def shrink(content: bytes) -> bytes:
    """Stores map tiles as grayscale, which is all the matcher reads, to keep the recordings small."""
    if not content.startswith(JPEG_MAGIC):
        return content
    gray = cv2.imdecode(np.frombuffer(content, np.uint8), cv2.IMREAD_GRAYSCALE)
    return cv2.imencode(".jpg", gray, [cv2.IMWRITE_JPEG_QUALITY, 85])[1].tobytes()


class ReplayTransport(httpx.BaseTransport):
    """Serves recorded responses; set RECORD_HTTP=1 to record them from the real services."""

    def __init__(self) -> None:
        self.record = os.environ.get("RECORD_HTTP") == "1"
        self.network = httpx.HTTPTransport()

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        path = RECORDINGS_DIR / hashlib.sha256(str(request.url).encode()).hexdigest()
        if self.record:
            response = self.network.handle_request(request)
            response.read()
            assert response.status_code == 200, f"{response.status_code} recording {request.url}"
            RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
            path.write_bytes(shrink(response.content))
        return httpx.Response(200, content=path.read_bytes())
