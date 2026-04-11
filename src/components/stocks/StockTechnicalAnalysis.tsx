"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { StockRow } from "@/types/stocks";
import ComponentCard from "@/components/common/ComponentCard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface StockTechnicalAnalysisProps {
  row: StockRow | null;
}

interface TechnicalLevels {
  high: number;
  low: number;
  fib236: number;
  fib382: number;
  fib50: number;
  fib618: number;
  fib786: number;
  support1: number;
  support2: number;
  resistance1: number;
  resistance2: number;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
}

function calculateTechnicalLevels(row: StockRow): TechnicalLevels {
  const closes = row.points.map((p) => p.close);
  const high = Math.max(...closes);
  const low = Math.min(...closes);
  const range = high - low;

  // Fibonacci retracement and extensions
  const fib236 = high - range * 0.236;
  const fib382 = high - range * 0.382;
  const fib50 = high - range * 0.5;
  const fib618 = high - range * 0.618;
  const fib786 = high - range * 0.786;

  // Support and Resistance based on recent highs/lows
  const last10 = closes.slice(-10);
  const recent_high = Math.max(...last10);
  const recent_low = Math.min(...last10);
  const recent_range = recent_high - recent_low;

  const support1 = recent_low;
  const support2 = recent_low - recent_range * 0.5;
  const resistance1 = recent_high;
  const resistance2 = recent_high + recent_range * 0.5;

  // Entry, SL, TP levels
  const current = closes[closes.length - 1];
  const entry = current;
  const sl = support1 * 0.98; // 2% below support
  const atr = (recent_range / last10.length) * 1.5; // Average True Range approximation
  const tp1 = entry + atr;
  const tp2 = entry + atr * 2;
  const tp3 = entry + atr * 3;

  return {
    high,
    low,
    fib236,
    fib382,
    fib50,
    fib618,
    fib786,
    support1,
    support2,
    resistance1,
    resistance2,
    entry,
    sl,
    tp1,
    tp2,
    tp3,
  };
}

