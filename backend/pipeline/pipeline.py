import asyncio
from datetime import timedelta
from typing import Any

import numpy as np
from affine import Affine
from numpy.typing import NDArray
from scipy import ndimage
from shapely.geometry import LinearRing, MultiPolygon, mapping

from pipeline import copernicus
from pipeline.active_fire import FireCluster, detect_fires
from pipeline.bands import Bands, PreFireComposite
from pipeline.burned_area import detect_burned, severity_masks
from pipeline.config import CONFIG
from pipeline.grid import Grid, lonlat_to_image_pixel
from pipeline.indices import assessable, assessable_through_smoke, dnbr, dnbr2, hot_pixels
from pipeline.models import (
    ActiveFire,
    BurnedArea,
    BurnedPolygon,
    FireAnalysis,
    Point,
    Ring,
    SceneInfo,
    SceneInput,
    SeverityClass,
    SmokeArea,
)
from pipeline.smoke import burned_under_smoke, detect_smoke
from pipeline.vectorize import area_ha, exterior_perimeter_km, mask_to_multipolygon


def _ring(ring: LinearRing, scene: SceneInput) -> Ring:
    lonlat = [(round(lon, 6), round(lat, 6)) for lon, lat in ring.coords]
    pixel = [lonlat_to_image_pixel(lon, lat, scene.bbox, scene.image_size) for lon, lat in lonlat]
    return Ring(lonlat=lonlat, pixel=[(round(x, 1), round(y, 1)) for x, y in pixel])


def _point(x: float, y: float, grid: Grid, scene: SceneInput) -> Point:
    lon, lat = grid.pixel_to_lonlat(x, y)
    px, py = lonlat_to_image_pixel(lon, lat, scene.bbox, scene.image_size)
    return Point(lonlat=(round(lon, 6), round(lat, 6)), pixel=(round(px, 1), round(py, 1)))


def _active_fire(index: int, cluster: FireCluster, grid: Grid, scene: SceneInput) -> ActiveFire:
    x0, y0, x1, y1 = cluster.bbox
    geometry = mask_to_multipolygon(cluster.mask, grid.transform * Affine.translation(x0, y0))
    top_left = _point(x0, y0, grid, scene).pixel
    bottom_right = _point(x1, y1, grid, scene).pixel
    return ActiveFire(
        id=index,
        centroid=_point(*cluster.centroid, grid, scene),
        bbox_pixel=(*top_left, *bottom_right),
        pixels=cluster.pixels,
        area_ha=round(cluster.pixels * grid.pixel_area_ha, 2),
        front_length_km=round(cluster.front_length_px * CONFIG.resolution_m / 1000, 2),
        geometry=mapping(geometry),
    )


def _severity(change: NDArray[np.float32], burned_mask: NDArray[np.bool_], grid: Grid) -> list[SeverityClass]:
    """Class areas from the per-pixel dNBR; class geometries from a smoothed dNBR so the map shows patches, not specks."""
    window_px = round(CONFIG.severity_map_smoothing_m / CONFIG.resolution_m)
    smoothed = severity_masks(ndimage.median_filter(change, size=window_px), burned_mask)
    min_pixels = CONFIG.map_min_patch_ha / grid.pixel_area_ha
    return [
        SeverityClass(
            name=name,
            area_ha=round(float(mask.sum() * grid.pixel_area_ha), 1),
            geometry=mapping(mask_to_multipolygon(smoothed[name], grid.transform, min_pixels)),
        )
        for name, mask in severity_masks(change, burned_mask).items()
    ]


def _geojson(burned: MultiPolygon, burned_area: BurnedArea, smoke: SmokeArea, fires: list[ActiveFire]) -> dict[str, Any]:
    features: list[dict[str, Any]] = [
        {
            "type": "Feature",
            "geometry": mapping(burned),
            "properties": {
                "kind": "burned_area",
                "area_ha": burned_area.area_ha,
                "perimeter_km": burned_area.perimeter_km,
                "under_smoke_ha": burned_area.under_smoke_ha,
                "severity_ha": {severity.name: severity.area_ha for severity in burned_area.severity},
            },
        },
        {"type": "Feature", "geometry": smoke.geometry, "properties": {"kind": "smoke", "area_ha": smoke.area_ha}},
    ]
    features += [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": fire.centroid.lonlat},
            "properties": {"kind": "active_fire", **fire.model_dump(exclude={"centroid", "bbox_pixel", "geometry"})},
        }
        for fire in fires
    ]
    return {"type": "FeatureCollection", "features": features}


async def analyze(scene: SceneInput) -> FireAnalysis:
    """Downloads both images, then runs the CPU-bound detection in a thread so the server keeps answering."""
    grid = Grid.for_bbox(scene.bbox)
    post, pre = await asyncio.gather(
        copernicus.fetch_post_fire(grid, scene.acquisition_date),
        copernicus.fetch_pre_fire(grid, scene.fire_start),
    )
    return await asyncio.to_thread(_detect, scene, grid, post, pre)


def _detect(scene: SceneInput, grid: Grid, post: Bands, pre: PreFireComposite) -> FireAnalysis:
    valid = assessable(pre.bands, post)
    change = dnbr(pre.bands, post)
    visible_burned = detect_burned(change, valid, grid.pixel_area_ha)
    smoke_mask = detect_smoke(pre.bands, post, visible_burned, assessable_through_smoke(pre.bands, post))
    hidden_burned = burned_under_smoke(dnbr2(pre.bands, post), smoke_mask, visible_burned)
    burned_mask = visible_burned | hidden_burned
    clusters = detect_fires(hot_pixels(post), hot_pixels(pre.bands), burned_mask)

    burned = mask_to_multipolygon(burned_mask, grid.transform)
    burned_area = BurnedArea(
        polygons=[
            BurnedPolygon(exterior=_ring(polygon.exterior, scene), holes=[_ring(hole, scene) for hole in polygon.interiors])
            for polygon in burned.geoms
        ],
        area_ha=round(area_ha(burned), 1),
        perimeter_km=round(exterior_perimeter_km(burned), 1),
        under_smoke_ha=round(float(hidden_burned.sum() * grid.pixel_area_ha), 1),
        severity=_severity(change, burned_mask, grid),
    )
    fires = [_active_fire(index, cluster, grid, scene) for index, cluster in enumerate(clusters, start=1)]
    smoke = SmokeArea(
        area_ha=round(float(smoke_mask.sum() * grid.pixel_area_ha), 1),
        geometry=mapping(mask_to_multipolygon(smoke_mask, grid.transform, CONFIG.map_min_patch_ha / grid.pixel_area_ha)),
    )

    return FireAnalysis(
        scene=SceneInfo(
            acquisition_date=scene.acquisition_date,
            pre_fire_window=(
                scene.fire_start - timedelta(days=CONFIG.pre_fire_window_days),
                scene.fire_start - timedelta(days=1),
            ),
            pre_fire_coverage=round(pre.coverage, 3),
            pre_fire_median_age_days=float(np.median(pre.age_days[pre.bands.valid])),
            bbox=scene.bbox,
            image_size=scene.image_size,
        ),
        burned_area=burned_area,
        smoke=smoke,
        not_assessable_ha=round(float((~valid & ~smoke_mask).sum() * grid.pixel_area_ha), 1),
        active_fires=fires,
        active_front_km=round(sum(fire.front_length_km for fire in fires), 1),
        geojson=_geojson(burned, burned_area, smoke, fires),
    )
