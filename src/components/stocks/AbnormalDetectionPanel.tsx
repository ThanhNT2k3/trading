"use client";

import React from "react";
import { AbnormalSignal } from "@/types/stocks";

interface AbnormalDetectionPanelProps {
  signals: AbnormalSignal[];
  isLoading: boolean;
  onSelectTicker: (ticker: string) => void;
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatRatio(value: number | null) {
  if (value === null) return "N/A";
  return `${value.toFixed(2)}x`;
}

function formatMoneyCompact(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
}

function formatType(type: AbnormalSignal["types"][number]) {
  if (type === "PRICE_SHOCK") return "Price shock";
  if (type === "VOLUME_SHOCK") return "Volume shock";
  if (type === "TURNOVER_SPIKE") return "Turnover spike";
  if (type === "FLOW_ANOMALY") return "Flow anomaly";
  return "Range break";
}

function getSeverityClass(severity: number) {
  if (severity >= 90) {
    return "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400";
  }
  if (severity >= 80) {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400";
  }
  return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
}

function getRankClass(rank: AbnormalSignal["rank"]) {
  if (rank === "A") {
    return "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400";
  }
  if (rank === "B") {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400";
  }
  return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
}

export default function AbnormalDetectionPanel({
  signals,
  isLoading,
  onSelectTicker,
}: AbnormalDetectionPanelProps) {
  const upCount = signals.filter((signal) => signal.direction === "UP").length;
  const downCount = signals.filter((signal) => signal.direction === "DOWN").length;
  const rankA = signals.filter((signal) => signal.rank === "A").length;
  const rankB = signals.filter((signal) => signal.rank === "B").length;
  const rankC = signals.filter((signal) => signal.rank === "C").length;
  const strongest = signals[0] ?? null;
  const avgSeverity =
    signals.length > 0
      ? signals.reduce((sum, signal) => sum + signal.severity, 0) / signals.length
      : null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Abnormal Detection
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Balanced abnormal events
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Liquidity-aware anomalies with A/B/C alert ranking to prioritize daily picks.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5 lg:min-w-[640px]">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Candidates</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{signals.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Rank A</p>
            <p className="mt-1 text-xl font-semibold text-error-600 dark:text-error-400">{rankA}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Rank B</p>
            <p className="mt-1 text-xl font-semibold text-warning-600 dark:text-warning-400">{rankB}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Rank C</p>
            <p className="mt-1 text-xl font-semibold text-success-700 dark:text-success-400">{rankC}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg severity</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {avgSeverity === null ? "-" : avgSeverity.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading abnormal signals">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            No abnormal events under current filters.
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try wider date range or reduce liquidity threshold to surface more daily picks.
          </p>
        </div>
      ) : (
        <div className="max-h-[560px] overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/70">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3">Ticker</th>
                <th className="px-3 py-3 text-right">Severity</th>
                <th className="px-3 py-3 text-right">Rank</th>
                <th className="px-3 py-3">Types</th>
                <th className="px-3 py-3">Price / Liquidity</th>
                <th className="px-3 py-3">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {signals.map((signal) => (
                <tr
                  key={`${signal.ticker}-${signal.date}`}
                  className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  onClick={() => onSelectTicker(signal.ticker)}
                >
                  <td className="px-3 py-4">
                    <div className="font-semibold text-gray-900 dark:text-white">{signal.ticker}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {signal.exchange} • {signal.date}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getSeverityClass(signal.severity)}`}>
                      {signal.severity}
                    </span>
                    <div className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {signal.direction} • {signal.evidenceCount} evidences
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Priority {signal.priorityScore.toFixed(1)}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRankClass(signal.rank)}`}>
                      {signal.rank}
                    </span>
                    <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Pick priority
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex max-w-80 flex-wrap gap-1.5">
                      {signal.types.map((type) => (
                        <span
                          key={type}
                          className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300"
                        >
                          {formatType(type)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">1D return</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPercent(signal.metrics.return1d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">3D return</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPercent(signal.metrics.return3d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Turnover 20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatMoneyCompact(signal.metrics.avgTradeValue20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Turnover 5D/20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatRatio(signal.metrics.turnoverRatio5dTo20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Volume 1D/20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatRatio(signal.metrics.volumeRatio1dTo20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">RS 20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPercent(signal.metrics.relativeStrength20d)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <p className="max-w-xl text-xs leading-5 text-gray-600 dark:text-gray-300">
                      {signal.explanations.slice(0, 3).join(" ")}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {strongest ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Strongest current shock: <span className="font-semibold text-gray-700 dark:text-gray-200">{strongest.ticker}</span> ({strongest.severity})
        </p>
      ) : null}
    </section>
  );
}
