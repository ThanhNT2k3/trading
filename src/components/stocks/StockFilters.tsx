"use client";

import React from "react";
import { Exchange, StocksFilterState } from "@/types/stocks";

interface StockFiltersProps {
  filters: StocksFilterState;
  tickerOptions: string[];
  selectedTicker: string;
  onFilterChange: (next: Partial<StocksFilterState>) => void;
  onTickerChange: (ticker: string) => void;
}

const exchanges: Exchange[] = ["ALL", "HOSE", "HNX", "UPCOM", "VN30", "VN100"];

export default function StockFilters({
  filters,
  tickerOptions,
  selectedTicker,
  onFilterChange,
  onTickerChange,
}: StockFiltersProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Exchange</span>
          <select
            value={filters.exchange}
            onChange={(event) => onFilterChange({ exchange: event.target.value as Exchange })}
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {exchanges.map((exchange) => (
              <option key={exchange} value={exchange}>
                {exchange}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => onFilterChange({ startDate: event.target.value })}
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">End date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => onFilterChange({ endDate: event.target.value })}
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Search ticker</span>
          <input
            type="text"
            value={filters.search}
            onChange={(event) => onFilterChange({ search: event.target.value.toUpperCase() })}
            placeholder="Ex: VCB"
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ticker chart</span>
          <select
            value={selectedTicker}
            onChange={(event) => onTickerChange(event.target.value)}
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {tickerOptions.map((ticker) => (
              <option key={ticker} value={ticker}>
                {ticker}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Liquidity mode</span>
          <select
            value={filters.liquidityMode}
            onChange={(event) =>
              onFilterChange({
                liquidityMode: event.target.value as "ALL" | "MIN_TRADE_VALUE" | "RANGE",
              })
            }
            className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="ALL">ALL</option>
            <option value="MIN_TRADE_VALUE">MIN_TRADE_VALUE</option>
            <option value="RANGE">RANGE</option>
          </select>
        </label>
      </div>
      {filters.liquidityMode !== "ALL" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Min trade value</span>
            <input
              type="number"
              value={filters.minTradeValue}
              onChange={(event) => onFilterChange({ minTradeValue: event.target.value })}
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              placeholder="1000000000"
            />
          </label>
          {filters.liquidityMode === "RANGE" ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Max trade value</span>
              <input
                type="number"
                value={filters.maxTradeValue}
                onChange={(event) => onFilterChange({ maxTradeValue: event.target.value })}
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                placeholder="5000000000"
              />
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
