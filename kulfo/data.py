"""Functions for querying Kulfo spatial groundwater data."""

from pathlib import Path
import rasterio
from rasterio.warp import transform

DATA_FILE = Path(__file__).parent / "data" / "Kulfo_GW_Anomaly_UNet_30m_PROTOTYPE.tif"

def value(latitude, longitude):
    """Return the predicted groundwater anomaly at a latitude/longitude."""
    with rasterio.open(DATA_FILE) as src:
        x, y = transform("EPSG:4326", src.crs, [longitude], [latitude])
        row, col = src.index(x[0], y[0])

        if row < 0 or row >= src.height or col < 0 or col >= src.width:
            raise ValueError("Location is outside the Kulfo prediction area.")

        result = src.read(1)[row, col]

        if src.nodata is not None and result == src.nodata:
            return None

        return float(result)
