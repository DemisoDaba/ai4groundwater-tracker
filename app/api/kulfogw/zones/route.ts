import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function GET() {
  try {
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

from kulfo.zones import spatial_gw_zones

zones = spatial_gw_zones()

counts = {}

for value in [1, 2, 3, 4, 5]:
    counts[str(value)] = int((zones == value).sum())

total = sum(counts.values())

zone_info = {
    "1": {
        "name": "Very High Depletion",
        "threshold": "< -2"
    },
    "2": {
        "name": "High Depletion",
        "threshold": "-2 to -1"
    },
    "3": {
        "name": "Moderate / Near Reference",
        "threshold": "-1 to +1"
    },
    "4": {
        "name": "High Recharge",
        "threshold": "+1 to +2"
    },
    "5": {
        "name": "Very High Recharge",
        "threshold": "> +2"
    }
}

result = []

for zone_id, info in zone_info.items():
    pixels = counts[zone_id]
    percentage = (pixels / total * 100) if total else 0

    result.append({
        "id": int(zone_id),
        "name": info["name"],
        "threshold": info["threshold"],
        "pixels": pixels,
        "percentage": percentage
    })

print(json.dumps({
    "zones": result,
    "total_pixels": total
}))
`;

    const scriptPath = path.join(
      os.tmpdir(),
      "kulfogw_zones.py"
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
            reject(
              new Error(stderr || "Python process failed.")
            );
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
            : "Unable to load groundwater zones.",
      },
      { status: 500 }
    );
  }
}
