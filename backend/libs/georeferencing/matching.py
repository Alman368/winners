import math
from dataclasses import dataclass

import cv2
import numpy as np

from libs.georeferencing.mercator import MercatorBox

QUERY_WIDTH_PX = 1250
MAX_FEATURES = 8000
RATIO_TEST = 0.75
RANSAC_THRESHOLD_PX = 3.0
MIN_INLIERS = 12
MAX_ROTATION_DEG = 1.0


class GeoreferenceError(Exception):
    pass


@dataclass(frozen=True)
class ReferenceImage:
    pixels: np.ndarray
    box: MercatorBox


@dataclass(frozen=True)
class Georeference:
    box: MercatorBox
    inliers: int


def match(query: np.ndarray, reference: ReferenceImage) -> Georeference:
    height = round(query.shape[0] * QUERY_WIDTH_PX / query.shape[1])
    query = cv2.resize(query, (QUERY_WIDTH_PX, height), interpolation=cv2.INTER_AREA)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    sift = cv2.SIFT_create(MAX_FEATURES)
    query_points, query_descriptors = sift.detectAndCompute(clahe.apply(query), None)
    ref_points, ref_descriptors = sift.detectAndCompute(clahe.apply(reference.pixels), None)

    pairs = cv2.BFMatcher().knnMatch(query_descriptors, ref_descriptors, k=2)
    good = [best for best, second in pairs if best.distance < RATIO_TEST * second.distance]
    if len(good) < MIN_INLIERS:
        raise GeoreferenceError(f"only {len(good)} candidate matches")

    source = np.float32([query_points[m.queryIdx].pt for m in good])
    target = np.float32([ref_points[m.trainIdx].pt for m in good])
    transform, inlier_mask = cv2.estimateAffinePartial2D(
        source, target, method=cv2.RANSAC, ransacReprojThreshold=RANSAC_THRESHOLD_PX
    )
    inliers = int(inlier_mask.sum())
    rotation = math.degrees(math.atan2(transform[1, 0], transform[0, 0]))
    if inliers < MIN_INLIERS or abs(rotation) > MAX_ROTATION_DEG:
        raise GeoreferenceError(f"{inliers} inliers, rotation {rotation:.2f} deg")

    corners = np.float32([[0, 0], [QUERY_WIDTH_PX, height]]).reshape(-1, 1, 2)
    (left, top), (right, bottom) = cv2.transform(corners, transform).reshape(-1, 2)
    ref_height, ref_width = reference.pixels.shape
    metres_per_px_x = (reference.box.east - reference.box.west) / ref_width
    metres_per_px_y = (reference.box.north - reference.box.south) / ref_height
    box = MercatorBox(
        west=reference.box.west + left * metres_per_px_x,
        south=reference.box.north - bottom * metres_per_px_y,
        east=reference.box.west + right * metres_per_px_x,
        north=reference.box.north - top * metres_per_px_y,
    )
    return Georeference(box=box, inliers=inliers)
