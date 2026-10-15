from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy import ndimage

from pipeline.burned_area import SQUARE
from pipeline.config import CONFIG


@dataclass(frozen=True)
class FireCluster:
    xs: NDArray[np.intp]
    ys: NDArray[np.intp]

    @property
    def pixels(self) -> int:
        return int(self.xs.size)

    @property
    def centroid(self) -> tuple[float, float]:
        return float(self.xs.mean()), float(self.ys.mean())

    @property
    def bbox(self) -> tuple[int, int, int, int]:
        return int(self.xs.min()), int(self.ys.min()), int(self.xs.max()) + 1, int(self.ys.max()) + 1

    @property
    def mask(self) -> NDArray[np.bool_]:
        """Cluster pixels inside its own bbox."""
        x0, y0, x1, y1 = self.bbox
        window = np.zeros((y1 - y0, x1 - x0), bool)
        window[self.ys - y0, self.xs - x0] = True
        return window

    @property
    def front_length_px(self) -> float:
        """Extent along the cluster's main axis: a fire front is a long, thin line."""
        if self.pixels < 2:
            return 1.0
        points = np.stack([self.xs, self.ys], axis=1).astype(np.float64)
        centered = points - points.mean(axis=0)
        _, _, axes = np.linalg.svd(centered, full_matrices=False)
        projection = centered @ axes[0]
        return float(projection.max() - projection.min() + 1)


def detect_fires(
    post_hot: NDArray[np.bool_], pre_hot: NDArray[np.bool_], burned: NDArray[np.bool_]
) -> list[FireCluster]:
    """Groups hot pixels into fires and keeps the ones that behave like a wildfire.

    - Persistence: a cluster already hot before the fire is a permanent heat or glint source (industry, roofs, bright soil).
    - Context: a cluster far from any burned area is not a wildfire front (in Madrid-Ávila, the city).
    """
    cluster_radius = max(1, round(CONFIG.fire_cluster_distance_m / 2 / CONFIG.resolution_m))
    grouped = ndimage.binary_dilation(post_hot, structure=SQUARE, iterations=cluster_radius)
    labels, _ = ndimage.label(grouped, structure=SQUARE)
    labels = np.where(post_hot, labels, 0)

    near_burned = ndimage.distance_transform_edt(~burned) * CONFIG.resolution_m <= CONFIG.fire_context_distance_m
    persistent = ndimage.binary_dilation(pre_hot, structure=SQUARE)

    fires: list[FireCluster] = []
    for index, cluster in enumerate(ndimage.find_objects(labels), start=1):
        if cluster is None:
            continue
        member = labels[cluster] == index
        if (persistent[cluster] & member).any() or not (near_burned[cluster] & member).any():
            continue
        ys, xs = np.nonzero(member)
        fires.append(FireCluster(xs + cluster[1].start, ys + cluster[0].start))
    return fires
