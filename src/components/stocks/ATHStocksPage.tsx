"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchTickerRows } from "@/lib/stocks/api";
import { enrichStockRow } from "@/lib/stocks/analytics";
import { getTickers } from "@/lib/stocks/tickers";
import ATHStocksTable from "./ATHStocksTable";
import ComponentCard from "@/components/common/ComponentCard";
import * as XLSX from "xlsx";

export default function ATHStocksPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "AT_ATH" | "NEAR_ATH">("ALL");
  const [exchange, setExchange] = useState<"ALL" | "HOSE" | "HNX" | "UPCOM">("ALL");

  // Set default date range (past 2 years)
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const fetchStocks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get tickers for the selected exchange
      const allTickers = getTickers(exchange);
      
      // Limit to first 1600 tickers for performance
      const tickersToFetch = allTickers.slice(0, 1600);

      // Fetch ticker rows
      const rows = await fetchTickerRows(
        tickersToFetch,
        startDate,
        endDate,
        { liquidityMode: "ALL" }
      );

      // Enrich stock rows with technical indicators and ATH calculations
      const enrichedRows = rows.map(enrichStockRow);

      setStocks(enrichedRows);
    } catch (err) {
      console.error("Error fetching stocks:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch stocks");
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, exchange]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const filteredStocks = useMemo(() => {
    if (filterType === "ALL") {
      return stocks.filter((s) => s.athReachedWithin1Year);
    }
    if (filterType === "AT_ATH") {
      return stocks.filter((s) => s.isAtATH);
    }
    if (filterType === "NEAR_ATH") {
      return stocks.filter((s) => {
        if (s.ath === null || s.latestClose === null) return false;
        const diff = (s.ath - s.latestClose) / s.ath;
        return diff >= 0 && diff <= 0.05; // Within 5% of ATH
      });
    }
    return stocks;
  }, [stocks, filterType]);

  const exportToExcel = useCallback(() => {
    if (filteredStocks.length === 0) {
      alert("No data to export");
      return;
    }

    // Prepare data for export
    const exportData = filteredStocks.map((stock) => ({
      Ticker: stock.ticker,
      "Latest Close": stock.latestClose,
      "ATH": stock.ath,
      "ATH Date": stock.athDate,
      "Distance from ATH (%)": stock.ath !== null && stock.latestClose !== null
        ? ((stock.ath - stock.latestClose) / stock.ath * 100).toFixed(2)
        : "N/A",
      "ATH Reached Within 1 Year": stock.athReachedWithin1Year ? "Yes" : "No",
      "At ATH Now": stock.isAtATH ? "Yes" : "No",
      Exchange: stock.exchange,
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ATH Stocks");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `ATH_Stocks_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  }, [filteredStocks]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          All-Time High (ATH) Stocks
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Showing stocks that reached their all-time high within the past year. Period:{" "}
          <span className="font-semibold">{startDate}</span> to{" "}
          <span className="font-semibold">{endDate}</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Exchange
            </label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">All Exchanges</option>
              <option value="HOSE">HOSE</option>
              <option value="HNX">HNX</option>
              <option value="UPCOM">UPCOM</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">All ATH Within 1Y</option>
              <option value="AT_ATH">At ATH Now</option>
              <option value="NEAR_ATH">Near ATH (Within 5%)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={fetchStocks}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 font-medium"
            >
              {isLoading ? "Loading..." : "Refresh Data"}
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredStocks.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Export to Excel
            </button>
          </div>
        </div>
      </div>

      <div>
        <ComponentCard title={`ATH Stocks (${filteredStocks.length})`} desc="">
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4 text-error-800 dark:bg-error-900/20 dark:border-error-800 dark:text-error-300">
              Error: {error}
            </div>
          )}

          {!error && (
            <ATHStocksTable
              stocks={filteredStocks}
              isLoading={isLoading}
              filterType={filterType}
            />
          )}
        </ComponentCard>
      </div>

      {filteredStocks.length > 0 && (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-success-50 dark:bg-success-900/20 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">At ATH Now</p>
              <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                {filteredStocks.filter((s) => s.isAtATH).length}
              </p>
            </div>

            <div className="rounded-lg bg-warning-50 dark:bg-warning-900/20 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Near ATH (Within 5%)</p>
              <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">
                {
                  filteredStocks.filter((s) => {
                    if (s.ath === null || s.latestClose === null) return false;
                    const diff = (s.ath - s.latestClose) / s.ath;
                    return diff >= 0 && diff <= 0.05;
                  }).length
                }
              </p>
            </div>

            <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total in Selection</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {filteredStocks.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
