"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { InvestorHistoryData } from "@/types/stocks";
import { fetchProprietaryTradingHistory } from "@/lib/stocks/cafef-api";
import ComponentCard from "@/components/common/ComponentCard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ProprietaryTradingHistoryStackedProps {
  symbol?: string;
}

export default function ProprietaryTradingHistoryStacked({
  symbol = "VNINDEX",
}: ProprietaryTradingHistoryStackedProps) {
  const [data, setData] = useState<InvestorHistoryData[]>([]);
  const [loading, setLoading] = useState(true);

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
      <ComponentCard title="🏢 Proprietary Trading - Buy vs Sell (Tự Doanh)">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading data...</p>
        </div>
      </ComponentCard>
    );
  }

  if (data.length === 0) {
    return (
      <ComponentCard title="🏢 Proprietary Trading - Buy vs Sell (Tự Doanh)">
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      </ComponentCard>
    );
  }

  // Detect today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Transform data for stacked bar
  const processedData = data.map((item, index) => {
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);
    const isToday = itemDate.getTime() === today.getTime();

    return {
      date: itemDate,
      dateStr: `${itemDate.getMonth() + 1}/${itemDate.getDate()}`,
      buyVal: (item.buyVal / 1000000000), // tỷ VNĐ - no rounding
      sellVal: (item.sellVal / 1000000000), // tỷ VNĐ - no rounding
      isToday,
      index,
    };
  });

  const chartData = {
    series: [
      {
        name: "Buy Value (Tỷ VNĐ)",
        data: processedData.map((d) => d.buyVal),
      },
      {
        name: "Sell Value (Tỷ VNĐ)",
        data: processedData.map((d) => -d.sellVal), // Negative for opposite side
      },
    ],
    categories: processedData.map((d) => d.dateStr),
  };

  const todayIndex = processedData.findIndex((d) => d.isToday);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      height: 350,
      toolbar: { show: true },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%",
        borderRadius: 2,
      },
    },
    colors: ["#8b5cf6", "#f97316"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartData.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Value (Tỷ VNĐ)" },
      labels: {
        formatter: (val) => Math.abs(val).toString(),
      },
    },
    legend: { position: "top" as const },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val) => {
          return `${Math.abs(val)} tỷ VNĐ`;
        },
      },
    },
    states: {
      active: {
        filter: { type: "none" },
      },
    },
  };

  return (
    <ComponentCard title="🏢 Proprietary Trading - Buy vs Sell (Tự Doanh)">
      <div className="w-full">
        <Chart
          options={options}
          series={chartData.series}
          type="bar"
          height={350}
        />
      </div>

      {todayIndex >= 0 && (
        <div className="mt-4 p-3 bg-purple-50 border-l-4 border-purple-500 rounded text-sm text-purple-800 dark:bg-purple-900/20 dark:border-purple-400 dark:text-purple-300">
          📍 Today's Data Highlighted: Buy {processedData[todayIndex].buyVal.toFixed(2)}B VNĐ | Sell{" "}
          {processedData[todayIndex].sellVal.toFixed(2)}B VNĐ
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 bg-purple-50 rounded dark:bg-purple-900/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">Avg Buy</p>
          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {(data.reduce((sum, d) => sum + d.buyVal, 0) / data.length / 1000000000).toFixed(2)}{" "}
            tỷ
          </p>
        </div>
        <div className="p-3 bg-orange-50 rounded dark:bg-orange-900/20">
          <p className="text-xs text-gray-600 dark:text-gray-400">Avg Sell</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {(data.reduce((sum, d) => sum + d.sellVal, 0) / data.length / 1000000000).toFixed(2)}{" "}
            tỷ
          </p>
        </div>
      </div>
    </ComponentCard>
  );
}
