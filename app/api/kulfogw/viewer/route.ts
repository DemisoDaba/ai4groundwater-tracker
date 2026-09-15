import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const packagePath =
      process.env.KULFO_PACKAGE_PATH ||
      path.join(process.cwd(), "kulfo");

    const rasterPath = path.join(
      packagePath,
      "kulfo",
      "data",
      "Kulfo_GW_Anomaly_UNet_30m_PROTOTYPE.tif"
    );

    const buffer = await readFile(rasterPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/tiff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Kulfo raster.",
      },
      { status: 500 }
    );
  }
}
