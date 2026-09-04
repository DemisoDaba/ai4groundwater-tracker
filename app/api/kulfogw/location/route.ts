import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return NextResponse.json(
        { error: "Latitude and longitude are required." },
        { status: 400 }
      );
    }

    const python = process.env.KULFO_PYTHON_PATH || "python";
    const packagePath = process.env.KULFO_PACKAGE_PATH;

    if (!packagePath) {
      return NextResponse.json(
        { error: "KULFO_PACKAGE_PATH is not configured." },
        { status: 500 }
      );
    }

    const script = `
import sys
import json

sys.path.insert(0, ${JSON.stringify(packagePath)})

from kulfo.spatial import spatial_gw_value, spatial_gw_interpret

latitude = ${latitude}
longitude = ${longitude}

value = spatial_gw_value(latitude, longitude)
interpretation = spatial_gw_interpret(latitude, longitude)

print(json.dumps({
    "latitude": latitude,
    "longitude": longitude,
    "value": value,
    "interpretation": interpretation
}))
`;

    const scriptPath = path.join(
      os.tmpdir(),
      "kulfogw_location_query.py"
    );

    await writeFile(scriptPath, script, "utf8");

    try {
      const result = await new Promise<string>((resolve, reject) => {
        const child = spawn(python, [scriptPath]);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(stderr || "Python process failed."));
          } else {
            resolve(stdout.trim());
          }
        });
      });

      return NextResponse.json(JSON.parse(result));
    } finally {
      await unlink(scriptPath).catch(() => {});
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to query groundwater data.",
      },
      { status: 500 }
    );
  }
}

