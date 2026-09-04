"""Kulfo groundwater package."""

from .spatial import spatial_gw_value, spatial_gw_interpret
from .map import spatial_gw_map
from .zones import spatial_gw_zones, spatial_gw_zones_map
from .zones_interpret import spatial_gw_zones_interpret
from .hotspots import (
    spatial_gw_hotspots,
    spatial_gw_hotspot_interpret,
)

__version__ = "0.1.0"
