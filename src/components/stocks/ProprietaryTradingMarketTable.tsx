"use client";

import React, { useEffect, useState } from "react";
import { StockMarketData, fetchProprietaryTradingMarketData } from "@/lib/stocks/cafef-api";

interface ProprietaryTradingMarketTableProps {
  type?: "BUYVALUE" | "SELLVALUE";
  limit?: number;
}

function formatCurrency(value: number | undefined): string {
  if (!value) return "0";
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatVolume(value: number | undefined): string {
  if (!value) return "0";
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
}

export default function ProprietaryTradingMarketTable({ type = "BUYVALUE", limit }: ProprietaryTradingMarketTableProps) {
  const [data, setData] = useState<StockMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetch = async () => {
      try {
        setLoading(true);
        const result = await fetchProprietaryTradingMarketData(type);
        if (isMounted) {
          setData(limit ? result.slice(0, limit) : result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetch();
    return () => {
      isMounted = false;
    };
  }, [type, limit]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Proprietary Trading - {type === "BUYVALUE" ? "Buying" : "Selling"}
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Proprietary Trading - {type === "BUYVALUE" ? "Buying" : "Selling"}
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {error || "No data available"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Proprietary Trading - {type === "BUYVALUE" ? "Buying 📈" : "Selling 📉"} (Top 10)
        </h3>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Ticker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Company</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Change</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Volume</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((stock, index) => (
              <tr
                key={stock.symbol}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30"
              >
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-xs font-bold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    {index + 1}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                  {stock.symbol}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="max-w-xs truncate">{stock.companyName}</div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                  ₫{formatCurrency(stock.currentPrice)}
                </td>
                <td className={`px-6 py-4 text-right text-sm font-semibold ${
                  stock.changePricePercent >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {stock.changePricePercent >= 0 ? "+" : ""}{stock.changePricePercent.toFixed(2)}%
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">
                  {formatVolume(stock.volume)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {formatCurrency(Math.abs(stock.value))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
