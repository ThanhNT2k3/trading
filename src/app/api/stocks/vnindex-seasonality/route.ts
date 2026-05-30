import { NextResponse } from "next/server";
import { getVnIndexSeasonality } from "@/lib/stocks/vnindex-seasonality";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET() {
  try {
    const result = await getVnIndexSeasonality();
    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cannot compute VNINDEX seasonality",
      },
      { status: 500 },
    );
  }
}
