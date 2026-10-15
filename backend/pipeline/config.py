from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    resolution_m: float = 20.0
    """Native resolution of B8A, B11 and B12, the bands every index uses."""

    pre_fire_window_days: int = 30
    """Days before the fire start searched for the pre-fire composite. Older images add seasonal drying noise to dNBR."""

    cloud_scl_classes: tuple[int, ...] = (0, 1, 3, 8, 9, 10)
    """SCL classes that make an observation unusable: no data, saturated, cloud shadow, medium/high cloud, cirrus."""

    excluded_scl_classes: tuple[int, ...] = (0, 1, 3, 6, 8, 9, 10)
    """SCL classes excluded from burn detection: the cloud classes plus water, where NBR is meaningless."""

    dnbr_seed: float = 0.27
    """Moderate-low severity threshold (Key & Benson, 2006). Pixels above it are burned with high confidence."""

    dnbr_grow: float = 0.10
    """Low severity lower bound (Key & Benson, 2006). Pixels above it are burned only if connected to a seed."""

    severity_breaks: tuple[float, float, float] = (0.27, 0.44, 0.66)
    """USGS dNBR class limits between low, moderate-low, moderate-high and high severity (Key & Benson, 2006)."""

    min_burned_area_ha: float = 5.0
    """Smaller burned components are discarded as noise (harvests, single pixels)."""

    min_hole_area_ha: float = 1.0
    """Smaller unburned holes are filled: they are pixel noise, not real unburned islands."""

    burned_closing_m: float = 40.0
    """Closing radius that joins burned patches separated by one or two pixels. Adds 3-4 % of area and brings the
    perimeter closer to EFFIS (Madrid-Ávila: 1144 km to 733 km). Bigger closings fill bays of healthy vegetation."""

    perimeter_min_polygon_ha: float = 50.0
    """Only burned polygons from this size count for the fire perimeter; smaller ones still count for the area."""

    severity_map_smoothing_m: float = 100.0
    """Median filter window applied to dNBR before drawing the severity map. Per-pixel classes alternate and draw
    thousands of specks (La Mierla: 19 600 pieces, 8 MB). Class areas are still measured without smoothing."""

    severity_map_min_patch_ha: float = 1.0
    """Severity map pieces below this size are not drawn."""

    fire_min_b12: float = 0.5
    """Minimum SWIR 2.2 µm reflectance of an active fire pixel. Burned ash stays around 0.24 (measured in Niebla)."""

    fire_min_b12_b8a_ratio: float = 2.5
    """Minimum B12/B8A ratio of an active fire pixel. Measured: ash 1.5-1.8, bright bare soil 1.0-1.3, fire front 4.6-9.1."""

    fire_cluster_distance_m: float = 100.0
    """Hot pixels closer than this belong to the same fire."""

    fire_context_distance_m: float = 500.0
    """A fire is kept only if it is this close to the burned area. Generous because smoke can hide burned land between scar and front."""

    simplify_tolerance_m: float = 20.0
    """Douglas-Peucker tolerance for polygons, one pixel. Avoids the staircase effect that inflates raster perimeters."""

    tile_size_px: int = 1000
    """Maximum tile side per Process API request. Bigger tiles returned 502 errors and truncated responses."""

    download_concurrency: int = 4
    download_retries: int = 6


CONFIG: Config = Config()
