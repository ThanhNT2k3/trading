"use client";

import React from "react";
import { StockRow } from "@/types/stocks";

interface StockSummaryCardsProps {
  rows: StockRow[];
}

function formatNumber(value: number | null): string {
  if (value === null) return "--";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export default function StockSummaryCards({ rows }: StockSummaryCardsProps) {
  const validRows = rows.filter((row) => row.latestClose !== null);
  const total = rows.length;
  const avgClose =
    validRows.length > 0
      ? validRows.reduce((sum, item) => sum + (item.latestClose ?? 0), 0) / validRows.length
      : null;
  const gainers = rows.filter((row) => (row.changePercent ?? 0) > 0).length;
  const losers = rows.filter((row) => (row.changePercent ?? 0) < 0).length;

  const cards = [
    { label: "Total tickers", value: String(total) },
    { label: "Avg latest close", value: formatNumber(avgClose) },
    { label: "Gainers", value: String(gainers) },
    { label: "Losers", value: String(losers) },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
