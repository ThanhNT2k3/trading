import { NextRequest, NextResponse } from "next/server";
import { fetchCombinedFundamentals } from "@/lib/stocks/fundamentals";
import type { StockFundamentals } from "@/types/stocks";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const MAX_TICKERS = 60;
const CONCURRENCY_LIMIT = 6;
const CACHE_TTL_MS = 15 * 60 * 1000;
const fundamentalsCache = new Map<string, { value: StockFundamentals; expiresAt: number }>();

function parseTickers(value: string | null) {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((ticker) => ticker.trim().toUpperCase())
        .filter((ticker) => /^[A-Z0-9]{2,10}$/.test(ticker)),
    ),
  ).slice(0, MAX_TICKERS);
}

export async function GET(request: NextRequest) {
  const tickers = parseTickers(request.nextUrl.searchParams.get("tickers"));

  if (tickers.length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid tickers provided" },
      { status: 400 },
    );
  }

  const fundamentals: StockFundamentals[] = [];
  const missingTickers: string[] = [];

  for (const ticker of tickers) {
    const cached = fundamentalsCache.get(ticker);
    if (cached && cached.expiresAt > Date.now()) {
      fundamentals.push(cached.value);
    } else {
      missingTickers.push(ticker);
    }
  }

  for (let index = 0; index < missingTickers.length; index += CONCURRENCY_LIMIT) {
    const chunk = missingTickers.slice(index, index + CONCURRENCY_LIMIT);
    const chunkResults = await Promise.all(
      chunk.map((ticker) => fetchCombinedFundamentals(ticker)),
    );
    const validResults = chunkResults.filter((item): item is StockFundamentals => item !== null);
    for (const item of validResults) {
      fundamentalsCache.set(item.ticker, {
        value: item,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      fundamentals.push(item);
    }
  }

  return NextResponse.json(
    {
      success: true,
      fundamentals,
      metadata: {
        requested: tickers.length,
        returned: fundamentals.length,
        cappedAt: MAX_TICKERS,
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      },
    },
  );
}
