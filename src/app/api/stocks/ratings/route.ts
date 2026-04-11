import { NextRequest, NextResponse } from "next/server";
import { enrichStockRow, filterByLiquidity } from "@/lib/stocks/analytics";
import { calculateTechnicalScore, getTopStocks } from "@/lib/stocks/scoring";
import { fetchTickerRows } from "@/lib/stocks/api";
import { getExchange } from "@/lib/stocks/tickers";
import type { StockRow, TradableExchange } from "@/types/stocks";
import { VN30 } from "@/lib/stocks/tickers";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exchange = searchParams.get("exchange") || "VN30";
    const lookbackDays = parseInt(searchParams.get("lookbackDays") || "360");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Get tickers to analyze
    const tickersToAnalyze = exchange === "VN30" ? VN30 : [];

    if (tickersToAnalyze.length === 0) {
      return NextResponse.json(
        { error: "No tickers found for the selected exchange" },
        { status: 400 },
      );
    }

    // Fetch stock data
    let rows: StockRow[] = [];
    try {
      rows = await fetchTickerRows(
        tickersToAnalyze,
        startDateStr,
        endDateStr,
      );
    } catch (error) {
      console.error("Error fetching ticker rows:", error);
      return NextResponse.json(
        { error: "Failed to fetch stock data" },
        { status: 500 },
      );
    }

    // Enrich and filter data
    const enrichedRows = rows.map((row) => enrichStockRow(row)).filter((row) => !row.error);

    // Calculate technical scores
    const scores = enrichedRows
      .map((row) => calculateTechnicalScore(row))
      .filter((score) => score.score > 0);

    // Get top 20 stocks
    const topStocks = getTopStocks(scores, 20);

    return NextResponse.json({
      success: true,
      ratings: topStocks,
      metadata: {
        totalProcessed: enrichedRows.length,
        totalRated: scores.length,
        timestamp: new Date().toISOString(),
        period: {
          startDate: startDateStr,
          endDate: endDateStr,
        },
      },
    });
  } catch (error) {
    console.error("Error in stock ratings API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
