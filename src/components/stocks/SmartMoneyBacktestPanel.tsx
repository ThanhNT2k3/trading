"use client";

import React from "react";
import { SmartMoneyBacktestSummary, SmartMoneySignal } from "@/types/stocks";

interface SmartMoneyBacktestPanelProps {
  summary: SmartMoneyBacktestSummary;
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

function formatScore(value: number | null) {
  if (value === null) return "N/A";
  return value.toFixed(1);
}

function getStateLabel(state: SmartMoneySignal["state"]) {
  if (state === "confirmed") return "Confirmed";
  if (state === "building") return "Building";
  return "Early watch";
}

function formatStateList(states: SmartMoneySignal["state"][] | null) {
  if (states === null) return "All";
  return states.map(getStateLabel).join(", ");
}

export default function SmartMoneyBacktestPanel({
  summary,
  isLoading,
}: SmartMoneyBacktestPanelProps) {
  const tenDayStats = summary.windows.find((item) => item.horizon === 10) ?? null;
  const recommendation = summary.recommendedWinRate;
  const exchangeRecommendations = summary.recommendationsByExchange;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Smart Money Validation
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Backtest snapshot ({summary.lookbackDays} sessions)
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Historical forward-return check from strict signal triggers.
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
            <p className="text-xs text-gray-500 dark:text-gray-400">10D win-rate</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatPercent(tenDayStats?.winRate ?? null)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">10D avg return</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatReturn(tenDayStats?.avgReturn ?? null)}
            </p>
          </div>
        </div>
      </div>

      {recommendation ? (
        <div className="mb-5 rounded-xl border border-success-200 bg-success-50/70 p-4 dark:border-success-500/30 dark:bg-success-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-success-700 dark:text-success-300">
                Win-rate priority config
              </p>
              <p className="mt-1 text-sm text-success-700 dark:text-success-300">
                Score ≥ {recommendation.config.minScore}, Evidence ≥ {recommendation.config.minEvidence}, RS ≥{" "}
                {recommendation.config.minRelativeStrength20d === null
                  ? "Any"
                  : `${recommendation.config.minRelativeStrength20d.toFixed(1)}%`}
                , State: {formatStateList(recommendation.config.allowedStates)}
              </p>
            </div>
            <div className="text-sm text-success-700 dark:text-success-300">
              <p>scope {recommendation.scope}</p>
              <p>10D win-rate {formatPercent(recommendation.winRate10d)}</p>
              <p>samples {recommendation.sampleSize}</p>
            </div>
          </div>
          {recommendation.walkForward ? (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-success-700 dark:text-success-300 sm:grid-cols-4">
              <div className="rounded-md bg-white/60 px-2 py-1 dark:bg-success-500/10">
                Walk-forward {formatPercent(recommendation.walkForward.winRate10d)}
              </div>
              <div className="rounded-md bg-white/60 px-2 py-1 dark:bg-success-500/10">
                Worst slice {formatPercent(recommendation.walkForward.worstSliceWinRate10d)}
              </div>
              <div className="rounded-md bg-white/60 px-2 py-1 dark:bg-success-500/10">
                Dispersion {formatPercent(recommendation.walkForward.dispersion10d)}
              </div>
              <div className="rounded-md bg-white/60 px-2 py-1 dark:bg-success-500/10">
                Robustness {formatScore(recommendation.robustnessScore)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {exchangeRecommendations.length > 0 ? (
        <div className="mb-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Exchange-specific win-rate config
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs dark:divide-gray-800">
              <thead>
                <tr className="text-left uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-2 py-2">Scope</th>
                  <th className="px-2 py-2 text-right">Score</th>
                  <th className="px-2 py-2 text-right">Evidence</th>
                  <th className="px-2 py-2 text-right">RS floor</th>
                  <th className="px-2 py-2 text-right">Win-rate</th>
                  <th className="px-2 py-2 text-right">Samples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {exchangeRecommendations.map((item) => (
                  <tr key={item.scope}>
                    <td className="px-2 py-2 font-semibold text-gray-900 dark:text-white">{item.scope}</td>
                    <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{item.config.minScore}</td>
                    <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{item.config.minEvidence}</td>
                    <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">
                      {item.config.minRelativeStrength20d === null
                        ? "Any"
                        : `${item.config.minRelativeStrength20d.toFixed(1)}%`}
                    </td>
                    <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">
                      {formatPercent(item.winRate10d)}
                    </td>
                    <td className="px-2 py-2 text-right text-gray-700 dark:text-gray-300">{item.sampleSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading smart money backtest">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : summary.totalSignals === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Not enough triggered signals for backtest under current filters.
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Expand date range or reduce filtering constraints to evaluate more samples.
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
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">By Signal State (10D)</h4>
            <div className="space-y-3">
              {summary.byState.map((item) => (
                <div key={item.state} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{getStateLabel(item.state)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Samples</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">{item.sampleSize}</span>
                    <span>Avg score</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">
                      {item.avgScore === null ? "N/A" : item.avgScore.toFixed(1)}
                    </span>
                    <span>10D win-rate</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">{formatPercent(item.winRate10d)}</span>
                    <span>10D avg return</span>
                    <span className="text-right font-medium text-gray-700 dark:text-gray-200">{formatReturn(item.avgReturn10d)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 xl:col-span-3">
            <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Score Buckets (10D)</h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summary.scoreBuckets.map((bucket) => (
                <div key={bucket.label} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{bucket.label}</p>
                  <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>Samples</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{bucket.sampleSize}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Win-rate</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{formatPercent(bucket.winRate10d)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Avg return</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{formatReturn(bucket.avgReturn10d)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
