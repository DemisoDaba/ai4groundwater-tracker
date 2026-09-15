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
    data_file = (
        Path(__file__).resolve().parent.parent
        / "kulfo"
        / "data"
        / "Kulfo_GW_Anomaly_UNet_30m_PROTOTYPE.tif"
    )

    # The raster is installed with the kulfo package.
    import kulfo.map as kulfo_map

    data_file = Path(kulfo_map.DATA_FILE)

    with rasterio.open(data_file) as src:
        data = src.read(1).astype(float)
        bounds = src.bounds
        nodata = src.nodata
        crs = src.crs
        transform_affine = src.transform
        height, width = data.shape

        if nodata is not None:
            data[data == nodata] = np.nan

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
            "longitude": [
                geographic_bounds[0],
                geographic_bounds[1],
            ],
            "latitude": [
                geographic_bounds[2],
                geographic_bounds[3],
            ],
            "easting": [
                bounds.left,
                bounds.right,
            ],
            "northing": [
                bounds.bottom,
                bounds.top,
            ],
            "height": height,
            "width": width,
            "resolution_x": transform_affine.a,
            "resolution_y": abs(transform_affine.e),
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
