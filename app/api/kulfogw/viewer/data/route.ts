import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const backendUrl = process.env.KULFO_BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "KULFO_BACKEND_URL environment variable is not configured." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/+$/, "")}/api/kulfogw/viewer/data`,
      {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(25000),
      }
    );

    const body = await response.text();

    if (!response.ok) {
      console.error("KulfoGW backend error:", response.status, body);

      return NextResponse.json(
        {
          error: "The groundwater backend returned an error.",
          status: response.status,
          details: body.slice(0, 500),
        },
        { status: 502 }
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(body);
    } catch {
      console.error("KulfoGW backend returned non-JSON:", body.slice(0, 500));

      return NextResponse.json(
        { error: "The groundwater backend did not return valid JSON." },
        { status: 502 }
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("KulfoGW viewer request failed:", error);

    return NextResponse.json(
      {
        error: "Unable to connect to the groundwater backend.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 }
    );
  }
}
