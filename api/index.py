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