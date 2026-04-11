"use client";

import React from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { StockRow } from "@/types/stocks";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface StockLineChartProps {
  row: StockRow | null;
}

export default function StockLineChart({ row }: StockLineChartProps) {
  if (!row || row.points.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No chart data for selected ticker.
        </p>
      </div>
    );
  }

  const labels = row.points.map((point) =>
    new Date(point.time * 1000).toLocaleDateString("en-GB"),
  );
  const values = row.points.map((point) => point.close);
  const data = {
    labels,
    datasets: [
      {
        label: `${row.ticker} Close`,
        data: values,
        borderColor: "#465FFF",
        borderWidth: 2,
        pointRadius: 1.8,
        pointHoverRadius: 3.5,
        fill: true,
        backgroundColor: "rgba(70, 95, 255, 0.12)",
        tension: 0.25,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: { display: true, position: "top" as const },
      tooltip: {
        callbacks: {
          label: (context: any) =>
            ` ${(context.parsed?.y || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 8,
        },
        grid: { display: false },
      },
      y: {
        ticks: {
          callback: (value: number | string) =>
            typeof value === "number"
              ? value.toLocaleString("en-US", { maximumFractionDigits: 2 })
              : value,
        },
      },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-1 text-sm font-semibold text-gray-800 dark:text-white/90">
        {row.ticker} Close Price
      </h3>
      
      <div className="h-[320px] w-full">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
