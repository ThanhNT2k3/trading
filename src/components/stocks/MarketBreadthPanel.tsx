"use client";

import React from "react";
import {
  BreadthMetrics,
  MovingAverageMetrics,
  PowerMetrics,
  VolumeMomentumMetrics,
} from "@/types/stocks";

interface MarketBreadthPanelProps {
  breadth: BreadthMetrics;
  momentum: VolumeMomentumMetrics;
  maMetrics: MovingAverageMetrics;
  powerMetrics: PowerMetrics;
}

function pct(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(2)}%`;
}

export default function MarketBreadthPanel({
  breadth,
  momentum,
  maMetrics,
  powerMetrics,
}: MarketBreadthPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Breadth Metrics</h3>
        <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <p>Advancers / Decliners / Flat: {breadth.advancers}/{breadth.decliners}/{breadth.flats}</p>
          <p>A/D Ratio: {breadth.advanceDeclineRatio === null ? "N/A" : breadth.advanceDeclineRatio.toFixed(2)}</p>
          <p>
            H/L Ratio (52W): {breadth.hlRatio === null ? "N/A" : breadth.hlRatio.toFixed(2)}
            {breadth.hlIsEstimated ? " (estimated)" : ""}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Momentum & Power</h3>
        <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Volume Momentum: {momentum.value === null ? "N/A" : `${(momentum.value * 100).toFixed(2)}%`} (
            {momentum.state})
          </p>
          <p>
            Stocks above MA20 / MA50: {pct(maMetrics.aboveMa20Percent)} / {pct(maMetrics.aboveMa50Percent)}
          </p>
          <p>Demand / Supply: {pct((powerMetrics.demandAvg ?? 0) * 100)} / {pct((powerMetrics.supplyAvg ?? 0) * 100)}</p>
          <p>
            Power Index: {powerMetrics.powerIndexAvg === null ? "N/A" : powerMetrics.powerIndexAvg.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
