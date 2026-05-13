import { NextRequest, NextResponse } from "next/server";
import { fetchStockPrices } from "@/lib/portfolio/market-data";

export async function GET(request: NextRequest) {
  try {
    const symbols = (request.nextUrl.searchParams.get("symbols") ?? "")
      .split(",")
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);

    if (symbols.length === 0) {
      return NextResponse.json({ prices: [], updatedAt: new Date().toISOString() });
    }

    const prices = await fetchStockPrices(symbols);

    return NextResponse.json({
      prices,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cannot load stock prices",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