export default function StockTechnicalAnalysis({ row }: StockTechnicalAnalysisProps) {
  if (!row || row.points.length === 0) {
    return (
      <ComponentCard title="📈 Technical Analysis">
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No chart data for selected ticker.
          </p>
        </div>
      </ComponentCard>
    );
  }

  const levels = useMemo(() => calculateTechnicalLevels(row), [row]);

  const labels = row.points.map((point) =>
    new Date(point.time * 1000).toLocaleDateString("en-GB"),
  );
  const closeValues = row.points.map((point) => point.close);

  const chartData = {
    series: [
      {
        name: `${row.ticker} Price`,
        data: closeValues,
      },
    ],
    categories: labels,
  };

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "line",
      height: 380,
      toolbar: { show: true },
    },
    stroke: {
      curve: "smooth",
      width: 2,
      colors: ["#465FFF"],
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.45,
        opacityTo: 0.05,
        colorStops: [
          { offset: 0, color: "#465FFF", opacity: 0.45 },
          { offset: 100, color: "#465FFF", opacity: 0.05 },
        ],
      },
    },
    xaxis: {
      type: "category" as const,
      categories: chartData.categories,
      labels: {
        show: true,
        style: {
          fontSize: "11px",
        },
      },
    },
    yaxis: {
      title: {
        text: "Price (VNĐ)",
      },
      labels: {
        formatter: (value) =>
          typeof value === "number"
            ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
            : value,
      },
    },
    legend: {
      position: "top" as const,
    },
    annotations: {
      yaxis: [
        // Entry, SL, TP levels
        {
          y: levels.entry,
          borderColor: "#3b82f6",
          label: {
            borderColor: "#3b82f6",
            style: {
              color: "#fff",
              background: "#3b82f6",
            },
            text: `Entry: ${levels.entry.toFixed(0)}`,
          },
        },
        {
          y: levels.sl,
          borderColor: "#ef4444",
          label: {
            borderColor: "#ef4444",
            style: {
              color: "#fff",
              background: "#ef4444",
            },
            text: `SL: ${levels.sl.toFixed(0)}`,
          },
        },
        {
          y: levels.tp1,
          borderColor: "#10b981",
          label: {
            borderColor: "#10b981",
            style: {
              color: "#fff",
              background: "#10b981",
            },
            text: `TP1: ${levels.tp1.toFixed(0)}`,
          },
        },
        {
          y: levels.tp2,
          borderColor: "#10b981",
          label: {
            borderColor: "#10b981",
            style: {
              color: "#fff",
              background: "#10b981",
            },
            text: `TP2: ${levels.tp2.toFixed(0)}`,
          },
        },
        {
          y: levels.tp3,
          borderColor: "#10b981",
          label: {
            borderColor: "#10b981",
            style: {
              color: "#fff",
              background: "#10b981",
            },
            text: `TP3: ${levels.tp3.toFixed(0)}`,
          },
        },
        // Fibonacci levels
        {
          y: levels.fib236,
          borderColor: "#a78bfa",
          strokeDashArray: 5,
          label: {
            borderColor: "#a78bfa",
            style: {
              color: "#fff",
              background: "#a78bfa",
            },
            text: `Fib 23.6%: ${levels.fib236.toFixed(0)}`,
          },
        },
        {
          y: levels.fib382,
          borderColor: "#a78bfa",
          strokeDashArray: 5,
          label: {
            borderColor: "#a78bfa",
            style: {
              color: "#fff",
              background: "#a78bfa",
            },
            text: `Fib 38.2%: ${levels.fib382.toFixed(0)}`,
          },
        },
        {
          y: levels.fib50,
          borderColor: "#a78bfa",
          strokeDashArray: 5,
          label: {
            borderColor: "#a78bfa",
            style: {
              color: "#fff",
              background: "#a78bfa",
            },
            text: `Fib 50%: ${levels.fib50.toFixed(0)}`,
          },
        },
        {
          y: levels.fib618,
          borderColor: "#a78bfa",
          strokeDashArray: 5,
          label: {
            borderColor: "#a78bfa",
            style: {
              color: "#fff",
              background: "#a78bfa",
            },
            text: `Fib 61.8%: ${levels.fib618.toFixed(0)}`,
          },
        },
        {
          y: levels.fib786,
          borderColor: "#a78bfa",
          strokeDashArray: 5,
          label: {
            borderColor: "#a78bfa",
            style: {
              color: "#fff",
              background: "#a78bfa",
            },
            text: `Fib 78.6%: ${levels.fib786.toFixed(0)}`,
          },
        },
        // Support and Resistance
        {
          y: levels.support1,
          borderColor: "#fbbf24",
          strokeDashArray: 3,
          label: {
            borderColor: "#fbbf24",
            style: {
              color: "#000",
              background: "#fbbf24",
            },
            text: `Support 1: ${levels.support1.toFixed(0)}`,
          },
        },
        {
          y: levels.support2,
          borderColor: "#fbbf24",
          strokeDashArray: 3,
          label: {
            borderColor: "#fbbf24",
            style: {
              color: "#000",
              background: "#fbbf24",
            },
            text: `Support 2: ${levels.support2.toFixed(0)}`,
          },
        },
        {
          y: levels.resistance1,
          borderColor: "#f59e0b",
          strokeDashArray: 3,
          label: {
            borderColor: "#f59e0b",
            style: {
              color: "#fff",
              background: "#f59e0b",
            },
            text: `Res 1: ${levels.resistance1.toFixed(0)}`,
          },
        },
        {
          y: levels.resistance2,
          borderColor: "#f59e0b",
          strokeDashArray: 3,
          label: {
            borderColor: "#f59e0b",
            style: {
              color: "#fff",
              background: "#f59e0b",
            },
            text: `Res 2: ${levels.resistance2.toFixed(0)}`,
          },
        },
      ],
    },
  };

  return (
    <ComponentCard title="📈 Technical Analysis - Entry, SL, TP Levels">
      <div className="w-full">
        <Chart
          options={options}
          series={chartData.series}
          type="line"
          height={380}
        />
      </div>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-blue-50 rounded dark:bg-blue-900/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">Entry</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {levels.entry.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-red-50 rounded dark:bg-red-900/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">Stop Loss</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {levels.sl.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded dark:bg-green-900/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">TP 1</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {levels.tp1.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded dark:bg-green-900/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">TP 2</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {levels.tp2.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded dark:bg-green-900/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">TP 3</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {levels.tp3.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 mb-3">
            📊 Fibonacci & Support/Resistance
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fib 23.6%</p>
              <p className="font-semibold text-purple-600 dark:text-purple-400">
                {levels.fib236.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fib 38.2%</p>
              <p className="font-semibold text-purple-600 dark:text-purple-400">
                {levels.fib382.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fib 50%</p>
              <p className="font-semibold text-purple-600 dark:text-purple-400">
                {levels.fib50.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fib 61.8%</p>
              <p className="font-semibold text-purple-600 dark:text-purple-400">
                {levels.fib618.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Support 1</p>
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                {levels.support1.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Support 2</p>
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                {levels.support2.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Resistance 1</p>
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                {levels.resistance1.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Resistance 2</p>
              <p className="font-semibold text-orange-600 dark:text-orange-400">
                {levels.resistance2.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
