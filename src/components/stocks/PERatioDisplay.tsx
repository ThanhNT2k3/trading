"use client";

import React, { useEffect, useState } from "react";
import { PERatioData, fetchPERatioData } from "@/lib/stocks/cafef-api";

interface PERatioDisplayProps {
  ticker: string;
}

export default function PERatioDisplay({ ticker  =""}: PERatioDisplayProps) {
  const [data, setData] = useState<PERatioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    let isMounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const result = await fetchPERatioData(ticker);
        if (isMounted) {
          setData(result);
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
  }, [ticker]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Valuation Metrics (PE/PB)
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Valuation Metrics (PE/PB)
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {error || "No data available"}
          </div>
        </div>
      </div>
    );
  }

  const getRatioColor = (ratio: number | null, type: "pe" | "pb") => {
    if (ratio === null) return "text-gray-500 dark:text-gray-400";
    
    if (type === "pe") {
      if (ratio < 10) return "text-green-600 dark:text-green-400";
      if (ratio < 15) return "text-blue-600 dark:text-blue-400";
      if (ratio < 20) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    } else {
      if (ratio < 1) return "text-green-600 dark:text-green-400";
      if (ratio < 2) return "text-blue-600 dark:text-blue-400";
      if (ratio < 3) return "text-yellow-600 dark:text-yellow-400";
      return "text-red-600 dark:text-red-400";
    }
  };

  const getVisualizationHeight = (ratio: number | null, type: "pe" | "pb") => {
    if (ratio === null) return "25%";
    if (type === "pe") {
      const clamped = Math.min(ratio / 30 * 100, 100);
      return `${clamped}%`;
    } else {
      const clamped = Math.min(ratio / 5 * 100, 100);
      return `${clamped}%`;
    }
  };

  const getRatioInterpretation = (ratio: number | null, type: "pe" | "pb") => {
    if (ratio === null) return "N/A";
    if (type === "pe") {
      if (ratio < 8) return "Very Undervalued";
      if (ratio < 12) return "Undervalued";
      if (ratio < 15) return "Fair Value";
      if (ratio < 20) return "Fairly Valued";
      if (ratio < 25) return "Overvalued";
      return "Very Overvalued";
    } else {
      if (ratio < 0.8) return "Highly Discounted";
      if (ratio < 1) return "Below Book Value";
      if (ratio < 1.5) return "Fair Value";
      if (ratio < 2.5) return "Premium";
      return "Highly Premium";
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Valuation Metrics (PE/PB)
          </h3>
          {data.date && (
            <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {new Date(data.date).toLocaleDateString("vi-VN")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* PE Ratio Card */}
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50/50 to-white p-5 dark:border-gray-700 dark:from-blue-900/20 dark:to-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Price-to-Earnings</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${getRatioColor(data.pe, "pe")}`}>
                    {data.pe !== null ? data.pe.toFixed(2) : "N/A"}
                  </p>
                </div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {getRatioInterpretation(data.pe, "pe")}
                </p>
              </div>
              <div className="text-4xl opacity-20">📈</div>
            </div>

            {/* Visualization Bar */}
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="h-32 w-full rounded-lg bg-gradient-to-t from-blue-200 to-blue-50 dark:from-blue-600 dark:to-blue-400 relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-lg"
                    style={{ height: getVisualizationHeight(data.pe, "pe") }}
                  />
                </div>
                <div className="text-right text-xs space-y-2">
                  <div className="text-gray-500">30</div>
                  <div className="text-gray-500">15</div>
                  <div className="text-gray-500">0</div>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Lower is cheaper</p>
            </div>

            {data.eps !== null && (
              <div className="rounded-lg bg-white/50 p-3 dark:bg-white/5">
                <p className="text-xs text-gray-600 dark:text-gray-400">EPS (Earnings Per Share)</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                  {data.eps.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* PB Ratio Card */}
          <div className="space-y-4 rounded-xl border border-gray-100 bg-gradient-to-br from-purple-50/50 to-white p-5 dark:border-gray-700 dark:from-purple-900/20 dark:to-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Price-to-Book</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-3xl font-bold ${getRatioColor(data.pb, "pb")}`}>
                    {data.pb !== null ? data.pb.toFixed(2) : "N/A"}
                  </p>
                </div>
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                  {getRatioInterpretation(data.pb, "pb")}
                </p>
              </div>
              <div className="text-4xl opacity-20">📊</div>
            </div>

            {/* Visualization Bar */}
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="h-32 w-full rounded-lg bg-gradient-to-t from-purple-200 to-purple-50 dark:from-purple-600 dark:to-purple-400 relative overflow-hidden">
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-500 to-purple-400 rounded-lg"
                    style={{ height: getVisualizationHeight(data.pb, "pb") }}
                  />
                </div>
                <div className="text-right text-xs space-y-2">
                  <div className="text-gray-500">5</div>
                  <div className="text-gray-500">2.5</div>
                  <div className="text-gray-500">0</div>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Lower is cheaper</p>
            </div>

            {data.bvps !== null && (
              <div className="rounded-lg bg-white/50 p-3 dark:bg-white/5">
                <p className="text-xs text-gray-600 dark:text-gray-400">BVPS (Book Value Per Share)</p>
                <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
                  {data.bvps.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interpretation Card */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-6 dark:border-blue-800 dark:from-blue-900/20 dark:to-white/[0.02]">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Valuation Analysis
            </h4>
            <div className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-300">
              {data.pe !== null && (
                <div className="flex items-start gap-2">
                  <span className="mt-1">→</span>
                  <span>
                    <strong>P/E Ratio {data.pe < 12 ? "is LOW:" : data.pe > 18 ? "is HIGH:" : "is moderate:"}</strong>
                    {data.pe < 12
                      ? " Stock appears undervalued relative to earnings"
                      : data.pe > 18
                        ? " Stock appears overvalued relative to earnings"
                        : " Stock has fair valuation relative to earnings"}
                  </span>
                </div>
              )}
              {data.pb !== null && (
                <div className="flex items-start gap-2">
                  <span className="mt-1">→</span>
                  <span>
                    <strong>P/B Ratio {data.pb < 1 ? "is BELOW:" : data.pb > 3 ? "is ABOVE:" : "is near:"}</strong>
                    {data.pb < 1
                      ? " Trading below book value - potential bargain"
                      : data.pb > 3
                        ? " Trading well above book value - premium valuation"
                        : " Trading near book value - neutral valuation"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
