"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SmartMoneyFilterConfig, SmartMoneySignal } from "@/types/stocks";

interface SmartMoneyAccumulationPanelProps {
  signals: SmartMoneySignal[];
  isLoading: boolean;
  onSelectTicker: (ticker: string) => void;
  filterConfig?: SmartMoneyFilterConfig | null;
}

const INITIAL_VISIBLE_ROWS = 8;
const VISIBLE_STEP = 8;

function formatPct(value: number | null) {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
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

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const decimals = value >= 100 ? 1 : 3;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getGradeClass(grade: SmartMoneySignal["grade"]) {
  if (grade === "A+") {
    return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
  }
  if (grade === "A") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400";
  }
  return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";
}

function getStateClass(state: SmartMoneySignal["state"]) {
  if (state === "confirmed") {
    return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
  }
  if (state === "building") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400";
  }
  return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400";
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

function getAverageScore(signals: SmartMoneySignal[]) {
  if (signals.length === 0) return 0;
  return signals.reduce((sum, signal) => sum + signal.score, 0) / signals.length;
}

export default function SmartMoneyAccumulationPanel({
  signals,
  isLoading,
  onSelectTicker,
  filterConfig,
}: SmartMoneyAccumulationPanelProps) {
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);

  useEffect(() => {
    setVisibleRows(INITIAL_VISIBLE_ROWS);
  }, [signals.length]);

  const strongest = signals[0] ?? null;
  const averageScore = getAverageScore(signals);
  const stateCounts = useMemo(
    () => ({
      confirmed: signals.filter((signal) => signal.state === "confirmed").length,
      building: signals.filter((signal) => signal.state === "building").length,
      earlyWatch: signals.filter((signal) => signal.state === "early_watch").length,
    }),
    [signals],
  );
  const visibleSignals = useMemo(
    () => signals.slice(0, visibleRows),
    [signals, visibleRows],
  );
  const hasMore = visibleRows < signals.length;
  const canCollapse = visibleRows > INITIAL_VISIBLE_ROWS;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Smart Money Detection
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Strict accumulation candidates (HOSE)
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            HOSE-only heuristic signals from price compression, volume behavior, OBV-style flow, and trend support.
          </p>
          {filterConfig ? (
            <p className="mt-2 text-xs text-success-700 dark:text-success-300">
              Win-rate mode: score ≥ {filterConfig.minScore}, evidence ≥ {filterConfig.minEvidence}, RS ≥{" "}
              {filterConfig.minRelativeStrength20d === null
                ? "Any"
                : `${filterConfig.minRelativeStrength20d.toFixed(1)}%`}
              , states: {formatStateList(filterConfig.allowedStates)}
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[520px]">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Candidates</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{signals.length}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Strongest</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {strongest?.ticker ?? "-"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg score</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {signals.length > 0 ? averageScore.toFixed(0) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Displayed</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {Math.min(visibleRows, signals.length)}/{signals.length}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading smart money signals">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            No strict accumulation candidates under current filters.
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Broaden liquidity/date filters or wait for more price-volume confirmation.
          </p>
        </div>
      ) : (
        <>
        <div className="max-h-[560px] overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/70">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <th className="px-3 py-3">Ticker</th>
                <th className="px-3 py-3 text-right">Score</th>
                <th className="px-3 py-3">Patterns</th>
                <th className="px-3 py-3">Price / Volume</th>
                <th className="px-3 py-3">Trade Plan</th>
                <th className="px-3 py-3">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visibleSignals.map((signal) => (
                <tr
                  key={signal.ticker}
                  className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                  onClick={() => onSelectTicker(signal.ticker)}
                >
                  <td className="px-3 py-4">
                    <div className="font-semibold text-gray-900 dark:text-white">{signal.ticker}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{signal.exchange}</div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">{signal.score}</div>
                    <div className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {signal.evidenceCount} evidence
                    </div>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getGradeClass(signal.grade)}`}>
                      {signal.grade}
                    </span>
                    <span className={`mt-1 ml-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStateClass(signal.state)}`}>
                      {getStateLabel(signal.state)}
                    </span>
                    <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      Floor {signal.appliedScoreFloor}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex max-w-80 flex-wrap gap-1.5">
                      {signal.patterns.map((pattern) => (
                        <span
                          key={pattern}
                          className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300"
                        >
                          {pattern}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">20D price</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPct(signal.metrics.priceChange20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">60D price</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPct(signal.metrics.priceChange60d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">RS vs VNINDEX</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPct(signal.metrics.relativeStrength20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">20D range</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPct(signal.metrics.rangeCompression20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Vol 5D/20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatRatio(signal.metrics.volumeRatio5dTo20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Vol 10D/20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatRatio(signal.metrics.volumeRatio10dTo20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Turnover 20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatMoneyCompact(signal.metrics.avgTradeValue20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Turnover 20D/60D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatRatio(signal.metrics.tradeValueRatio20dTo60d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Turnover 5D/20D</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatRatio(signal.metrics.tradeValueRatio5dTo20d)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">20D volatility</span>
                        <span className="font-medium text-gray-900 dark:text-white">{formatPct(signal.metrics.volatility20d)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Entry</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {formatPrice(signal.metrics.entryPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">Entry zone</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatPrice(signal.metrics.entryZoneLow)} - {formatPrice(signal.metrics.entryZoneHigh)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">SL</span>
                        <span className="font-medium text-error-600 dark:text-error-400">
                          {formatPrice(signal.metrics.stopLoss)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">TP1</span>
                        <span className="font-medium text-success-700 dark:text-success-400">
                          {formatPrice(signal.metrics.takeProfit1)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">TP2</span>
                        <span className="font-medium text-success-700 dark:text-success-400">
                          {formatPrice(signal.metrics.takeProfit2)}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500 dark:text-gray-400">R:R</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {signal.metrics.riskReward1 === null ? "N/A" : signal.metrics.riskReward1.toFixed(2)} /{" "}
                          {signal.metrics.riskReward2 === null ? "N/A" : signal.metrics.riskReward2.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <p className="max-w-xl text-xs leading-5 text-gray-600 dark:text-gray-300">
                      {signal.explanations.slice(0, 4).join(" ")}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-700 dark:bg-success-500/10 dark:text-success-400">
              Confirmed {stateCounts.confirmed}
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              Building {stateCounts.building}
            </span>
            <span className="rounded-full bg-warning-50 px-3 py-1 text-xs font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
              Early watch {stateCounts.earlyWatch}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasMore ? (
              <button
                type="button"
                onClick={() =>
                  setVisibleRows((current) => Math.min(current + VISIBLE_STEP, signals.length))
                }
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/10"
              >
                Show more
              </button>
            ) : null}
            {hasMore ? (
              <button
                type="button"
                onClick={() => setVisibleRows(signals.length)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/10"
              >
                Show all
              </button>
            ) : null}
            {canCollapse ? (
              <button
                type="button"
                onClick={() => setVisibleRows(INITIAL_VISIBLE_ROWS)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/10"
              >
                Collapse
              </button>
            ) : null}
          </div>
        </div>
        </>
      )}
    </section>
  );
}
