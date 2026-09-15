import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return NextResponse.json(
        {
          error: "Latitude and longitude must be valid numbers.",
        },
        { status: 400 }
      );
    }

    const python =
      process.env.KULFO_PYTHON_PATH || "python";

    const packagePath =
      process.env.KULFO_PACKAGE_PATH ||
      path.join(process.cwd(), "kulfo");

    const script = `
import sys
import json

sys.path.insert(0, ${JSON.stringify(packagePath)})

from kulfo.spatial import spatial_gw_value

latitude = ${latitude}
longitude = ${longitude}

try:
    value = spatial_gw_value(latitude, longitude)

    if value is None:
        interpretation = (
            "No groundwater prediction available at this location."
        )

    elif value > 0:
        if value <= 1:
            interpretation = (
                f"Anomaly value: +{value:.4f}\\\\n"
                "Interpretation: Positive groundwater-storage anomaly, "
                "indicating groundwater storage is above the reference "
                "condition at this location. The value is within the "
                "-1 to +1 near-reference range."
            )
        elif value <= 2:
            interpretation = (
                f"Anomaly value: +{value:.4f}\\\\n"
                "Interpretation: Positive groundwater-storage anomaly, "
                "indicating higher groundwater storage at this location. "
                "The value falls within the +1 to +2 higher-storage range."
            )
        else:
            interpretation = (
                f"Anomaly value: +{value:.4f}\\\\n"
                "Interpretation: Strong positive groundwater-storage "
                "anomaly, indicating substantially higher groundwater "
                "storage at this location."
            )

    elif value < 0:
        if value >= -1:
            interpretation = (
                f"Anomaly value: {value:.4f}\\\\n"
                "Interpretation: Negative groundwater-storage anomaly, "
                "indicating groundwater storage is below the reference "
                "condition at this location. The value is within the "
                "-1 to +1 near-reference range."
            )
        elif value >= -2:
            interpretation = (
                f"Anomaly value: {value:.4f}\\\\n"
                "Interpretation: Negative groundwater-storage anomaly, "
                "indicating lower groundwater storage at this location. "
                "The value falls within the -2 to -1 depletion range."
            )
        else:
            interpretation = (
                f"Anomaly value: {value:.4f}\\\\n"
                "Interpretation: Strong negative groundwater-storage "
                "anomaly, indicating substantially lower groundwater "
                "storage at this location."
            )

    else:
        interpretation = (
            "Anomaly value: 0.0000\\\\n"
            "Interpretation: Groundwater-storage anomaly is approximately "
            "zero, indicating a condition close to the reference condition."
        )

    print(json.dumps({
        "latitude": latitude,
        "longitude": longitude,
        "anomaly": value,
        "interpretation": interpretation
    }))

except Exception as e:
    print(json.dumps({
        "error": str(e)
    }))
    sys.exit(1)
`;

    const scriptPath = path.join(
      os.tmpdir(),
      "kulfogw_location.py"
    );

    await writeFile(
      scriptPath,
      script,
      "utf8"
    );

    try {
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
                    "KULFO location query failed."
                )
              );
            } else {
              resolve(stdout.trim());
            }
          });
        }
      );

      const data = JSON.parse(result);

      if (data.error) {
        return NextResponse.json(
          data,
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } finally {
      await unlink(scriptPath).catch(() => {});
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to query KulfoGW location.",
      },
      { status: 500 }
    );
  }
}
