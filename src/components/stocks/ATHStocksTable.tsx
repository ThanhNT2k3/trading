"use client";

import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { StockRow } from "@/types/stocks";
import { getStocksAtATHWithin1Year } from "@/lib/stocks/analytics";

interface ATHStocksTableProps {
  stocks: StockRow[];
  isLoading?: boolean;
  filterType?: "ALL" | "AT_ATH" | "NEAR_ATH";
}

function formatPrice(value: number | null): string {
  if (value === null) return "--";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  if (value === null) return "--";
  return (value > 0 ? "+" : "") + value.toFixed(2) + "%";
}

function getStatusBadge(stock: StockRow): React.ReactNode {
  if (stock.isAtATH) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300">
        At ATH
      </span>
    );
  }
  
  if (stock.ath && stock.latestClose) {
    const diff = ((stock.ath - stock.latestClose) / stock.ath) * 100;
    if (diff <= 5) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300">
          Near ATH
        </span>
      );
    }
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
      Within 1Y
    </span>
  );
}

function getPercentChangeColor(value: number | null): string {
  if (value === null || value === 0) return "text-gray-600 dark:text-gray-300";
  if (value > 0) return "text-success-600 dark:text-success-400";
  return "text-error-600 dark:text-error-400";
}

export default function ATHStocksTable({
  stocks,
  isLoading = false,
  filterType = "ALL",
}: ATHStocksTableProps) {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [exchangeFilter, setExchangeFilter] = useState<"ALL" | "HOSE" | "HNX" | "UPCOM">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "AT_ATH" | "NEAR_ATH" | "WITHIN_1Y">("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minPercentFromATH, setMinPercentFromATH] = useState("");
  const [maxPercentFromATH, setMaxPercentFromATH] = useState("");
  const [sortColumn, setSortColumn] = useState<"ticker" | "currentPrice" | "athPrice" | "athDate" | "percentFromATH" | "changePercent" | "exchange">("ticker");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [visibleLimit, setVisibleLimit] = useState(60);

  const filteredStocks = useMemo(() => {
    let result = getStocksAtATHWithin1Year(stocks);

    // Apply filterType from parent
    if (filterType === "AT_ATH") {
      result = result.filter((stock) => stock.isAtATH);
    } else if (filterType === "NEAR_ATH") {
      result = result.filter((stock) => {
        if (stock.ath === null || stock.latestClose === null) return false;
        const diff = (stock.ath - stock.latestClose) / stock.ath;
        return diff >= 0 && diff <= 0.05;
      });
    }

    // Apply search filter
    if (searchTerm) {
      result = result.filter((stock) =>
        stock.ticker.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply exchange filter
    if (exchangeFilter !== "ALL") {
      result = result.filter((stock) => stock.exchange === exchangeFilter);
    }

    // Apply status filter
    if (statusFilter !== "ALL") {
      result = result.filter((stock) => {
        if (statusFilter === "AT_ATH") return stock.isAtATH;
        if (statusFilter === "NEAR_ATH") {
          if (stock.ath === null || stock.latestClose === null) return false;
          const diff = (stock.ath - stock.latestClose) / stock.ath;
          return diff >= 0 && diff <= 0.05;
        }
        if (statusFilter === "WITHIN_1Y") {
          return !stock.isAtATH && (stock.ath === null || stock.latestClose === null || (stock.ath - stock.latestClose) / stock.ath > 0.05);
        }
        return true;
      });
    }

    // Apply price range filter
    if (minPrice) {
      const min = parseFloat(minPrice);
      result = result.filter((stock) => stock.latestClose !== null && stock.latestClose >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      result = result.filter((stock) => stock.latestClose !== null && stock.latestClose <= max);
    }

    // Apply percent from ATH range filter
    if (minPercentFromATH) {
      const min = parseFloat(minPercentFromATH);
      result = result.filter((stock) => {
        if (stock.ath === null || stock.latestClose === null) return false;
        const percent = ((stock.latestClose - stock.ath) / stock.ath) * 100;
        return percent >= min;
      });
    }
    if (maxPercentFromATH) {
      const max = parseFloat(maxPercentFromATH);
      result = result.filter((stock) => {
        if (stock.ath === null || stock.latestClose === null) return false;
        const percent = ((stock.latestClose - stock.ath) / stock.ath) * 100;
        return percent <= max;
      });
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "ticker":
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case "currentPrice":
          comparison = (a.latestClose || 0) - (b.latestClose || 0);
          break;
        case "athPrice":
          comparison = (a.ath || 0) - (b.ath || 0);
          break;
        case "athDate":
          comparison = (a.athDate || "").localeCompare(b.athDate || "");
          break;
        case "percentFromATH":
          const aPercent = a.ath && a.latestClose ? ((a.latestClose - a.ath) / a.ath) * 100 : 0;
          const bPercent = b.ath && b.latestClose ? ((b.latestClose - b.ath) / b.ath) * 100 : 0;
          comparison = aPercent - bPercent;
          break;
        case "changePercent":
          comparison = (a.changePercent || 0) - (b.changePercent || 0);
          break;
        case "exchange":
          comparison = a.exchange.localeCompare(b.exchange);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    stocks,
    filterType,
    searchTerm,
    exchangeFilter,
    statusFilter,
    minPrice,
    maxPrice,
    minPercentFromATH,
    maxPercentFromATH,
    sortColumn,
    sortDirection,
  ]);

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setExchangeFilter("ALL");
    setStatusFilter("ALL");
    setMinPrice("");
    setMaxPrice("");
    setMinPercentFromATH("");
    setMaxPercentFromATH("");
    setSortColumn("ticker");
    setSortDirection("asc");
  };

  const hasActiveFilters = searchTerm || exchangeFilter !== "ALL" || statusFilter !== "ALL" ||
    minPrice || maxPrice || minPercentFromATH || maxPercentFromATH;
  const visibleStocks = filteredStocks.slice(0, visibleLimit);
  const totalAthStocks = getStocksAtATHWithin1Year(stocks).length;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading ATH stocks data...</p>
      </div>
    );
  }

  if (filteredStocks.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No stocks found reaching ATH within the last year.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 p-4 dark:border-white/[0.05]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
              ATH Watchlist
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              Stocks reaching all-time highs within 1 year
            </h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/10">
                {filteredStocks.length} of {totalAthStocks} stocks
              </span>
              <span className="rounded-full bg-success-50 px-2.5 py-1 text-success-700 dark:bg-success-500/10 dark:text-success-400">
                {filteredStocks.filter((stock) => stock.isAtATH).length} at ATH
              </span>
              <span className="rounded-full bg-warning-50 px-2.5 py-1 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
                {filteredStocks.filter((stock) => {
                  if (!stock.ath || !stock.latestClose || stock.isAtATH) return false;
                  return (stock.ath - stock.latestClose) / stock.ath <= 0.05;
                }).length} near ATH
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Clear filters
              </button>
            ) : null}
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              Show
              <select
                value={visibleLimit}
                onChange={(event) => setVisibleLimit(Number(event.target.value))}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value={30}>30</option>
                <option value={60}>60</option>
                <option value={120}>120</option>
                <option value={9999}>All</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex flex-col gap-1.5 xl:col-span-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Search ticker</span>
            <input
              type="text"
              placeholder="VCB, VIC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Exchange</span>
            <select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value as "ALL" | "HOSE" | "HNX" | "UPCOM")}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">All Exchanges</option>
              <option value="HOSE">HOSE</option>
              <option value="HNX">HNX</option>
              <option value="UPCOM">UPCOM</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "AT_ATH" | "NEAR_ATH" | "WITHIN_1Y")}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="AT_ATH">At ATH</option>
              <option value="NEAR_ATH">Near ATH (5%)</option>
              <option value="WITHIN_1Y">Within 1 Year (5%)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 xl:col-span-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Sort by</span>
            <select
              value={`${sortColumn}-${sortDirection}`}
              onChange={(e) => {
                const [column, direction] = e.target.value.split("-");
                setSortColumn(column as typeof sortColumn);
                setSortDirection(direction as "asc" | "desc");
              }}
              className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ticker-asc">Ticker (A-Z)</option>
              <option value="ticker-desc">Ticker (Z-A)</option>
              <option value="currentPrice-asc">Price (Low to High)</option>
              <option value="currentPrice-desc">Price (High to Low)</option>
              <option value="athPrice-asc">ATH Price (Low to High)</option>
              <option value="athPrice-desc">ATH Price (High to Low)</option>
              <option value="percentFromATH-asc">% from ATH (Low to High)</option>
              <option value="percentFromATH-desc">% from ATH (High to Low)</option>
              <option value="changePercent-asc">Change % (Low to High)</option>
              <option value="changePercent-desc">Change % (High to Low)</option>
              <option value="exchange-asc">Exchange (A-Z)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 xl:col-span-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Price range</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5 xl:col-span-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">% from ATH</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min %"
                value={minPercentFromATH}
                onChange={(e) => setMinPercentFromATH(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <input
                type="number"
                placeholder="Max %"
                value={maxPercentFromATH}
                onChange={(e) => setMaxPercentFromATH(e.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <div className="max-h-[560px] min-w-[1060px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-white dark:border-white/[0.05] dark:bg-gray-950">
              <TableRow>
                <TableCell isHeader className="sticky left-0 z-20 w-24 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                  <button
                    onClick={() => handleSort("ticker")}
                    className="flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    Ticker {sortColumn === "ticker" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => handleSort("currentPrice")}
                    className="ml-auto flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    Current Price {sortColumn === "currentPrice" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => handleSort("athPrice")}
                    className="ml-auto flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    ATH Price {sortColumn === "athPrice" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => handleSort("athDate")}
                    className="ml-auto flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    ATH Date {sortColumn === "athDate" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => handleSort("percentFromATH")}
                    className="ml-auto flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    % from ATH {sortColumn === "percentFromATH" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => handleSort("changePercent")}
                    className="ml-auto flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    Change % {sortColumn === "changePercent" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => handleSort("exchange")}
                    className="ml-auto flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    Exchange {sortColumn === "exchange" && (sortDirection === "asc" ? "↑" : "↓")}
                  </button>
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {visibleStocks.map((stock) => (
                <TableRow key={stock.ticker} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <TableCell className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-semibold text-gray-900 dark:bg-gray-950 dark:text-white">
                    {stock.ticker}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {formatPrice(stock.latestClose)}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {formatPrice(stock.ath)}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {stock.athDate ? new Date(stock.athDate).toLocaleDateString("en-GB") : "--"}
                  </TableCell>

                  <TableCell className={`px-4 py-3 text-right text-sm font-semibold ${
                    stock.latestClose && stock.ath
                      ? getPercentChangeColor((stock.latestClose - stock.ath) / stock.ath * 100)
                      : ""
                  }`}>
                    {stock.latestClose && stock.ath
                      ? formatPercent(((stock.latestClose - stock.ath) / stock.ath) * 100)
                      : "--"}
                  </TableCell>

                  <TableCell className={`px-4 py-3 text-right text-sm font-semibold ${getPercentChangeColor(stock.changePercent)}`}>
                    {formatPercent(stock.changePercent)}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-center">
                    {getStatusBadge(stock)}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {stock.exchange}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {filteredStocks.length > visibleStocks.length ? (
        <div className="border-t border-gray-100 px-4 py-3 text-center dark:border-white/[0.05]">
          <button
            type="button"
            onClick={() => setVisibleLimit((current) => current + 60)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Show 60 more stocks
          </button>
        </div>
      ) : null}
    </section>
  );
}
