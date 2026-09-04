import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import os from "os";

export async function GET() {
  const python = process.env.KULFO_PYTHON_PATH || "python";
  const packagePath =
      process.env.KULFO_PACKAGE_PATH || path.join(process.cwd(), "kulfo");

  if (!packagePath) {
    return NextResponse.json(
      {
        error: "KULFO_PACKAGE_PATH is not configured."
      },
      { status: 500 }
    );
  }

  const script = `
import sys

sys.path.insert(0, ${JSON.stringify(packagePath)})

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt

from kulfo.map import spatial_gw_map

output = ${JSON.stringify(
    path.join(os.tmpdir(), "kulfogw_package_map.png")
)}

def capture_show(*args, **kwargs):
    pass

plt.show = capture_show

try:
    spatial_gw_map()

    figure = plt.gcf()

    figure.savefig(
        output,
        dpi=150,
        bbox_inches="tight"
    )

    plt.close(figure)

    print("SUCCESS")

except Exception as e:
    print("ERROR:" + str(e))
    raise
`;

  const scriptPath = path.join(
    os.tmpdir(),
    "kulfogw_package_map.py"
  );

  const imagePath = path.join(
    os.tmpdir(),
    "kulfogw_package_map.png"
  );

  try {
    await writeFile(
      scriptPath,
      script,
      "utf8"
    );

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        python,
        [scriptPath],
        {
          windowsHide: true
        }
      );

      let stdout = "";
      let stderr = "";

      const timeout = setTimeout(() => {
        child.kill();
        reject(
          new Error(
            "KulfoGW map generation timed out after 60 seconds."
          )
        );
      }, 60000);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(
            new Error(
              stderr ||
                stdout ||
                "KulfoGW spatial groundwater map failed."
            )
          );
          return;
        }

        resolve();
      });
    });

    const image = await readFile(imagePath);

    return new NextResponse(image, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load KulfoGW groundwater map."
      },
      { status: 500 }
    );
  } finally {
    await unlink(scriptPath).catch(() => {});
    await unlink(imagePath).catch(() => {});
  }
}
