"use client";

import React from "react";
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

export default function StockTable({ rows, isLoading, vixSnapshot }: StockTableProps) {
  const vixLabel =
    vixSnapshot && vixSnapshot.value !== null ? vixSnapshot.value.toFixed(2) : "N/A";
  const vixAsOf =
    vixSnapshot && vixSnapshot.asOf
      ? new Date(vixSnapshot.asOf).toLocaleDateString("en-GB")
      : null;

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
      <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-white/[0.05] dark:text-gray-300">
        VIX: <span className="font-semibold text-gray-900 dark:text-white">{vixLabel}</span>
        {vixAsOf ? (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({vixAsOf})</span>
        ) : null}
      </div>
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[980px]">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
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
              {rows.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {row.date}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {row.aboveMa10Count}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                    {row.aboveMa20Count}
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
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
