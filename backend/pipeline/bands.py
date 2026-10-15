from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

REFLECTANCE_SCALE: float = 10_000.0


@dataclass(frozen=True)
class Bands:
    """Sentinel-2 L2A surface reflectance on the working grid."""

    b04: NDArray[np.float32]
    b08: NDArray[np.float32]
    b8a: NDArray[np.float32]
    b11: NDArray[np.float32]
    b12: NDArray[np.float32]
    scl: NDArray[np.uint8]
    valid: NDArray[np.bool_]

    @classmethod
    def from_raster(cls, raster: NDArray[np.uint16]) -> "Bands":
        """Builds the bands from the (band, row, col) raster returned by the evalscripts in `copernicus.py`."""
        reflectance = raster[:5].astype(np.float32) / REFLECTANCE_SCALE
        return cls(*reflectance, scl=raster[5].astype(np.uint8), valid=raster[6] > 0)


@dataclass(frozen=True)
class PreFireComposite:
    bands: Bands
    age_days: NDArray[np.uint16]
    """Days between each pixel's observation and the fire start."""

    @classmethod
    def from_raster(cls, raster: NDArray[np.uint16]) -> "PreFireComposite":
        return cls(Bands.from_raster(raster[:7]), raster[7])

    @property
    def coverage(self) -> float:
        return float(self.bands.valid.mean())
