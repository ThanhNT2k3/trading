"use client";

import React, { useEffect, useMemo, useState } from "react";
import MarketBreadthPanel from "@/components/stocks/MarketBreadthPanel";
import MarketOverviewCards from "@/components/stocks/MarketOverviewCards";
import StockFilters from "@/components/stocks/StockFilters";
import StockSummaryCards from "@/components/stocks/StockSummaryCards";
import StockTable from "@/components/stocks/StockTable";
import StockLineChart from "@/components/stocks/StockLineChart";
import StockTechnicalAnalysis from "@/components/stocks/StockTechnicalAnalysis";
import ATHStocksTable from "@/components/stocks/ATHStocksTable";
import ForeignInvestorHistoryStacked from "@/components/stocks/ForeignInvestorHistoryStacked";
import ProprietaryTradingHistoryStacked from "@/components/stocks/ProprietaryTradingHistoryStacked";
import Top5StockersHorizontalBar from "@/components/stocks/Top5StockersHorizontalBar";
import { fetchTickerRow, fetchTickerRows, fetchVixSnapshot } from "@/lib/stocks/api";
import {
  buildDailyAggregateRows,
  computeBreadthMetrics,
  computeMarketOverview,
  computePowerMetrics,
  computeVolumeMomentum,
  enrichStockRow,
} from "@/lib/stocks/analytics";
import { getTickers } from "@/lib/stocks/tickers";
import { StockRow, StocksFilterState, VixSnapshot } from "@/types/stocks";

const MAX_FETCH_TICKERS = 1600;
const DEFAULT_MIN_TRADE_VALUE = "1000000000";

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setFullYear(end.getFullYear() - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function StocksDashboard() {
  const defaults = getDefaultDateRange();
  const [filters, setFilters] = useState<StocksFilterState>({
    exchange: "ALL",
    startDate: defaults.startDate,
    endDate: defaults.endDate,
    search: "",
    liquidityMode: "MIN_TRADE_VALUE",
    minTradeValue: DEFAULT_MIN_TRADE_VALUE,
    maxTradeValue: "",
  });
  const [rawRows, setRawRows] = useState<StockRow[]>([]);
  const [vnIndexRow, setVnIndexRow] = useState<StockRow | null>(null);
  const [vixSnapshot, setVixSnapshot] = useState<VixSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string>("ACB");

  const exchangeTickers = useMemo(() => getTickers(filters.exchange), [filters.exchange]);
  const filteredTickers = useMemo(() => {
    const query = filters.search.trim().toUpperCase();
    if (!query) return exchangeTickers;
    return exchangeTickers.filter((ticker) => ticker.includes(query));
  }, [exchangeTickers, filters.search]);

  const fetchTickers = useMemo(
    () => filteredTickers.slice(0, MAX_FETCH_TICKERS),
    [filteredTickers],
  );

  const minTradeValue = useMemo(() => {
    const parsed = Number(filters.minTradeValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [filters.minTradeValue]);

  const maxTradeValue = useMemo(() => {
    const parsed = Number(filters.maxTradeValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [filters.maxTradeValue]);

  useEffect(() => {
    if (fetchTickers.length === 0) {
      setRawRows([]);
      return;
    }

    let isMounted = true;
    const run = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [data, vnIndexData, vixData] = await Promise.all([
          fetchTickerRows(fetchTickers, filters.startDate, filters.endDate, {
            liquidityMode: filters.liquidityMode,
            minTradeValue,
            maxTradeValue,
          }),
          fetchTickerRow("VNINDEX", filters.startDate, filters.endDate),
          fetchVixSnapshot(),
        ]);
        if (isMounted) {
          setRawRows(data.map(enrichStockRow));
          setVnIndexRow(vnIndexData.points.length > 0 ? enrichStockRow(vnIndexData) : null);
          setVixSnapshot(vixData);
        }
      } catch (error) {
        if (isMounted) {
          setRawRows([]);
          setVnIndexRow(null);
          setVixSnapshot(null);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Cannot load stock data. Please try again later.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [
    fetchTickers,
    filters.startDate,
    filters.endDate,
    filters.liquidityMode,
    minTradeValue,
    maxTradeValue,
  ]);

  const rows = rawRows;

  useEffect(() => {
    if (rows.length === 0) return;
    if (!rows.some((row) => row.ticker === selectedTicker)) {
      setSelectedTicker(rows[0].ticker);
    }
  }, [rows, selectedTicker]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.ticker === selectedTicker) ?? null,
    [rows, selectedTicker],
  );
  const breadthMetrics = useMemo(() => computeBreadthMetrics(rows), [rows]);
  const momentumMetrics = useMemo(() => computeVolumeMomentum(rows), [rows]);
  const powerMetrics = useMemo(() => computePowerMetrics(rows), [rows]);
  const marketOverview = useMemo(() => computeMarketOverview(rows, vnIndexRow), [rows, vnIndexRow]);
  const dailyRows = useMemo(() => buildDailyAggregateRows(rows, vnIndexRow), [rows, vnIndexRow]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Stocks Dashboard</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Liquidity filter now uses aggressive-trading API and applies minimum trade value threshold.
        </p>
        <StockFilters
          filters={filters}
          tickerOptions={rows.map((row) => row.ticker)}
          selectedTicker={selectedTicker}
          onFilterChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
          onTickerChange={setSelectedTicker}
        />
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <div className="space-y-6 2xl:col-span-12">
          <StockSummaryCards rows={rows} />
          <MarketOverviewCards items={marketOverview} isLoading={isLoading} />
          <MarketBreadthPanel
            breadth={breadthMetrics}
            momentum={momentumMetrics}
            powerMetrics={powerMetrics}
            rows={rows}
          />
          <div className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium text-gray-800 dark:text-white">Ticker coverage</span>
            <span>
              Showing {rows.length} of {filteredTickers.length} tickers. Max {MAX_FETCH_TICKERS} fetched for performance.
            </span>
          </div>
          <StockTable rows={dailyRows} isLoading={isLoading} vixSnapshot={vixSnapshot} />
          <ATHStocksTable stocks={rows} isLoading={isLoading} />
        </div>
        
      </div>
      <div className="space-y-6 2xl:col-span-12">
        {/* Technical Analysis Section */}
        {selectedRow ? (
          <StockTechnicalAnalysis row={selectedRow} />
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Select a stock to view technical analysis</p>
          </div>
        )}

        {/* Trading History Charts - Stacked Bar */}
        <div className="grid grid-cols-1 gap-12 2xl:grid-cols-2">
          <div>
            <ForeignInvestorHistoryStacked symbol={selectedTicker} />
          </div>
          <div>
            <ProprietaryTradingHistoryStacked symbol={selectedTicker} />
          </div>
        </div>

        {/* Top 5 Stocks Horizontal Bar */}
        <Top5StockersHorizontalBar />

        {/* Traditional Charts Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {selectedTicker} Price Chart
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Historical price movements and trends
            </p>
          </div>
          {selectedRow ? (
            <StockLineChart row={selectedRow} />
          ) : (
            <div className="flex h-96 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900">
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a stock to view chart</p>
            </div>
          )}
        </div>


      </div>
      </div>
      );
}
