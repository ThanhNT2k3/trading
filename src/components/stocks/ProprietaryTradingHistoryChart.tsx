"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { InvestorHistoryData } from "@/types/stocks";
import { fetchProprietaryTradingHistory } from "@/lib/stocks/cafef-api";
import ComponentCard from "@/components/common/ComponentCard";

// Dynamically import ApexCharts to avoid SSR issues
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ProprietaryTradingHistoryChartProps {
  symbol?: string;
}

export default function ProprietaryTradingHistoryChart({
  symbol = "VNINDEX",
}: ProprietaryTradingHistoryChartProps) {
  const [data, setData] = useState<InvestorHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<"value" | "volume">("value");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const historyData = await fetchProprietaryTradingHistory(symbol, 20);
        setData(historyData);
      } catch (error) {
        console.error("Error loading proprietary trading history:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [symbol]);

  if (loading) {
    return (
      <ComponentCard title="🏢 Proprietary Trading History (Tự Doanh)">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading data...</p>
        </div>
      </ComponentCard>
    );
  }

  if (data.length === 0) {
    return (
      <ComponentCard title="🏢 Proprietary Trading History (Tự Doanh)">
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      </ComponentCard>
    );
  }

  const chartData = {
    series: [
      {
        name: "Buy Value (VNĐ)",
        data: data.map((d) => Math.round(d.buyVal / 1000000000)), // Convert to tỷ
      },
      {
        name: "Sell Value (VNĐ)",
        data: data.map((d) => Math.round(d.sellVal / 1000000000)), // Convert to tỷ
      },
    ],
    categories: data.map((d) => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
  };

  const volumeChartData = {
    series: [
      {
        name: "Buy Volume",
        data: data.map((d) => Math.round(d.buyVol / 1000000)), // Convert to triệu
      },
      {
        name: "Sell Volume",
        data: data.map((d) => Math.round(d.sellVol / 1000000)), // Convert to triệu
      },
    ],
    categories: data.map((d) => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
  };

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      stacked: false,
      height: 350,
      toolbar: {
        show: true,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
      },
    },
    dataLabels: {
      enabled: false,
    },
    colors: ["#8b5cf6", "#f97316"],
    xaxis: {
      categories:
        selectedMetric === "value"
          ? chartData.categories
          : volumeChartData.categories,
    },
    yaxis: {
      title: {
        text: selectedMetric === "value" ? "Value (Tỷ VNĐ)" : "Volume (Triệu)",
      },
    },
    legend: {
      position: "top",
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return selectedMetric === "value" ? `${val} tỷ VNĐ` : `${val} triệu`;
        },
      },
    },
  };

  return (
    <ComponentCard title="🏢 Proprietary Trading History (Tự Doanh)">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setSelectedMetric("value")}
          className={`px-4 py-2 rounded font-medium transition ${
            selectedMetric === "value"
              ? "bg-purple-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Trading Value
        </button>
        <button
          onClick={() => setSelectedMetric("volume")}
          className={`px-4 py-2 rounded font-medium transition ${
            selectedMetric === "volume"
              ? "bg-purple-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Trading Volume
        </button>
      </div>

      <div className="w-full">
        <Chart
          options={options}
          series={
            selectedMetric === "value" ? chartData.series : volumeChartData.series
          }
          type="bar"
          height={350}
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-3">
        <h4 className="font-semibold text-gray-700">Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Avg Buy Value</p>
            <p className="text-lg font-bold text-purple-600">
              {(data.reduce((sum, d) => sum + d.buyVal, 0) / data.length / 1000000000).toFixed(1)} tỷ
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Sell Value</p>
            <p className="text-lg font-bold text-orange-600">
              {(data.reduce((sum, d) => sum + d.sellVal, 0) / data.length / 1000000000).toFixed(1)} tỷ
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Value</p>
            <p className="text-lg font-bold text-blue-600">
              {(data.reduce((sum, d) => sum + d.netVal, 0) / 1000000000).toFixed(1)} tỷ
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Buying Pressure</p>
            <p className="text-lg font-bold">
              {(
                ((data.filter((d) => d.netVal > 0).length / data.length) * 100)
              ).toFixed(0)}
              %
            </p>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
