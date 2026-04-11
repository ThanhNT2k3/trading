import { useEffect, useState, useCallback } from "react";
import {
  fetchAllStockDataBulk,
  getStockCacheStatus,
  clearStockDataCache,
  StockMarketData,
} from "@/lib/stocks/cafef-api";

interface UseStocksCachedOptions {
  /**
   * Liquidity filter mode
   * - ALL: No filtering
   * - MIN_TRADE_VALUE: Only stocks with value >= minTradeValue
   * - RANGE: Only stocks with value between minTradeValue and maxTradeValue
   */
  liquidityMode?: "ALL" | "MIN_TRADE_VALUE" | "RANGE";
  minTradeValue?: number | null;
  maxTradeValue?: number | null;
  /**
   * Auto-refresh interval in milliseconds (0 = no auto-refresh)
   */
  refreshIntervalMs?: number;
}

interface UseStocksCachedReturn {
  stocks: StockMarketData[];
  filteredStocks: StockMarketData[];
  isLoading: boolean;
  error: Error | null;
  cacheStatus: {
    isCached: boolean;
    stockCount: number;
    isValid: boolean;
  };
  refresh: () => Promise<void>;
  clearCache: () => void;
}

/**
 * Hook to fetch and cache stock data using bulk API
 * Applies liquidity filtering to optimize performance
 *
 * Usage:
 * ```tsx
 * const { filteredStocks, isLoading, refresh } = useStocksCached({
 *   liquidityMode: "MIN_TRADE_VALUE",
 *   minTradeValue: 1_000_000_000, // 1 tỷ VNĐ
 *   refreshIntervalMs: 5 * 60 * 1000, // Refresh every 5 min
 * });
 * ```
 */
export function useStocksCached({
  liquidityMode = "ALL",
  minTradeValue = null,
  maxTradeValue = null,
  refreshIntervalMs = 0,
}: UseStocksCachedOptions = {}): UseStocksCachedReturn {
  const [stocks, setStocks] = useState<StockMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cacheInfo, setCacheInfo] = useState({
    isCached: false,
    stockCount: 0,
    isValid: false,
  });

  /**
   * Fetch all stocks from bulk API
   */
  const fetchStocks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.time("📊 fetchAllStockDataBulk");
      const stockMap = await fetchAllStockDataBulk();
      console.timeEnd("📊 fetchAllStockDataBulk");

      const allStocks = Array.from(stockMap.values());
      setStocks(allStocks);

      // Update cache status
      const status = getStockCacheStatus();
      setCacheInfo({
        isCached: status.isCached,
        stockCount: status.stockCount,
        isValid: status.isValid,
      });

      console.log(`✅ ${allStocks.length} stocks loaded from bulk API`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error("❌ Error fetching stocks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Apply liquidity filtering to stocks
   */
  const filteredStocks = stocks.filter((stock) => {
    if (liquidityMode === "ALL") return true;

    const value = stock.value;

    if (liquidityMode === "MIN_TRADE_VALUE") {
      return minTradeValue === null || value >= minTradeValue;
    }

    if (liquidityMode === "RANGE") {
      const hasMin = minTradeValue === null || value >= minTradeValue;
      const hasMax = maxTradeValue === null || value <= maxTradeValue;
      return hasMin && hasMax;
    }

    return true;
  });

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  /**
   * Auto-refresh if interval is set
   */
  useEffect(() => {
    if (refreshIntervalMs <= 0) return;

    console.log(`🔄 Auto-refresh enabled every ${refreshIntervalMs}ms`);
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing stock cache...");
      fetchStocks();
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [refreshIntervalMs, fetchStocks]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    console.log("🔄 Manual refresh triggered");
    await fetchStocks();
  }, [fetchStocks]);

  /**
   * Clear cache
   */
  const handleClearCache = useCallback(() => {
    clearStockDataCache();
    setStocks([]);
    setCacheInfo({ isCached: false, stockCount: 0, isValid: false });
    console.log("🗑️ Cache cleared");
  }, []);

  return {
    stocks,
    filteredStocks,
    isLoading,
    error,
    cacheStatus: cacheInfo,
    refresh,
    clearCache: handleClearCache,
  };
}

/**
 * Helper to get single stock from cache
 */
export function useStockFromCache(ticker: string) {
  const { stocks } = useStocksCached();
  return stocks.find((s) => s.symbol === ticker.toUpperCase()) || null;
}

/**
 * Helper to get multiple stocks from cache
 */
export function useStocksFromCache(tickers: string[]) {
  const { stocks } = useStocksCached();
  const tickerSet = new Set(tickers.map((t) => t.toUpperCase()));
  return stocks.filter((s) => tickerSet.has(s.symbol));
}
