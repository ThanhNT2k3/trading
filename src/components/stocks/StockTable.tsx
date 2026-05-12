"use client";

import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { DailyAggregateRow, VixSnapshot } from "@/types/stocks";

interface StockTableProps {
  rows: DailyAggregateRow[];
  isLoading: boolean;
  vixSnapshot: VixSnapshot | null;
}

function numberDisplay(value: number | null): string {
  if (value === null) return "--";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function percentChangeClass(value: number | null): string {
  if (value === null || value === 0) return "text-gray-600 dark:text-gray-300";
  if (value > 0) return "text-success-600 dark:text-success-400";
  return "text-error-600 dark:text-error-400";
}

function directionLabel(value: number | null): "up" | "down" | "flat" {
  if (value === null || value === 0) return "flat";
  return value > 0 ? "up" : "down";
}

function getHeatCellClass(value: number, min: number, max: number): string {
  if (max <= min) return "bg-gray-50 text-gray-700 dark:bg-white/[0.03] dark:text-gray-300";
  const ratio = (value - min) / (max - min);

  if (ratio >= 0.8) return "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-300";
  if (ratio >= 0.6) return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
  if (ratio >= 0.4) return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300";
  if (ratio >= 0.2) return "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300";
  return "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300";
}

export default function StockTable({ rows, isLoading, vixSnapshot }: StockTableProps) {
  const [dateQuery, setDateQuery] = useState("");
  const [trendFilter, setTrendFilter] = useState<"ALL" | "UP" | "DOWN">("ALL");
  const [visibleLimit, setVisibleLimit] = useState(60);

  const vixLabel =
    vixSnapshot && vixSnapshot.value !== null ? vixSnapshot.value.toFixed(2) : "N/A";
  const vixAsOf =
    vixSnapshot && vixSnapshot.asOf
      ? new Date(vixSnapshot.asOf).toLocaleDateString("en-GB")
      : null;

  const filteredRows = useMemo(() => {
    const query = dateQuery.trim();
    return rows.filter((row) => {
      const matchesDate = query.length === 0 || row.date.includes(query);
      const direction = directionLabel(row.indexChangeVsPrevious);
      const matchesTrend =
        trendFilter === "ALL" ||
        (trendFilter === "UP" && direction === "up") ||
        (trendFilter === "DOWN" && direction === "down");

      return matchesDate && matchesTrend;
    });
  }, [dateQuery, rows, trendFilter]);

  const visibleRows = filteredRows.slice(0, visibleLimit);
  const latestRow = rows[0] ?? null;
  const ma10Values = rows.map((row) => row.aboveMa10Count);
  const minMa10 = Math.min(...ma10Values);
  const maxMa10 = Math.max(...ma10Values);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading stock data...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500 dark:text-gray-400">No tickers match current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 p-4 dark:border-white/[0.05]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
              Daily Breadth History
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              Moving-average participation by day
            </h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/10">
                VIX <span className="font-semibold text-gray-800 dark:text-white">{vixLabel}</span>
                {vixAsOf ? ` as of ${vixAsOf}` : ""}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/10">
                {filteredRows.length} of {rows.length} days
              </span>
              {latestRow ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/10">
                  Latest MA20: {latestRow.aboveMa20Count}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px_140px] xl:min-w-[520px]">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Filter date</span>
              <input
                value={dateQuery}
                onChange={(event) => setDateQuery(event.target.value)}
                placeholder="YYYY-MM or YYYY-MM-DD"
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Index move</span>
              <select
                value={trendFilter}
                onChange={(event) => setTrendFilter(event.target.value as "ALL" | "UP" | "DOWN")}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="ALL">All days</option>
                <option value="UP">Up days</option>
                <option value="DOWN">Down days</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Show</span>
              <select
                value={visibleLimit}
                onChange={(event) => setVisibleLimit(Number(event.target.value))}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value={30}>30 rows</option>
                <option value={60}>60 rows</option>
                <option value={120}>120 rows</option>
                <option value={9999}>All rows</option>
              </select>
            </label>
          </div>
        </div>
      </div>
      <div className="max-w-full overflow-x-auto">
        <div className="max-h-[560px] min-w-[1040px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 border-b border-gray-100 bg-white dark:border-white/[0.05] dark:bg-gray-950">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Stocks {">"} MA10
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Stocks {">"} MA20
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Stocks {">"} MA50
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Liquidity
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Index vs Current
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                >
                  Index vs Previous
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {visibleRows.map((row) => (
                <TableRow key={row.date} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {row.date}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex min-w-16 items-center justify-center rounded-full px-2.5 py-1 text-sm font-semibold ${getHeatCellClass(
                        row.aboveMa10Count,
                        minMa10,
                        maxMa10,
                      )}`}
                    >
                      {row.aboveMa10Count}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {row.aboveMa20Count}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {row.aboveMa50Count}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {numberDisplay(row.totalLiquidity)}
                  </TableCell>
                  <TableCell
                    className={`px-4 py-3 text-sm ${percentChangeClass(row.indexChangeVsCurrent)}`}
                  >
                    {row.indexChangeVsCurrent === null ? "N/A" : `${row.indexChangeVsCurrent.toFixed(2)}%`}
                  </TableCell>
                  <TableCell
                    className={`px-4 py-3 text-sm ${percentChangeClass(row.indexChangeVsPrevious)}`}
                  >
                    {row.indexChangeVsPrevious === null ? "N/A" : `${row.indexChangeVsPrevious.toFixed(2)}%`}
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No days match these filters.
                  </TableCell>
                  <TableCell className="px-4 py-8">{""}</TableCell>
                  <TableCell className="px-4 py-8">{""}</TableCell>
                  <TableCell className="px-4 py-8">{""}</TableCell>
                  <TableCell className="px-4 py-8">{""}</TableCell>
                  <TableCell className="px-4 py-8">{""}</TableCell>
                  <TableCell className="px-4 py-8">{""}</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
      {filteredRows.length > visibleRows.length ? (
        <div className="border-t border-gray-100 px-4 py-3 text-center dark:border-white/[0.05]">
          <button
            type="button"
            onClick={() => setVisibleLimit((current) => current + 60)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Show 60 more days
          </button>
        </div>
      ) : null}
    </div>
  );
}
