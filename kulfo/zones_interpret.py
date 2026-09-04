"""Clickable interpretation of five groundwater anomaly zones."""

from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import rasterio
from rasterio.warp import transform
from matplotlib.ticker import FuncFormatter
from matplotlib.colors import ListedColormap, BoundaryNorm


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


def classify_zone(value):
    """Return the groundwater zone and interpretation."""

    if value < -2:
        return (
            "Very High Depletion",
            "Very high groundwater depletion compared with the reference condition",
        )

    if value < -1:
        return (
            "High Depletion",
            "High groundwater depletion compared with the reference condition",
        )

    if value <= 1:
        return (
            "Moderate / Near Reference",
            "Groundwater condition is close to the reference condition",
        )

    if value <= 2:
        return (
            "High Recharge",
            "High groundwater storage compared with the reference condition",
        )

    return (
        "Very High Recharge",
        "Very high groundwater storage compared with the reference condition",
    )


def zones_interpret_map():
    """Display clickable five-zone groundwater interpretation map."""

    with rasterio.open(DATA_FILE) as src:
        data = src.read(1).astype(float)

        bounds = src.bounds
        crs = src.crs
        nodata = src.nodata

        height = src.height
        width = src.width

        transform_raster = src.transform

    if nodata is not None:
        data[data == nodata] = np.nan

    # ---------------------------------------------------------
    # Classify pixels
    # ---------------------------------------------------------

    zones = np.full(data.shape, np.nan)

    zones[data < -2] = 1
    zones[(data >= -2) & (data < -1)] = 2
    zones[(data >= -1) & (data <= 1)] = 3
    zones[(data > 1) & (data <= 2)] = 4
    zones[data > 2] = 5

    # ---------------------------------------------------------
    # Geographic extent
    # ---------------------------------------------------------

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

    # ---------------------------------------------------------
    # Map
    # ---------------------------------------------------------

    cmap = ListedColormap([
        "darkred",
        "red",
        "lightgray",
        "lightgreen",
        "darkgreen",
    ])

    norm = BoundaryNorm(
        [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
        cmap.N,
    )

    fig, ax = plt.subplots(figsize=(11, 9))

    ax.imshow(
        zones,
        extent=geographic_bounds,
        origin="upper",
        cmap=cmap,
        norm=norm,
        interpolation="nearest",
        aspect="equal",
    )

    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")

    ax.set_title(
        "Kulfo Groundwater Anomaly — Click a Pixel for Interpretation"
    )

    # ---------------------------------------------------------
    # DMS coordinates
    # ---------------------------------------------------------

    ax.xaxis.set_major_formatter(
        FuncFormatter(
            lambda x, pos: decimal_to_dms(
                x,
                latitude=False,
            )
        )
    )

    ax.yaxis.set_major_formatter(
        FuncFormatter(
            lambda y, pos: decimal_to_dms(
                y,
                latitude=True,
            )
        )
    )

    plt.setp(
        ax.get_yticklabels(),
        rotation=90,
        va="center",
        ha="center",
    )

    # ---------------------------------------------------------
    # Click event
    # ---------------------------------------------------------

    def onclick(event):
        """Interpret the clicked groundwater pixel."""

        if (
            event.inaxes != ax
            or event.xdata is None
            or event.ydata is None
        ):
            return

        longitude = event.xdata
        latitude = event.ydata

        # Convert geographic coordinate to raster coordinate
        x, y = transform(
            "EPSG:4326",
            crs,
            [longitude],
            [latitude],
        )

        x = x[0]
        y = y[0]

        # Find pixel
        col = int(
            (x - bounds.left)
            / (bounds.right - bounds.left)
            * width
        )

        row = int(
            (bounds.top - y)
            / (bounds.top - bounds.bottom)
            * height
        )

        if (
            row < 0
            or row >= height
            or col < 0
            or col >= width
        ):
            return

        value = data[row, col]

        if np.isnan(value):
            print("No groundwater prediction at this location.")
            return

        zone, interpretation = classify_zone(value)

        latitude_dms = decimal_to_dms(
            latitude,
            latitude=True,
        )

        longitude_dms = decimal_to_dms(
            longitude,
            latitude=False,
        )

        print()
        print("========================================")
        print("GROUNDWATER PIXEL INTERPRETATION")
        print("========================================")
        print(f"Latitude: {latitude_dms}")
        print(f"Longitude: {longitude_dms}")
        print(f"Groundwater anomaly: {value:.4f}")
        print(f"Zone: {zone}")
        print(f"Interpretation: {interpretation}")
        print("Reference condition: April 2023 (wet season)")
        print("========================================")

        # Mark clicked pixel
        ax.scatter(
            longitude,
            latitude,
            marker="s",
            s=80,
            facecolors="none",
            edgecolors="black",
            linewidths=2,
        )

        ax.set_title(
            f"{zone} | GW anomaly: {value:.4f}"
        )

        fig.canvas.draw_idle()

    fig.canvas.mpl_connect(
        "button_press_event",
        onclick,
    )

    plt.tight_layout()
    plt.show()


# Convenient package name
spatial_gw_zones_interpret = zones_interpret_map
