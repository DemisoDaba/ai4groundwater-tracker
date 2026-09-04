"""Five-class spatial groundwater anomaly zones."""

from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import rasterio
from rasterio.warp import transform
from matplotlib.ticker import FuncFormatter
from matplotlib.colors import ListedColormap
from matplotlib.patches import Patch


DATA_FILE = (
    Path(__file__).parent
    / "data"
    / "Kulfo_GW_Anomaly_UNet_30m_PROTOTYPE.tif"
)


def decimal_to_dms(value, latitude=True):
    """Convert decimal degrees to DMS."""
    direction = "N" if value >= 0 else "S"

    if not latitude:
        direction = "E" if value >= 0 else "W"

    value = abs(value)

    degrees = int(value)
    minutes_total = (value - degrees) * 60
    minutes = int(minutes_total)
    seconds = (minutes_total - minutes) * 60

    return f'{degrees}°{minutes:02d}\'{seconds:04.1f}"{direction}'


def spatial_gw_zones():
    """Classify groundwater anomaly into five spatial zones."""

    with rasterio.open(DATA_FILE) as src:
        data = src.read(1).astype(float)
        nodata = src.nodata

    if nodata is not None:
        data[data == nodata] = np.nan

    zones = np.full(data.shape, np.nan)

    # 1 = Very High Depletion
    zones[data < -2] = 1

    # 2 = High Depletion
    zones[(data >= -2) & (data < -1)] = 2

    # 3 = Moderate / Near Reference
    zones[(data >= -1) & (data <= 1)] = 3

    # 4 = High Recharge
    zones[(data > 1) & (data <= 2)] = 4

    # 5 = Very High Recharge
    zones[data > 2] = 5

    return zones


def spatial_gw_zones_map():
    """Display five groundwater anomaly zones as 30 m square pixels."""

    with rasterio.open(DATA_FILE) as src:
        data = src.read(1).astype(float)
        bounds = src.bounds
        crs = src.crs
        nodata = src.nodata

        height = src.height
        width = src.width

    if nodata is not None:
        data[data == nodata] = np.nan

    # Five classes
    zones = np.full(data.shape, np.nan)

    zones[data < -2] = 1
    zones[(data >= -2) & (data < -1)] = 2
    zones[(data >= -1) & (data <= 1)] = 3
    zones[(data > 1) & (data <= 2)] = 4
    zones[data > 2] = 5

    # Convert raster corners from UTM to geographic coordinates
    xs = [
        bounds.left,
        bounds.right,
        bounds.right,
        bounds.left,
    ]

    ys = [
        bounds.bottom,
        bounds.bottom,
        bounds.top,
        bounds.top,
    ]

    lons, lats = transform(
        crs,
        "EPSG:4326",
        xs,
        ys,
    )

    geographic_bounds = [
        min(lons),
        max(lons),
        min(lats),
        max(lats),
    ]

    # Five-class colormap
    cmap = ListedColormap([
        "darkred",
        "red",
        "lightgray",
        "lightgreen",
        "darkgreen",
    ])

    fig, ax = plt.subplots(figsize=(11, 9))

    # Draw every 30 m pixel as a square
    ax.imshow(
        zones,
        extent=geographic_bounds,
        origin="upper",
        cmap=cmap,
        vmin=1,
        vmax=5,
        interpolation="nearest",
        aspect="equal",
    )

    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")

    ax.set_title(
        "Kulfo Groundwater Anomaly — Five Spatial Zones (30 m)"
    )

    # Longitude DMS
    ax.xaxis.set_major_formatter(
        FuncFormatter(
            lambda x, pos: decimal_to_dms(
                x,
                latitude=False,
            )
        )
    )

    # Latitude DMS
    ax.yaxis.set_major_formatter(
        FuncFormatter(
            lambda y, pos: decimal_to_dms(
                y,
                latitude=True,
            )
        )
    )

    # Vertical latitude labels
    plt.setp(
        ax.get_yticklabels(),
        rotation=90,
        va="center",
        ha="center",
    )

    # Legend
    legend_elements = [
        Patch(
            facecolor="darkred",
            label="Very High Depletion (< -2)",
        ),
        Patch(
            facecolor="red",
            label="High Depletion (-2 to -1)",
        ),
        Patch(
            facecolor="lightgray",
            label="Moderate / Near Reference (-1 to +1)",
        ),
        Patch(
            facecolor="lightgreen",
            label="High Recharge (+1 to +2)",
        ),
        Patch(
            facecolor="darkgreen",
            label="Very High Recharge (> +2)",
        ),
    ]

    ax.legend(
        handles=legend_elements,
        loc="lower right",
        frameon=True,
        title="Groundwater anomaly zones",
    )

    plt.tight_layout()
    plt.show()


# Optional short alias
zones_map = spatial_gw_zones_map
