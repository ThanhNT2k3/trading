"use client";

import React from "react";
import { MarketOverviewItem } from "@/types/stocks";

interface MarketOverviewCardsProps {
  items: MarketOverviewItem[];
  isLoading: boolean;
}

function formatNumber(value: number | null): string {
  if (value === null) return "N/A";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export default function MarketOverviewCards({ items, isLoading }: MarketOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
        Loading market overview...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item.label}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Liquidity: {formatNumber(item.totalLiquidity)}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Avg change: {item.avgChangePercent === null ? "N/A" : `${item.avgChangePercent.toFixed(2)}%`}
          </p>
          {item.label !== "VNINDEX" ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Up/Down/Flat: {item.up}/{item.down}/{item.flat}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.note ?? "Index view"}</p>
          )}
        </div>
      ))}
    </div>
  );
}
