import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Latitude and longitude are required." },
        { status: 400 }
      );
    }

    const python = process.env.KULFO_PYTHON_PATH || "python";
    const packagePath = process.env.KULFO_PACKAGE_PATH || path.join(process.cwd(), "kulfo");

    // ✅ FIXED: Python script now handles errors properly
    const script = `
import sys
import json
import traceback

sys.path.insert(0, ${JSON.stringify(packagePath)})

try:
    from kulfo.spatial import spatial_gw_value, spatial_gw_interpret

    latitude = ${latitude}
    longitude = ${longitude}

    value = spatial_gw_value(latitude, longitude)
    interpretation = spatial_gw_interpret(latitude, longitude)

    print(json.dumps({
        "success": True,
        "latitude": latitude,
        "longitude": longitude,
        "value": value,
        "interpretation": interpretation
    }))
except ValueError as e:
    # ✅ Catch validation errors and return as JSON
    error_msg = str(e)
    print(json.dumps({
        "success": False,
        "error": error_msg,
        "error_type": "ValueError"
    }))
except Exception as e:
    # ✅ Catch any other errors
    print(json.dumps({
        "success": False,
        "error": str(e),
        "error_type": type(e).__name__,
        "traceback": traceback.format_exc()
    }))
`;

    const scriptPath = path.join(os.tmpdir(), `kulfogw_location_query_${Date.now()}.py`);

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

        child.on("error", (error) => {
          reject(new Error(`Failed to start Python: ${error.message}`));
        });

        child.on("close", (code) => {
          // ✅ Clean up temp file
          unlink(scriptPath).catch(() => {});

          if (code !== 0) {
            // ✅ Try to parse stderr as JSON first
            try {
              const errorData = JSON.parse(stderr.trim());
              reject(new Error(errorData.error || "Python process failed."));
            } catch {
              // If stderr isn't JSON, use it as the error message
              const errorMsg = stderr.trim() || stdout.trim() || "Python process failed with unknown error.";
              reject(new Error(errorMsg));
            }
          } else {
            resolve(stdout.trim());
          }
        });
      });

      // ✅ Parse the Python output
      const data = JSON.parse(result);

      // ✅ If Python returned an error, format it properly
      if (data.success === false) {
        return NextResponse.json(
          {
            error: data.error || "Unknown error from Python script.",
            ...(data.error_type && { error_type: data.error_type })
          },
          { status: 400 }
        );
      }

      // ✅ Success - return the groundwater data
      return NextResponse.json({
        latitude: data.latitude,
        longitude: data.longitude,
        value: data.value,
        interpretation: data.interpretation
      });

    } catch (pythonError) {
      // ✅ Clean up temp file if it still exists
      await unlink(scriptPath).catch(() => {});

      const errorMessage = pythonError instanceof Error ? pythonError.message : "Python execution failed.";

      // ✅ Check if it's the "outside bounds" error
      if (errorMessage.includes("outside the Kulfo prediction area")) {
        // Try to extract valid bounds from the error message
        const validLatMatch = errorMessage.match(/Valid latitude: ([\d.]+) to ([\d.]+)/);
        const validLonMatch = errorMessage.match(/Valid longitude: ([\d.]+) to ([\d.]+)/);

        return NextResponse.json(
          {
            error: errorMessage,
            valid_bounds: {
              latitude: validLatMatch ? {
                min: parseFloat(validLatMatch[1]),
                max: parseFloat(validLatMatch[2])
              } : null,
              longitude: validLonMatch ? {
                min: parseFloat(validLonMatch[1]),
                max: parseFloat(validLonMatch[2])
              } : null
            }
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to query groundwater data.",
      },
      { status: 500 }
    );
  }
}