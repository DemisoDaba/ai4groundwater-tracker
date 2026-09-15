from pathlib import Path

import numpy as np
import rasterio
from rasterio.warp import transform
from fastapi import FastAPI
from pydantic import BaseModel

from kulfo import spatial_gw_value, spatial_gw_interpret

app = FastAPI()


class LocationRequest(BaseModel):
    latitude: float
    longitude: float


@app.post("/api/kulfogw/location")
def location_query(request: LocationRequest):
    try:
        value = spatial_gw_value(
            request.latitude,
            request.longitude,
        )

        interpretation = spatial_gw_interpret(
            request.latitude,
            request.longitude,
        )

        return {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "anomaly": value,
            "interpretation": interpretation,
        }

    except ValueError as e:
        return {
            "error": str(e)
        }

    except Exception as e:
        return {
            "error": f"KULFO error: {str(e)}"
        }


@app.get("/api/kulfogw/viewer/data")
def viewer_data():
    import kulfo.map as kulfo_map

    data_file = Path(kulfo_map.DATA_FILE)

    with rasterio.open(data_file) as src:
        data = src.read(1).astype(float)

        if src.nodata is not None:
            data[data == src.nodata] = np.nan

        bounds = src.bounds
        crs = src.crs
        height, width = data.shape

        # Pixel-center coordinates in the raster CRS.
        cols = np.arange(width)
        rows = np.arange(height)

        easting = (
            bounds.left
            + (cols + 0.5) * src.transform.a
        )

        northing = (
            bounds.top
            - (rows + 0.5) * abs(src.transform.e)
        )

        # Convert pixel-center coordinates to geographic coordinates.
        longitude, latitude = transform(
            crs,
            "EPSG:4326",
            easting.tolist(),
            [northing[0]] * width,
        )

        # Latitude varies by row; longitude varies by column.
        longitude = np.asarray(longitude)

        _, latitude_by_row = transform(
            crs,
            "EPSG:4326",
            [easting[0]] * height,
            northing.tolist(),
        )

        latitude_by_row = np.asarray(latitude_by_row)

        default_row = height // 2
        default_col = width // 2

        return {
            "gw": [
                [
                    None if np.isnan(value) else float(value)
                    for value in row
                ]
                for row in data
            ],
            "longitude": longitude.tolist(),
            "latitude": latitude_by_row.tolist(),
            "easting": easting.tolist(),
            "northing": northing.tolist(),
            "height": height,
            "width": width,
            "resolution_x": src.transform.a,
            "resolution_y": abs(src.transform.e),
            "crs": str(crs),
            "bounds": {
                "left": bounds.left,
                "right": bounds.right,
                "bottom": bounds.bottom,
                "top": bounds.top,
            },
            "default_row": default_row,
            "default_col": default_col,
        }
