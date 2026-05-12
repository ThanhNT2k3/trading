"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  StockMarketData,
  fetchForeignInvestorMarketData,
  fetchProprietaryTradingMarketData,
} from "@/lib/stocks/cafef-api";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type FlowMode = "foreign" | "proprietary";

interface FlowState {
  buy: StockMarketData[];
  sell: StockMarketData[];
}

function formatBillions(value: number): string {
  return `${(Math.abs(value) / 1000000000).toFixed(1)}B`;
}

function getChangeLabel(stock: StockMarketData): string {
  const prefix = stock.changePricePercent > 0 ? "+" : "";
  return `${prefix}${stock.changePricePercent.toFixed(1)}%`;
}

function isValidFlowRow(stock: StockMarketData): boolean {
  const value = Math.abs(stock.value);
  if (!Number.isFinite(value) || value <= 0) return false;

  const expectedValue = stock.currentPrice * stock.volume * 1000;
  if (expectedValue > 0) {
    const ratio = value / expectedValue;
    return ratio > 0.05 && ratio < 20;
  }

  return value < 1000000000000;
}

function topFlowRows(data: StockMarketData[], limit = 10): StockMarketData[] {
  return data
    .filter(isValidFlowRow)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}

function buildChartOptions(
  title: string,
  data: StockMarketData[],
  tone: "buy" | "sell",
): ApexCharts.ApexOptions {
  const maxValue = Math.max(...data.map((stock) => Math.abs(stock.value) / 1000000000), 1);

  return {
    chart: {
      type: "bar",
      height: 360,
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "68%",
        dataLabels: { position: tone === "buy" ? "right" : "left" },
      },
    },
    colors: [tone === "buy" ? "#12b76a" : "#f04438"],
    dataLabels: {
      enabled: true,
      formatter: (_value, options) => {
        const stock = data[options.dataPointIndex];
        if (!stock) return "";
        return `${formatBillions(stock.value)} (${getChangeLabel(stock)})`;
      },
      style: {
        fontSize: "12px",
        fontWeight: 600,
        colors: ["#475467"],
      },
      background: { enabled: false },
      offsetX: tone === "buy" ? 10 : -10,
    },
    grid: {
      borderColor: "#eef2f6",
      strokeDashArray: 0,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: true } },
      padding: { left: 8, right: 28 },
    },
    legend: { show: false },
    title: {
      text: title,
      style: {
        fontSize: "15px",
        fontWeight: 700,
        color: "#101828",
      },
    },
    tooltip: {
      y: {
        formatter: (_value, options) => {
          const stock = data[options.dataPointIndex];
          if (!stock) return "";
          return `${formatBillions(stock.value)} VND, ${getChangeLabel(stock)}`;
        },
      },
    },
    xaxis: {
      categories: data.map((stock) => stock.symbol),
      max: Math.ceil(maxValue * 1.18),
      labels: {
        formatter: (value) => `${Number(value).toFixed(0)}B`,
        style: { colors: "#667085", fontSize: "11px" },
      },
      title: {
        text: "Value (Billion VND)",
        style: { color: "#667085", fontSize: "12px", fontWeight: 600 },
      },
    },
    yaxis: {
      labels: {
        style: { colors: "#475467", fontSize: "12px", fontWeight: 700 },
      },
    },
  };
}

function ChartPanel({
  title,
  data,
  tone,
}: {
  title: string;
  data: StockMarketData[];
  tone: "buy" | "sell";
}) {
  const values = useMemo(() => data.map((stock) => Math.abs(stock.value) / 1000000000), [data]);
  const options = useMemo(() => buildChartOptions(title, data, tone), [data, title, tone]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <Chart
        options={options}
        series={[{ name: tone === "buy" ? "Buy value" : "Sell value", data: values }]}
        type="bar"
        height={360}
      />
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="h-5 w-48 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-white/10" />
        <div className="h-80 animate-pulse rounded-xl bg-gray-100 dark:bg-white/10" />
      </div>
    </div>
  );
}

function Top5StockersHorizontalBarComponent() {
  const [activeMode, setActiveMode] = useState<FlowMode>("foreign");
  const [foreignData, setForeignData] = useState<FlowState>({ buy: [], sell: [] });
  const [proprietaryData, setProprietaryData] = useState<FlowState>({ buy: [], sell: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [foreignBuy, foreignSell, proprietaryBuy, proprietarySell] = await Promise.all([
          fetchForeignInvestorMarketData("buy", abortController.signal),
          fetchForeignInvestorMarketData("sell", abortController.signal),
          fetchProprietaryTradingMarketData("BUYVALUE"),
          fetchProprietaryTradingMarketData("SELLVALUE"),
        ]);

        if (!isMounted) return;

        setForeignData({
          buy: topFlowRows(foreignBuy),
          sell: topFlowRows(foreignSell),
        });
        setProprietaryData({
          buy: topFlowRows(proprietaryBuy),
          sell: topFlowRows(proprietarySell),
        });
      } catch (err) {
        if (isMounted && !(err instanceof Error && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Failed to load trading highlights");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const activeData = activeMode === "foreign" ? foreignData : proprietaryData;
  const activeLabel = activeMode === "foreign" ? "Foreign" : "Proprietary";
  const netValue = [...activeData.buy, ...activeData.sell].reduce((sum, stock) => {
    const sign = activeData.buy.includes(stock) ? 1 : -1;
    return sum + sign * Math.abs(stock.value);
  }, 0);

  if (loading) return <LoadingPanel />;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
            Trading Highlights
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Top buy and sell pressure by investor group
          </h3>
          {error ? <p className="mt-2 text-sm text-error-600 dark:text-error-400">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
            {(["foreign", "proprietary"] as FlowMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveMode(mode)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  activeMode === mode
                    ? "bg-white text-brand-600 shadow-sm dark:bg-white/10 dark:text-brand-400"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {mode === "foreign" ? "Foreign" : "Proprietary"}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
            Net {activeLabel}:{" "}
            <span className={netValue >= 0 ? "text-success-600 dark:text-success-400" : "text-error-600 dark:text-error-400"}>
              {netValue >= 0 ? "+" : "-"}{formatBillions(netValue)}
            </span>
          </div>
        </div>
      </div>

      {activeData.buy.length === 0 && activeData.sell.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          No trading highlight data available.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <ChartPanel title={`${activeLabel}: Top Buy Stocks`} data={activeData.buy} tone="buy" />
          <ChartPanel title={`${activeLabel}: Top Sell Stocks`} data={activeData.sell} tone="sell" />
        </div>
      )}
    </section>
  );
}

export default memo(Top5StockersHorizontalBarComponent);
