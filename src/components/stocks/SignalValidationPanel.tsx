"use client";

import React from "react";
import {
  AbnormalBacktestSummary,
  AbnormalSignalType,
  SmartMoneyBacktestSummary,
} from "@/types/stocks";

interface SignalValidationPanelProps {
  smartMoney: SmartMoneyBacktestSummary;
  abnormal: AbnormalBacktestSummary;
  isLoading: boolean;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(1)}%`;
}

function formatReturn(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function signalTone(
  sampleSize: number,
  winRate: number | null,
  avgReturn: number | null,
): "strong" | "watch" | "weak" | "thin" {
  if (sampleSize < 30) return "thin";
  if (winRate !== null && avgReturn !== null && winRate >= 58 && avgReturn > 0) return "strong";
  if (winRate !== null && avgReturn !== null && winRate >= 52 && avgReturn >= 0) return "watch";
  return "weak";
}

function toneLabel(tone: ReturnType<typeof signalTone>) {
  if (tone === "strong") return "Use";
  if (tone === "watch") return "Watch";
  if (tone === "thin") return "Thin sample";
  return "Do not prioritize";
}

function toneClass(tone: ReturnType<typeof signalTone>) {
  if (tone === "strong") {
    return "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300";
  }
  if (tone === "watch") {
    return "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300";
  }
  if (tone === "thin") {
    return "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300";
  }
  return "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300";
}

function formatType(type: AbnormalSignalType) {
  if (type === "PRICE_SHOCK") return "Price shock";
  if (type === "VOLUME_SHOCK") return "Volume shock";
  if (type === "TURNOVER_SPIKE") return "Turnover spike";
  if (type === "FLOW_ANOMALY") return "Flow anomaly";
  return "Range break";
}

export default function SignalValidationPanel({
  smartMoney,
  abnormal,
  isLoading,
}: SignalValidationPanelProps) {
  const smart10d = smartMoney.windows.find((item) => item.horizon === 10) ?? null;
  const abnormal3d = abnormal.windows.find((item) => item.horizon === 3) ?? null;
  const smartTone = signalTone(
    smart10d?.sampleSize ?? 0,
    smart10d?.winRate ?? null,
    smart10d?.avgReturn ?? null,
  );
  const abnormalTone = signalTone(
    abnormal3d?.sampleSize ?? 0,
    abnormal3d?.winRate ?? null,
    abnormal3d?.avgReturn ?? null,
  );
  const bestAbnormalTypes = [...abnormal.byType]
    .filter((item) => item.sampleSize >= 10)
    .sort((a, b) => (b.avgReturn3d ?? -Infinity) - (a.avgReturn3d ?? -Infinity))
    .slice(0, 3);
  const smartConfig = smartMoney.recommendedWinRate;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
            Signal Validation
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
            Backtest quality summary
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Combines smart-money and abnormal-event validation into one decision view.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:min-w-[560px]">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Smart signals</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{smartMoney.totalSignals}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Smart 10D</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatPercent(smart10d?.winRate ?? null)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Abnormal events</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{abnormal.totalSignals}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Abnormal 3D</p>
            <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              {formatPercent(abnormal3d?.winRate ?? null)}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading signal validation">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={`rounded-xl border p-4 ${toneClass(smartTone)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Smart Money</p>
                <h4 className="mt-1 text-base font-semibold">Use for watchlist ranking</h4>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold dark:bg-white/[0.08]">
                {toneLabel(smartTone)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="opacity-70">10D win-rate</p>
                <p className="mt-1 font-semibold">{formatPercent(smart10d?.winRate ?? null)}</p>
              </div>
              <div>
                <p className="opacity-70">10D avg return</p>
                <p className="mt-1 font-semibold">{formatReturn(smart10d?.avgReturn ?? null)}</p>
              </div>
              <div>
                <p className="opacity-70">Samples</p>
                <p className="mt-1 font-semibold">{smart10d?.sampleSize ?? 0}</p>
              </div>
            </div>
            {smartConfig ? (
              <p className="mt-4 text-xs opacity-80">
                Suggested filter: score &gt;= {smartConfig.config.minScore}, evidence &gt;= {smartConfig.config.minEvidence}, samples {smartConfig.sampleSize}.
              </p>
            ) : null}
          </div>

          <div className={`rounded-xl border p-4 ${toneClass(abnormalTone)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Abnormal Events</p>
                <h4 className="mt-1 text-base font-semibold">Use as short-term risk/alert filter</h4>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold dark:bg-white/[0.08]">
                {toneLabel(abnormalTone)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="opacity-70">3D win-rate</p>
                <p className="mt-1 font-semibold">{formatPercent(abnormal3d?.winRate ?? null)}</p>
              </div>
              <div>
                <p className="opacity-70">3D avg return</p>
                <p className="mt-1 font-semibold">{formatReturn(abnormal3d?.avgReturn ?? null)}</p>
              </div>
              <div>
                <p className="opacity-70">Samples</p>
                <p className="mt-1 font-semibold">{abnormal3d?.sampleSize ?? 0}</p>
              </div>
            </div>
            {bestAbnormalTypes.length > 0 ? (
              <p className="mt-4 text-xs opacity-80">
                Best event types: {bestAbnormalTypes.map((item) => `${formatType(item.type)} ${formatReturn(item.avgReturn3d)}`).join(", ")}.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800 xl:col-span-2">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Standard output
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-2 py-2">Signal</th>
                    <th className="px-2 py-2">Use case</th>
                    <th className="px-2 py-2 text-right">Main horizon</th>
                    <th className="px-2 py-2 text-right">Win-rate</th>
                    <th className="px-2 py-2 text-right">Avg return</th>
                    <th className="px-2 py-2 text-right">Samples</th>
                    <th className="px-2 py-2 text-right">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr>
                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">Smart Money</td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">Rank watchlist candidates</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">10D</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">{formatPercent(smart10d?.winRate ?? null)}</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">{formatReturn(smart10d?.avgReturn ?? null)}</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">{smart10d?.sampleSize ?? 0}</td>
                    <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-white">{toneLabel(smartTone)}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">Abnormal</td>
                    <td className="px-2 py-2 text-gray-600 dark:text-gray-300">Validate short-term alerts</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">3D</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">{formatPercent(abnormal3d?.winRate ?? null)}</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">{formatReturn(abnormal3d?.avgReturn ?? null)}</td>
                    <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-300">{abnormal3d?.sampleSize ?? 0}</td>
                    <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-white">{toneLabel(abnormalTone)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
