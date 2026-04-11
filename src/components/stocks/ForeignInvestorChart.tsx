"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { ForeignInvestorData, fetchForeignInvestorData } from "@/lib/stocks/cafef-api";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ForeignInvestorChartProps {
  ticker: string;
}

function formatCurrency(value: number | undefined): string {
  if (!value) return "0";
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function ForeignInvestorChart({ ticker }: ForeignInvestorChartProps) {
  const [data, setData] = useState<ForeignInvestorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    let isMounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const result = await fetchForeignInvestorData(ticker);
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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Foreign Investor (Khối Ngoại)
        </h3>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
          Foreign Investor (Khối Ngoại)
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {error || "No data available"}
          </div>
        </div>
      </div>
    );
  }

  const netValue = data.buyValue - data.sellValue;
  const netValuePercent = data.buyValue + data.sellValue > 0 
    ? ((netValue / (data.buyValue + data.sellValue)) * 100).toFixed(1)
    : "0";

  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Outfit, sans-serif",
      sparkline: { enabled: false },
    },
    colors: ["#10b981", "#ef4444"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        borderRadius: 4,
        dataLabels: { position: "top" },
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Buy", "Sell"],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#9ca3af", fontSize: "12px" },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#9ca3af", fontSize: "12px" },
        formatter: (value: number) => formatCurrency(value),
      },
    },
    grid: {
      borderColor: "#e5e7eb",
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      strokeDashArray: 4,
    },
    legend: { show: false },
    tooltip: {
      enabled: true,
      theme: "light",
      y: { formatter: (value: number) => formatCurrency(value) },
      style: { fontSize: "12px" },
    },
  };

  const chartData = [
    {
      name: "Trading Value",
      data: [data.buyValue, data.sellValue],
    },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/3">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Foreign Investor (Khối Ngoại)
        </h3>
        <div className={`rounded-lg px-3 py-1 text-sm font-bold ${
          netValue >= 0 
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }`}>
          {netValue >= 0 ? "+" : ""}{netValuePercent}%
        </div>
      </div>

      <div className="space-y-4">
        {/* Chart */}
        <div className="h-80">
          <ReactApexChart options={chartOptions} series={chartData} type="bar" height="100%" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 sm:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 dark:text-green-400">Buy Value</p>
                <p className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(data.buyValue)}
                </p>
              </div>
              <div className="text-2xl opacity-20">📈</div>
            </div>
          </div>

          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Sell Value</p>
                <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(data.sellValue)}
                </p>
              </div>
              <div className="text-2xl opacity-20">📉</div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${
            netValue >= 0 
              ? "bg-blue-50 dark:bg-blue-900/20"
              : "bg-orange-50 dark:bg-orange-900/20"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${
                  netValue >= 0 
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-orange-700 dark:text-orange-400"
                }`}>
                  Net Value
                </p>
                <p className={`mt-1 text-lg font-bold ${
                  netValue >= 0 
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}>
                  {netValue >= 0 ? "+" : ""}{formatCurrency(netValue)}
                </p>
              </div>
              <div className="text-2xl">{netValue >= 0 ? "✨" : "⚠️"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
