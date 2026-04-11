"use client";

import React, { useMemo } from "react";
import { useStocksCached } from "@/hooks/useStocksCached";
import { StockMarketData } from "@/lib/stocks/cafef-api";
import ComponentCard from "@/components/common/ComponentCard";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

interface StocksListOptimizedProps {
  /**
   * Liquidity mode for filtering
   */
  liquidityMode?: "ALL" | "MIN_TRADE_VALUE" | "RANGE";
  minTradeValue?: number;
  maxTradeValue?: number;
  /**
   * Search term to filter stocks
   */
  searchTerm?: string;
  /**
   * Max rows to display (pagination)
   */
  maxRows?: number;
}

/**
 * Format number for display
 */
function numberDisplay(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
  if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(2) + "K";
  return value.toFixed(2);
}

/**
 * Get color class for price change
 */
function priceChangeClass(value: number | null): string {
  if (value === null || value === 0) return "text-gray-600 dark:text-gray-300";
  if (value > 0) return "text-green-600 dark:text-green-400 font-semibold";
  return "text-red-600 dark:text-red-400 font-semibold";
}

/**
 * Optimized stock list component using bulk API with caching
 * Loads ALL stocks in single API call, applies liquidity filtering client-side
 *
 * Benefits:
 * - 1 API request instead of multiple individual requests
 * - 5-minute in-memory cache reduces API load
 * - Instant filtering without additional API calls
 * - Better performance for large stock lists
 */
export default function StocksListOptimized({
  liquidityMode = "MIN_TRADE_VALUE",
  minTradeValue = 1_000_000_000, // 1 tỷ VNĐ
  maxTradeValue = undefined,
  searchTerm = "",
  maxRows = 20000,
}: StocksListOptimizedProps) {
  const { filteredStocks, isLoading, error, cacheStatus, refresh, clearCache } = useStocksCached({
    liquidityMode,
    minTradeValue,
    maxTradeValue,
    refreshIntervalMs: 5 * 60 * 1000, // Auto-refresh every 5 min
  });

  /**
   * Additional search filtering
   */
  const searchFiltered = useMemo(() => {
    if (!searchTerm.trim()) return filteredStocks;

    const query = searchTerm.toUpperCase();
    return filteredStocks.filter((stock) => stock.symbol.includes(query));
  }, [filteredStocks, searchTerm]);

  /**
   * Limit to max rows for pagination
   */
  const displayStocks = useMemo(() => {
    return searchFiltered.slice(0, maxRows);
  }, [searchFiltered, maxRows]);

  if (error) {
    return (
      <ComponentCard title="Stock List (Optimized)">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
          ❌ Error loading stocks: {error.message}
          <button
            onClick={refresh}
            className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Stock List (Optimized Bulk Load)">
      <div className="space-y-4">
        {/* Cache Status & Controls */}
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded dark:bg-blue-900/20 dark:border-blue-800">
          <div className="text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-300">
              📊 Cache Status:{" "}
              <span className={cacheStatus.isValid ? "text-green-600" : "text-yellow-600"}>
                {cacheStatus.isValid ? "✅ Valid" : "⚠️ Expired"}
              </span>
            </p>
            <p className="text-blue-700 dark:text-blue-400 text-xs mt-1">
              {cacheStatus.stockCount} stocks cached • Filters:{" "}
              <strong>
                {liquidityMode === "MIN_TRADE_VALUE"
                  ? `Min ${(minTradeValue || 0) / 1e9}B VNĐ`
                  : liquidityMode === "RANGE"
                    ? `${(minTradeValue || 0) / 1e9}B - ${(maxTradeValue || 0) / 1e9}B VNĐ`
                    : "No filter"}
              </strong>{" "}
              • Showing: <strong>{displayStocks.length}</strong> stocks
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {isLoading ? "🔄 Refreshing..." : "🔄 Refresh"}
            </button>
            <button
              onClick={clearCache}
              className="px-3 py-1.5 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && displayStocks.length === 0 && (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin">
              <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-600 rounded-full"></div>
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading stock data from bulk API...</p>
          </div>
        )}

        {/* Stock Table */}
        {displayStocks.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="font-semibold">Symbol</TableCell>
                  <TableCell className="text-right">Price</TableCell>
                  <TableCell className="text-right">Change</TableCell>
                  <TableCell className="text-right">Change %</TableCell>
                  <TableCell className="text-right">Volume</TableCell>
                  <TableCell className="text-right">Value (VNĐ)</TableCell>
                  <TableCell className="text-right">P/E</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayStocks.map((stock) => (
                  <TableRow key={stock.symbol}>
                    <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                      {stock.symbol}
                    </TableCell>
                    <TableCell className="text-right">{numberDisplay(stock.currentPrice)}</TableCell>
                    <TableCell className={`text-right ${priceChangeClass(stock.changePrice)}`}>
                      {stock.changePrice > 0 ? "+" : ""}
                      {numberDisplay(stock.changePrice)}
                    </TableCell>
                    <TableCell className={`text-right ${priceChangeClass(stock.changePricePercent)}`}>
                      {stock.changePricePercent > 0 ? "+" : ""}
                      {stock.changePricePercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">
                      {numberDisplay(stock.volume)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-gray-900 dark:text-gray-100">
                      {numberDisplay(stock.value)}
                    </TableCell>
                    <TableCell className="text-right">{stock.pe > 0 ? stock.pe.toFixed(2) : "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayStocks.length === 0 && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No stocks found matching your filters
          </div>
        )}

        {/* Performance Metrics */}
        <div className="mt-4 flex gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div>
            ⚡ <strong>Single API Call</strong> - Fetches ALL market data at once
          </div>
          <div>
            💾 <strong>5-Min Cache</strong> - Instant filtering on refetch
          </div>
          <div>
            ✨ <strong>Client-Side Filter</strong> - Zero API overhead for liquidity changes
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}

