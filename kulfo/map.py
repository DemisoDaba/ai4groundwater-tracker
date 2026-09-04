"""Interactive spatial groundwater map."""

from pathlib import Path

import matplotlib.pyplot as plt
import rasterio
from rasterio.warp import transform
from matplotlib.ticker import FuncFormatter


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

    return f"{degrees}°{minutes:02d}'{seconds:04.1f}\"{direction}"


def spatial_gw_map():
    """Display the interactive 30 m groundwater map."""

    with rasterio.open(DATA_FILE) as src:
        data = src.read(1).astype(float)
        bounds = src.bounds
        nodata = src.nodata
        crs = src.crs

        # Convert raster extent from UTM to latitude/longitude
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

    if nodata is not None:
        data[data == nodata] = float("nan")

    geographic_bounds = [
        min(lons),
        max(lons),
        min(lats),
        max(lats),
    ]

    fig, ax = plt.subplots(figsize=(10, 8))

    image = ax.imshow(
        data,
        extent=geographic_bounds,
        origin="upper",
    )

    plt.colorbar(
        image,
        ax=ax,
        label="Groundwater anomaly",
    )

    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    ax.set_title("Kulfo Groundwater Anomaly — 30 m")

    # Longitude: DMS
    ax.xaxis.set_major_formatter(
        FuncFormatter(
            lambda x, pos: decimal_to_dms(
                x,
                latitude=False,
            )
        )
    )

    # Latitude: DMS
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

    def onclick(event):
        """Return groundwater information for clicked location."""

        if (
            event.inaxes != ax
            or event.xdata is None
            or event.ydata is None
        ):
            return

        longitude = event.xdata
        latitude = event.ydata

        # Convert clicked geographic coordinates
        # to raster coordinates
        x, y = transform(
            "EPSG:4326",
            crs,
            [longitude],
            [latitude],
        )

        x = x[0]
        y = y[0]

        row, col = src_index(
            data,
            x,
            y,
            bounds,
        )

        if (
            row < 0
            or row >= data.shape[0]
            or col < 0
            or col >= data.shape[1]
        ):
            return

        value = data[row, col]

        if value != value:
            print("No groundwater prediction at this location.")
            return

        latitude_dms = decimal_to_dms(
            latitude,
            latitude=True,
        )

        longitude_dms = decimal_to_dms(
            longitude,
            latitude=False,
        )

        if value > 0:
            condition = (
                "More groundwater storage than the reference condition"
            )
            reference = "April 2023 (wet season)"

        elif value < 0:
            condition = (
                "Less groundwater storage than the reference condition"
            )
            reference = "January 2023 (dry season)"

        else:
            condition = "Close to the reference condition"
            reference = "April 2023 (wet season)"

        print()
        print(f"Latitude: {latitude_dms}")
        print(f"Longitude: {longitude_dms}")
        print(f"Groundwater anomaly: {value:.4f}")
        print(f"Groundwater condition: {condition}")
        print(f"Reference condition: {reference}")

        ax.set_title(
            f"{latitude_dms}, {longitude_dms} | "
            f"GW anomaly: {value:.4f}"
        )

        fig.canvas.draw_idle()

    fig.canvas.mpl_connect(
        "button_press_event",
        onclick,
    )

    plt.tight_layout()
    plt.show()


def src_index(data, x, y, bounds):
    """Convert raster coordinates to row and column."""

    col = int(
        (x - bounds.left)
        / (bounds.right - bounds.left)
        * data.shape[1]
    )

    row = int(
        (bounds.top - y)
        / (bounds.top - bounds.bottom)
        * data.shape[0]
    )

    return row, col


map = spatial_gw_map
