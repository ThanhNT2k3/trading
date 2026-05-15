"use client";

import React from "react";
import {
  BreadthMetrics,
  BreadthRegimeSignal,
  PowerMetrics,
  StockRow,
  VolumeMomentumMetrics,
} from "@/types/stocks";

interface MarketBreadthPanelProps {
  breadth: BreadthMetrics;
  momentum: VolumeMomentumMetrics;
  powerMetrics: PowerMetrics;
  rows: StockRow[];
  regime: BreadthRegimeSignal;
}

function pct(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

function movingAverage(values: number[], window: number): number | null {
  if (values.length < window) return null;
  const slice = values.slice(-window);
  return slice.reduce((sum, value) => sum + value, 0) / window;
}

function getMaStats(rows: StockRow[], window: 10 | 20 | 50) {
  const eligible = rows.filter((row) => {
    const closes = row.points.map((point) => point.close).filter((value) => Number.isFinite(value));
    const latestClose = row.latestClose;
    return latestClose !== null && movingAverage(closes, window) !== null;
  });

  const above = eligible.filter((row) => {
    const closes = row.points.map((point) => point.close).filter((value) => Number.isFinite(value));
    const average = movingAverage(closes, window);
    return row.latestClose !== null && average !== null && row.latestClose > average;
  }).length;

  const total = eligible.length;
  const below = Math.max(total - above, 0);

  return {
    label: `MA${window}`,
    above,
    below,
    total,
    abovePercent: total > 0 ? (above / total) * 100 : null,
    belowPercent: total > 0 ? (below / total) * 100 : null,
  };
}

function getTone(value: number | null) {
  if (value === null) return "No data yet";
  if (value >= 60) return "Broad strength";
  if (value >= 45) return "Balanced";
  return "Defensive";
}

function signedPct(value: number | null): string {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getRegimeToneClass(tone: BreadthRegimeSignal["tone"]) {
  if (tone === "success") {
    return {
      badge: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400",
      border: "border-success-200 dark:border-success-500/30",
      text: "text-success-700 dark:text-success-400",
    };
  }
  if (tone === "warning") {
    return {
      badge: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400",
      border: "border-warning-200 dark:border-warning-500/30",
      text: "text-warning-700 dark:text-warning-400",
    };
  }
  if (tone === "error") {
    return {
      badge: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400",
      border: "border-error-200 dark:border-error-500/30",
      text: "text-error-700 dark:text-error-400",
    };
  }
  return {
    badge: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-800",
    text: "text-gray-700 dark:text-gray-300",
  };
}

export default function MarketBreadthPanel({
  breadth,
  momentum,
  powerMetrics,
  rows,
  regime,
}: MarketBreadthPanelProps) {
  const maBars = [getMaStats(rows, 10), getMaStats(rows, 20), getMaStats(rows, 50)];
  const regimeTone = getRegimeToneClass(regime.tone);

  const highLowTotal = Math.max(breadth.highCount + breadth.lowCount, 1);
  const highWidth = (breadth.highCount / highLowTotal) * 100;
  const lowWidth = (breadth.lowCount / highLowTotal) * 100;
  const leadingMa = maBars[1]?.abovePercent ?? null;
  const momentumValue = momentum.value === null ? null : momentum.value * 100;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Market Breadth Depth
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            How many stocks are carrying the market?
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-success-50 px-3 py-1 text-success-700 dark:bg-success-500/10 dark:text-success-400">
            {breadth.advancers} advancing
          </span>
          <span className="rounded-full bg-error-50 px-3 py-1 text-error-700 dark:bg-error-500/10 dark:text-error-400">
            {breadth.decliners} declining
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600 dark:bg-white/10 dark:text-gray-300">
            A/D {breadth.advanceDeclineRatio === null ? "N/A" : breadth.advanceDeclineRatio.toFixed(2)}
          </span>
        </div>
      </div>

      <div className={`mb-5 rounded-xl border ${regimeTone.border} bg-white p-4 dark:bg-white/[0.03]`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Breadth Regime
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h4 className={`text-xl font-semibold ${regimeTone.text}`}>{regime.label}</h4>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${regimeTone.badge}`}>
                Divergence {signedPct(regime.divergence)}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              {regime.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[520px]">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">VNINDEX 20D</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {signedPct(regime.indexChange20d)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">MA20 Breadth</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {pct(regime.ma20Breadth)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">MA20 20D</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {signedPct(regime.ma20BreadthChange20d)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">MA50 Breadth</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {pct(regime.ma50Breadth)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">% Stocks vs Moving Average</h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getTone(leadingMa)} on MA20</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-success-500" />
                Above MA
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-error-500" />
                Below MA
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {maBars.map((bar) => (
              <div key={bar.label} className="grid grid-cols-[52px_1fr] items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{bar.label}</span>
                <div>
                  <div className="flex h-12 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
                    <div
                      className="flex min-w-0 items-center justify-center bg-success-500 text-xs font-semibold text-white"
                      style={{ width: `${bar.abovePercent ?? 0}%` }}
                    >
                      {bar.abovePercent !== null && bar.abovePercent >= 18 ? `${bar.above} (${pct(bar.abovePercent)})` : ""}
                    </div>
                    <div
                      className="flex min-w-0 items-center justify-center bg-error-500 text-xs font-semibold text-white"
                      style={{ width: `${bar.belowPercent ?? 0}%` }}
                    >
                      {bar.belowPercent !== null && bar.belowPercent >= 18 ? `${bar.below} (${pct(bar.belowPercent)})` : ""}
                    </div>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-gray-500 dark:text-gray-500">
                    <span>{bar.above} above</span>
                    <span>{bar.total} eligible</span>
                    <span>{bar.below} below</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">52-Week New High vs Low</h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {breadth.hlIsEstimated ? "Estimated from available history" : "Full 52-week history"}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
              H/L {breadth.hlRatio === null ? "N/A" : breadth.hlRatio.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex h-14 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-900">
              <div
                className="flex items-center justify-center bg-error-500 text-sm font-semibold text-white"
                style={{ width: `${lowWidth}%` }}
              >
                {breadth.lowCount > 0 ? `${breadth.lowCount} lows` : ""}
              </div>
              <div
                className="flex items-center justify-center bg-success-500 text-sm font-semibold text-white"
                style={{ width: `${highWidth}%` }}
              >
                {breadth.highCount > 0 ? `${breadth.highCount} highs` : ""}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-error-50 p-3 dark:bg-error-500/10">
                <p className="text-xs text-error-700 dark:text-error-300">New lows</p>
                <p className="mt-1 text-2xl font-semibold text-error-700 dark:text-error-400">{breadth.lowCount}</p>
              </div>
              <div className="rounded-lg bg-success-50 p-3 dark:bg-success-500/10">
                <p className="text-xs text-success-700 dark:text-success-300">New highs</p>
                <p className="mt-1 text-2xl font-semibold text-success-700 dark:text-success-400">{breadth.highCount}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Volume momentum</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">{pct(momentumValue)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Demand / Supply</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {pct((powerMetrics.demandAvg ?? 0) * 100)} / {pct((powerMetrics.supplyAvg ?? 0) * 100)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Power index</p>
              <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                {powerMetrics.powerIndexAvg === null ? "N/A" : powerMetrics.powerIndexAvg.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
