import { NextResponse } from "next/server";
import { fetchFundMarketData } from "@/lib/portfolio/market-data";

export async function GET() {
  try {
    const { funds, weeklyPlan } = await fetchFundMarketData();

    return NextResponse.json({
      funds,
      weeklyPlan,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cannot load fund NAV data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
