"use client";

import React, { useMemo, useState } from "react";
import { MOSRankingRow, MOSSignalType } from "@/types/stocks";

interface MOSScreenerPanelProps {
  rows: MOSRankingRow[];
  isLoading: boolean;
  onSelectTicker: (ticker: string) => void;
}

const INITIAL_VISIBLE_ROWS = 12;
const VISIBLE_STEP = 12;
const SIGNAL_OPTIONS: Array<{ value: "ALL" | MOSSignalType; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "STRONG_CANDIDATE", label: "Strong" },
  { value: "WATCHLIST", label: "Watchlist" },
  { value: "NEUTRAL", label: "Neutral" },
  { value: "OVERVALUED", label: "Overvalued" },
  { value: "AVOID", label: "Avoid" },
];

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const decimals = value >= 100 ? 1 : 3;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPct(value: number | null, signed = false) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const pct = value * 100;
  const prefix = signed && pct > 0 ? "+" : "";
  return `${prefix}${pct.toFixed(1)}%`;
}

function formatMetric(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(2)}${suffix}`;
}

function getSignalLabel(signal: MOSSignalType) {
  if (signal === "STRONG_CANDIDATE") return "Strong";
  if (signal === "WATCHLIST") return "Watchlist";
  if (signal === "OVERVALUED") return "Overvalued";
  if (signal === "AVOID") return "Avoid";
  return "Neutral";
}

function getSignalClass(signal: MOSSignalType) {
  if (signal === "STRONG_CANDIDATE") {
    return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
  }
  if (signal === "WATCHLIST") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400";
  }
  if (signal === "OVERVALUED") {
    return "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400";
  }
  if (signal === "AVOID") {
    return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400";
  }
  return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";
}

function getActionLabel(action: MOSRankingRow["tradePlan"]["action"]) {
  if (action === "ACCUMULATE") return "Accumulate";
  if (action === "WATCH") return "Watch";
  if (action === "WAIT") return "Wait";
  return "Avoid";
}

function getActionClass(action: MOSRankingRow["tradePlan"]["action"]) {
  if (action === "ACCUMULATE") {
    return "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400";
  }
  if (action === "WATCH") {
    return "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400";
  }
  if (action === "WAIT") {
    return "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300";
  }
  return "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400";
}

function getMOSClass(value: number | null) {
  if (value === null) return "text-gray-500 dark:text-gray-400";
  if (value >= 0.4) return "text-success-700 dark:text-success-400";
  if (value >= 0.25) return "text-brand-700 dark:text-brand-400";
  if (value < 0) return "text-error-700 dark:text-error-400";
  return "text-gray-900 dark:text-white";
}

function getSummary(rows: MOSRankingRow[]) {
  return {
    strong: rows.filter((row) => row.signal === "STRONG_CANDIDATE").length,
    watchlist: rows.filter((row) => row.signal === "WATCHLIST").length,
    actionable: rows.filter((row) => row.tradePlan.action === "ACCUMULATE").length,
    overvalued: rows.filter((row) => row.signal === "OVERVALUED").length,
    lowConfidence: rows.filter((row) => row.confidenceScore < 60).length,
  };
}

export default function MOSScreenerPanel({
  rows,
  isLoading,
  onSelectTicker,
}: MOSScreenerPanelProps) {
  const [visibleRows, setVisibleRows] = useState(INITIAL_VISIBLE_ROWS);
  const [signalFilter, setSignalFilter] = useState<"ALL" | MOSSignalType>("ALL");
  const [minMos, setMinMos] = useState("25");
  const [hideLowConfidence, setHideLowConfidence] = useState(true);

  const summary = useMemo(() => getSummary(rows), [rows]);
  const filteredRows = useMemo(() => {
    const minMosValue = Number(minMos);
    const hasMinMos = Number.isFinite(minMosValue);

    return rows.filter((row) => {
      if (signalFilter !== "ALL" && row.signal !== signalFilter) return false;
      if (hideLowConfidence && row.confidenceScore < 60) return false;
      if (hasMinMos) {
        if (row.marginOfSafety === null) return false;
        if (row.marginOfSafety * 100 < minMosValue) return false;
      }
      return true;
    });
  }, [hideLowConfidence, minMos, rows, signalFilter]);

  const topAlerts = useMemo(
    () =>
      rows
        .filter((row) =>
          row.signal === "STRONG_CANDIDATE" ||
          row.signal === "WATCHLIST" ||
          row.alerts.some((alert) => alert.code === "VALUE_TRAP_RISK"),
        )
        .slice(0, 5),
    [rows],
  );
  const cappedVisibleRows = Math.min(visibleRows, filteredRows.length);
  const visibleRankingRows = useMemo(
    () => filteredRows.slice(0, cappedVisibleRows),
    [cappedVisibleRows, filteredRows],
  );
  const hasMore = cappedVisibleRows < filteredRows.length;
  const canCollapse = visibleRows > INITIAL_VISIBLE_ROWS;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            MOS Screener
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Margin of safety ranking (HOSE)
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Quantitative valuation alerts from price, PE, PB, ROE, and market structure data already loaded in this dashboard.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:min-w-[560px]">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Strong</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{summary.strong}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Watchlist</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{summary.watchlist}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Entry-ready</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{summary.actionable}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Low confidence</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{summary.lowConfidence}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Signal</span>
          <select
            value={signalFilter}
            onChange={(event) => setSignalFilter(event.target.value as "ALL" | MOSSignalType)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:text-white"
          >
            {SIGNAL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Min MOS %</span>
          <input
            type="number"
            min="-100"
            max="200"
            value={minMos}
            onChange={(event) => setMinMos(event.target.value)}
            className="h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-800 dark:text-white"
          />
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:text-gray-300 md:mt-5">
          <input
            type="checkbox"
            checked={hideLowConfidence}
            onChange={(event) => setHideLowConfidence(event.target.checked)}
            className="size-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Hide low confidence
        </label>
        <div className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-800 md:mt-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Displayed</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {cappedVisibleRows}/{filteredRows.length}
          </p>
        </div>
      </div>

      {topAlerts.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-5">
          {topAlerts.map((row) => (
            <button
              key={row.ticker}
              type="button"
              onClick={() => onSelectTicker(row.ticker)}
              className="rounded-lg border border-gray-200 p-3 text-left transition hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-brand-500/40 dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-900 dark:text-white">{row.ticker}</span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getSignalClass(row.signal)}`}>
                  {getSignalLabel(row.signal)}
                </span>
              </div>
              <p className={`mt-2 text-lg font-semibold ${getMOSClass(row.marginOfSafety)}`}>
                {formatPct(row.marginOfSafety, true)}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                {row.reasons[0]}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading MOS ranking">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            No MOS candidates match the current filters.
          </h4>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Adjust the MOS threshold, signal, or confidence filter.
          </p>
        </div>
      ) : (
        <>
          <div className="max-h-[620px] overflow-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900/70">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-3">Ticker</th>
                  <th className="px-3 py-3 text-right">Score</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Fair value</th>
                  <th className="px-3 py-3 text-right">MOS</th>
                  <th className="px-3 py-3">Signal</th>
                  <th className="px-3 py-3">Entry / SL</th>
                  <th className="px-3 py-3">TP Plan</th>
                  <th className="px-3 py-3">Quality</th>
                  <th className="px-3 py-3">Valuation inputs</th>
                  <th className="px-3 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleRankingRows.map((row) => (
                  <tr
                    key={row.ticker}
                    className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                    onClick={() => onSelectTicker(row.ticker)}
                  >
                    <td className="px-3 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{row.ticker}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{row.exchange}</div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">{row.finalScore}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        C {row.confidenceScore}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">{formatPrice(row.price)}</td>
                    <td className="px-3 py-4 text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(row.intrinsicValue)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.breakdown.source === "fundamentals" ? "Deep data" : "Market ratios"}
                      </div>
                    </td>
                    <td className={`px-3 py-4 text-right font-semibold ${getMOSClass(row.marginOfSafety)}`}>
                      {formatPct(row.marginOfSafety, true)}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getSignalClass(row.signal)}`}>
                        {getSignalLabel(row.signal)}
                      </span>
                      <span className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getActionClass(row.tradePlan.action)}`}>
                        {getActionLabel(row.tradePlan.action)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(row.tradePlan.entryZoneLow)} - {formatPrice(row.tradePlan.entryZoneHigh)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Entry {formatPrice(row.tradePlan.entryPrice)}
                      </div>
                      <div className="text-xs text-error-600 dark:text-error-400">
                        SL {formatPrice(row.tradePlan.stopLoss)}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        TP1 {formatPrice(row.tradePlan.takeProfit1)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        TP2 {formatPrice(row.tradePlan.takeProfit2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        R/R {formatMetric(row.tradePlan.riskReward1)} / {formatMetric(row.tradePlan.riskReward2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Risk {formatMetric(row.tradePlan.riskPercent, "%")}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{row.qualityScore}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ROE {formatMetric(row.metrics.roe, "%")}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        PE {formatMetric(row.metrics.pe)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        PB {formatMetric(row.metrics.pb)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Fair PE/PB {formatMetric(row.breakdown.fairPe)} / {formatMetric(row.breakdown.fairPb)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        EPS {formatMetric(row.breakdown.epsEstimate)}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="max-w-80 text-xs text-gray-600 dark:text-gray-300">
                        {row.reasons[0]}
                      </div>
                      <div className="mt-1 max-w-80 text-[11px] text-gray-500 dark:text-gray-400">
                        {row.tradePlan.planNote}
                      </div>
                      {row.breakdown.missingData.length > 0 ? (
                        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          Missing {row.breakdown.missingData.join(", ")}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Deep mode uses DNSE business-result data first and falls back to CafeF valuation ratios only when DNSE does not expose a field.
            </p>
            <div className="flex gap-2">
              {canCollapse ? (
                <button
                  type="button"
                  onClick={() => setVisibleRows(INITIAL_VISIBLE_ROWS)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Collapse
                </button>
              ) : null}
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => setVisibleRows((current) => current + VISIBLE_STEP)}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
                >
                  Show more
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
