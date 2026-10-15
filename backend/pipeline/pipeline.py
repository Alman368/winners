import asyncio
from datetime import timedelta
from typing import Any

import numpy as np
from shapely.geometry import LinearRing, MultiPolygon, mapping

from pipeline import copernicus
from pipeline.active_fire import FireCluster, detect_fires
from pipeline.burned_area import detect_burned, severity_ha
from pipeline.config import CONFIG
from pipeline.grid import Grid, lonlat_to_image_pixel
from pipeline.indices import assessable, dnbr, hot_pixels
from pipeline.models import (
    ActiveFire,
    BurnedArea,
    BurnedPolygon,
    FireAnalysis,
    Point,
    Ring,
    SceneInfo,
    SceneInput,
)
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
    top_left = _point(x0, y0, grid, scene).pixel
    bottom_right = _point(x1, y1, grid, scene).pixel
    return ActiveFire(
        id=index,
        centroid=_point(*cluster.centroid, grid, scene),
        bbox_pixel=(*top_left, *bottom_right),
        pixels=cluster.pixels,
        area_ha=round(cluster.pixels * grid.pixel_area_ha, 2),
        front_length_km=round(cluster.front_length_px * CONFIG.resolution_m / 1000, 2),
    )


def _geojson(burned: MultiPolygon, burned_area: BurnedArea, fires: list[ActiveFire]) -> dict[str, Any]:
    features: list[dict[str, Any]] = [
        {
            "type": "Feature",
            "geometry": mapping(burned),
            "properties": {
                "kind": "burned_area",
                "area_ha": burned_area.area_ha,
                "perimeter_km": burned_area.perimeter_km,
                "severity_ha": burned_area.severity_ha,
            },
        }
    ]
    features += [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": fire.centroid.lonlat},
            "properties": {"kind": "active_fire", **fire.model_dump(exclude={"centroid", "bbox_pixel"})},
        }
        for fire in fires
    ]
    return {"type": "FeatureCollection", "features": features}


async def analyze(scene: SceneInput) -> FireAnalysis:
    grid = Grid.for_bbox(scene.bbox)
    post, pre = await asyncio.gather(
        copernicus.fetch_post_fire(grid, scene.acquisition_date),
        copernicus.fetch_pre_fire(grid, scene.fire_start),
    )

    valid = assessable(pre.bands, post)
    change = dnbr(pre.bands, post)
    burned_mask = detect_burned(change, valid, grid.pixel_area_ha)
    clusters = detect_fires(hot_pixels(post), hot_pixels(pre.bands), burned_mask)

    burned = mask_to_multipolygon(burned_mask, grid)
    burned_area = BurnedArea(
        polygons=[
            BurnedPolygon(exterior=_ring(polygon.exterior, scene), holes=[_ring(hole, scene) for hole in polygon.interiors])
            for polygon in burned.geoms
        ],
        area_ha=round(area_ha(burned), 1),
        perimeter_km=round(exterior_perimeter_km(burned), 1),
        severity_ha=severity_ha(change, burned_mask, grid.pixel_area_ha),
    )
    fires = [_active_fire(index, cluster, grid, scene) for index, cluster in enumerate(clusters, start=1)]

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
        not_assessable_ha=round(float((~valid).sum() * grid.pixel_area_ha), 1),
        active_fires=fires,
        active_front_km=round(sum(fire.front_length_km for fire in fires), 1),
        geojson=_geojson(burned, burned_area, fires),
    )
