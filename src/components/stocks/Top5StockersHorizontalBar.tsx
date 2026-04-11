"use client";

import React, { useEffect, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { StockMarketData, fetchForeignInvestorMarketData } from "@/lib/stocks/cafef-api";
import ComponentCard from "@/components/common/ComponentCard";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function Top5StockersHorizontalBarComponent() {
  const [buyData, setBuyData] = useState<StockMarketData[]>([]);
  const [sellData, setSellData] = useState<StockMarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [buy, sell] = await Promise.all([
          fetchForeignInvestorMarketData("buy", abortController.signal),
          fetchForeignInvestorMarketData("sell", abortController.signal),
        ]);
        if (isMounted) {
          setBuyData(buy.slice(0, 5));
          setSellData(sell.slice(0, 5));
        }
      } catch (error) {
        if (isMounted && !(error instanceof Error && error.name === "AbortError")) {
          console.error("Error loading top stocks:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  if (loading) {
    return (
      <ComponentCard title="📊 Top 5 Buying vs Selling (Khối Ngoại)">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading data...</p>
        </div>
      </ComponentCard>
    );
  }

  if (buyData.length === 0 && sellData.length === 0) {
    return (
      <ComponentCard title="📊 Top 5 Buying vs Selling (Khối Ngoại)">
        <div className="text-center py-8">
          <p className="text-gray-500">No data available</p>
        </div>
      </ComponentCard>
    );
  }

  // Prepare data for horizontal bar chart
  // Buy on the left (positive), Sell on the right (negative)
  const categories: string[] = [];
  const buyValues: number[] = [];
  const sellValues: number[] = [];

  // Add buy stocks
  buyData.forEach((stock) => {
    categories.push(stock.symbol);
    buyValues.push(Math.round(Math.abs(stock.value) / 1000000000)); // tỷ VNĐ
    sellValues.push(0);
  });

  // Add sell stocks (in reverse to align properly)
  sellData.slice().reverse().forEach((stock) => {
    categories.push(stock.symbol);
    buyValues.push(0);
    sellValues.push(-Math.round(Math.abs(stock.value) / 1000000000)); // negative for left side
  });

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "bar",
      height: 320,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        columnWidth: "65%",
        borderRadius: 2,
        dataLabels: {
          position: "top",
        },
      },
    },
    colors: ["#10b981", "#ef4444"],
    dataLabels: {
      enabled: true,
      textAnchor: "middle",
      style: {
        fontSize: "11px",
        colors: ["#666"],
      },
      formatter: (val: string | number | number[]) => {
        const numVal = typeof val === "number" ? val : 0;
        return Math.abs(numVal).toFixed(2);
      },
    },
    xaxis: {
      categories: categories,
      labels: {
        show: true,
        style: {
          fontSize: "11px",
        },
      },
    },
    yaxis: {
      title: {
        text: undefined,
      },
      labels: {
        style: {
          fontSize: "11px",
          fontWeight: 600,
        },
      },
    },
    legend: {
      position: "top" as const,
      horizontalAlign: "center" as const,
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val) => {
          return `${Math.abs(val)} tỷ VNĐ`;
        },
      },
    },
    grid: {
      padding: {
        left: 60,
        right: 20,
      },
    },
  };

  const chartData = {
    series: [
      {
        name: "Buy Value (Tỷ VNĐ)",
        data: buyValues,
      },
      {
        name: "Sell Value (Tỷ VNĐ)",
        data: sellValues,
      },
    ],
  };

  return (
    <ComponentCard title="📊 Top 5 Buying vs Selling (Khối Ngoại)">
      <div className="w-full">
        <Chart
          options={options}
          series={chartData.series}
          type="bar"
          height={320}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-green-50 rounded dark:bg-green-900/20">
          <p className="font-semibold text-green-700 dark:text-green-300">Top Buy</p>
          <p className="text-gray-600 dark:text-gray-400">
            {buyData[0]?.symbol} {(Math.abs(buyData[0]?.value || 0) / 1000000000).toFixed(2)}B VNĐ
          </p>
        </div>
        <div className="p-3 bg-red-50 rounded dark:bg-red-900/20">
          <p className="font-semibold text-red-700 dark:text-red-300">Top Sell</p>
          <p className="text-gray-600 dark:text-gray-400">
            {sellData[0]?.symbol} {(Math.abs(sellData[0]?.value || 0) / 1000000000).toFixed(2)}B VNĐ
          </p>
        </div>
      </div>
    </ComponentCard>
  );
}

// Memoize to prevent unnecessary re-renders from parent updates
export default memo(Top5StockersHorizontalBarComponent);
