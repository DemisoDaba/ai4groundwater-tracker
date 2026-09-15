import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function GET() {
  const python =
    process.env.KULFO_PYTHON_PATH || "python";

  const packagePath =
    process.env.KULFO_PACKAGE_PATH ||
    path.join(process.cwd(), "kulfo");

  const script = `
import sys
import json
import numpy as np
import rasterio
from rasterio.transform import xy
from pyproj import Transformer

sys.path.insert(0, ${JSON.stringify(packagePath)})

from kulfo.spatial import DATA_FILE

with rasterio.open(DATA_FILE) as src:

    gw = src.read(1).astype(np.float32)

    transform = src.transform
    crs = src.crs
    bounds = src.bounds
    nodata = src.nodata

    height = src.height
    width = src.width

    resolution_x = src.res[0]
    resolution_y = src.res[1]

if nodata is not None:
    gw[gw == nodata] = np.nan

gw[~np.isfinite(gw)] = np.nan

cols = np.arange(width)
rows = np.arange(height)

easting = np.array([
    xy(transform, 0, c, offset="center")[0]
    for c in cols
])

northing = np.array([
    xy(transform, r, 0, offset="center")[1]
    for r in rows
])

if northing[0] > northing[-1]:
    northing = northing[::-1]
    gw = gw[::-1, :]

transformer = Transformer.from_crs(
    crs,
    "EPSG:4326",
    always_xy=True
)

longitude, _ = transformer.transform(
    easting,
    np.full_like(easting, northing.mean())
)

_, latitude = transformer.transform(
    np.full_like(northing, easting.mean()),
    northing
)

longitude = np.asarray(longitude)
latitude = np.asarray(latitude)

valid_pixels = np.argwhere(np.isfinite(gw))

if len(valid_pixels) == 0:
    raise ValueError(
        "The raster contains no valid groundwater pixels."
    )

r0, c0 = valid_pixels[len(valid_pixels) // 2]

data = {
    "gw": np.where(np.isfinite(gw), gw, None).tolist(),
    "longitude": longitude.tolist(),
    "latitude": latitude.tolist(),
    "easting": easting.tolist(),
    "northing": northing.tolist(),
    "height": int(height),
    "width": int(width),
    "resolution_x": float(resolution_x),
    "resolution_y": float(resolution_y),
    "crs": str(crs),
    "bounds": {
        "left": float(bounds.left),
        "right": float(bounds.right),
        "bottom": float(bounds.bottom),
        "top": float(bounds.top)
    },
    "default_row": int(r0),
    "default_col": int(c0)
}

print(json.dumps(data))
`;

  const scriptPath = path.join(
    os.tmpdir(),
    "kulfogw_viewer_data.py"
  );

  try {
    await writeFile(
      scriptPath,
      script,
      "utf8"
    );

    const result = await new Promise<string>(
      (resolve, reject) => {
        const child = spawn(
          python,
          [scriptPath],
          {
            windowsHide: true,
          }
        );

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("error", reject);

        child.on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(
                stderr ||
                  stdout ||
                  "Unable to load Kulfo viewer data."
              )
            );
          } else {
            resolve(stdout.trim());
          }
        });
      }
    );

    return new NextResponse(
      result,
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            "public, max-age=3600",
        },
      }
    );

  } catch (error) {

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Kulfo viewer data.",
      },
      {
        status: 500,
      }
    );

  } finally {

    await unlink(
      scriptPath
    ).catch(() => {});

  }
}
