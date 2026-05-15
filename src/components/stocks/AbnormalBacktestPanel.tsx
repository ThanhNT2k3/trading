"use client";

import React from "react";
import { AbnormalBacktestSummary, AbnormalSignalType } from "@/types/stocks";

interface AbnormalBacktestPanelProps {
  summary: AbnormalBacktestSummary;
  isLoading: boolean;
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatReturn(value: number | null) {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatType(type: AbnormalSignalType) {
  if (type === "PRICE_SHOCK") return "Price shock";
  if (type === "VOLUME_SHOCK") return "Volume shock";
  if (type === "TURNOVER_SPIKE") return "Turnover spike";
  if (type === "FLOW_ANOMALY") return "Flow anomaly";
  return "Range break";
}

export default function AbnormalBacktestPanel({
  summary,
  isLoading,
}: AbnormalBacktestPanelProps) {
  const threeDayStats = summary.windows.find((item) => item.horizon === 3) ?? null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Abnormal Validation
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Backtest snapshot ({summary.lookbackDays} sessions)
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Event-study performance after strict abnormal signals.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[560px]">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Signals</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{summary.totalSignals}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Coverage</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{summary.coverageTickers}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">3D win-rate</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatPercent(threeDayStats?.winRate ?? null)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">3D avg return</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatReturn(threeDayStats?.avgReturn ?? null)}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading abnormal backtest">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : summary.totalSignals === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Not enough abnormal samples for backtest under current filters.
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Increase lookback or relax liquidity threshold to evaluate more events.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 xl:col-span-2">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Forward Return Windows</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-2 py-2">Horizon</th>
                    <th className="px-2 py-2 text-right">Samples</th>
                    <th className="px-2 py-2 text-right">Win-rate</th>
                    <th className="px-2 py-2 text-right">Avg return</th>
                    <th className="px-2 py-2 text-right">Median</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {summary.windows.map((item) => (
                    <tr key={item.horizon}>
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">{item.horizon}D</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{item.sampleSize}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{formatPercent(item.winRate)}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{formatReturn(item.avgReturn)}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{formatReturn(item.medianReturn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">By Direction (3D)</h4>
            <div className="space-y-3">
              {summary.byDirection.map((item) => (
                <div key={item.direction} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{item.direction}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Samples</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">{item.sampleSize}</span>
                    <span>Avg severity</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">
                      {item.avgSeverity === null ? "N/A" : item.avgSeverity.toFixed(1)}
                    </span>
                    <span>3D win-rate</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">{formatPercent(item.winRate3d)}</span>
                    <span>3D avg return</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">{formatReturn(item.avgReturn3d)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 xl:col-span-3">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">By Event Type (3D)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2 text-right">Samples</th>
                    <th className="px-2 py-2 text-right">Win-rate 3D</th>
                    <th className="px-2 py-2 text-right">Avg return 3D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {summary.byType.map((item) => (
                    <tr key={item.type}>
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">{formatType(item.type)}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{item.sampleSize}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{formatPercent(item.winRate3d)}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{formatReturn(item.avgReturn3d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 xl:col-span-3">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Alert Rank Performance (3D)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-2 py-2">Rank</th>
                    <th className="px-2 py-2 text-right">Samples</th>
                    <th className="px-2 py-2 text-right">Win-rate 3D</th>
                    <th className="px-2 py-2 text-right">Avg return 3D</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {summary.byRank.map((item) => (
                    <tr key={item.rank}>
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">{item.rank}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{item.sampleSize}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{formatPercent(item.winRate3d)}</td>
                      <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{formatReturn(item.avgReturn3d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
