
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const python = process.env.KULFO_PYTHON_PATH || "python";

  const packagePath =
    process.env.KULFO_PACKAGE_PATH ||
    path.join(process.cwd(), "kulfo");

  const scriptPath = path.join(
    os.tmpdir(),
    `kulfogw_viewer_data_${process.pid}.py`
  );

  const script = `
import sys
import json
import traceback
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
], dtype=np.float64)

northing = np.array([
    xy(transform, r, 0, offset="center")[1]
    for r in rows
], dtype=np.float64)

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

longitude = np.asarray(longitude, dtype=np.float64)
latitude = np.asarray(latitude, dtype=np.float64)

valid_pixels = np.argwhere(np.isfinite(gw))

if len(valid_pixels) == 0:
    raise ValueError(
        "The raster contains no valid groundwater pixels."
    )

r0, c0 = valid_pixels[len(valid_pixels) // 2]

# Convert NaN and infinite values to JSON null.
gw_json = np.where(np.isfinite(gw), gw, None).tolist()

data = {
    "gw": gw_json,
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

print(json.dumps(data, allow_nan=False))
`;

  try {
    await writeFile(scriptPath, script, "utf8");

    const result = await new Promise<string>(
      (resolve, reject) => {
        const child = spawn(python, [scriptPath], {
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let settled = false;

        const finishError = (error: Error) => {
          if (settled) return;
          settled = true;
          reject(error);
        };

        child.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString();

          if (stdout.length > 50 * 1024 * 1024) {
            child.kill();
            finishError(
              new Error("Viewer output exceeded the 50 MB limit.")
            );
          }
        });

        child.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString();

          // Avoid retaining unlimited diagnostic output.
          if (stderr.length > 1024 * 1024) {
            stderr = stderr.slice(-1024 * 1024);
          }
        });

        child.on("error", (error) => {
          finishError(
            new Error(
              `Unable to start Python executable "${python}". ` +
              `Check KULFO_PYTHON_PATH and the deployment runtime. ` +
              error.message
            )
          );
        });

        child.on("close", (code) => {
          if (settled) return;

          if (code !== 0) {
            finishError(
              new Error(
                stderr.trim() ||
                stdout.trim() ||
                `Python exited with code ${code}.`
              )
            );
            return;
          }

          settled = true;
          resolve(stdout.trim());
        });
      }
    );

    // Verify that the child produced valid JSON before returning it.
    const data = JSON.parse(result);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("KulfoGW viewer API failed:", error);

    return NextResponse.json(
      {
        error: "Unable to load KulfoGW viewer data.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  } finally {
    await unlink(scriptPath).catch(() => {});
  }
}
