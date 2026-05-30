"use client";

import React, { useEffect, useMemo, useState } from "react";

interface MonthlyReturn {
  year: number;
  month: number;
  monthLabel: string;
  returnPct: number;
}

interface SeasonalityPayload {
  success: boolean;
  source: "simplize" | "vietstock" | "vps-fallback";
  startDate: string | null;
  endDate: string | null;
  monthlyReturns: MonthlyReturn[];
  metadata: {
    monthlyReturnCount: number;
    warning: string | null;
  };
}

function formatPct(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}%`;
}

function getReturnCellClass(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "bg-gray-50 text-gray-400 dark:bg-white/[0.03] dark:text-gray-500";
  }
  if (value >= 8) return "bg-success-600 text-white";
  if (value >= 4) return "bg-success-500 text-white";
  if (value >= 1) return "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-200";
  if (value > -1) return "bg-gray-50 text-gray-600 dark:bg-white/[0.04] dark:text-gray-300";
  if (value > -4) return "bg-error-100 text-error-800 dark:bg-error-500/20 dark:text-error-200";
  if (value > -8) return "bg-error-500 text-white";
  return "bg-error-600 text-white";
}

export default function VnIndexSeasonalityChart() {
  const [payload, setPayload] = useState<SeasonalityPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/stocks/vnindex-seasonality");
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = (await response.json()) as SeasonalityPayload;
        if (isMounted) setPayload(data);
      } catch (err) {
        if (isMounted) {
          setPayload(null);
          setError(err instanceof Error ? err.message : "Cannot load VNINDEX seasonality");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);

  const lastTenYearRows = useMemo(() => {
    const returns = payload?.monthlyReturns ?? [];
    const years = Array.from(new Set(returns.map((item) => item.year)))
      .sort((a, b) => b - a)
      .slice(0, 10);

    return years.map((year) => {
      const cells = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        return returns.find((item) => item.year === year && item.month === month)?.returnPct ?? null;
      });
      const validCells = cells.filter((value): value is number => value !== null);
      const yearReturn =
        validCells.length > 0
          ? validCells.reduce((compound, value) => compound * (1 + value / 100), 1) - 1
          : null;

      return {
        year,
        cells,
        yearReturnPct: yearReturn !== null ? yearReturn * 100 : null,
      };
    });
  }, [payload]);

  const sourceLabel =
    payload?.source === "simplize"
      ? "Simplize"
      : payload?.source === "vietstock"
        ? "Vietstock"
        : "Fallback";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            VNINDEX Monthly Seasonality
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {payload?.startDate ?? "...."} - {payload?.endDate ?? "...."} · {payload?.metadata.monthlyReturnCount ?? 0} monthly observations
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-300">
            {sourceLabel}
          </span>
          {payload?.metadata.warning ? (
            <span className="rounded-full bg-warning-50 px-2.5 py-1 font-medium text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
              Vietstock unavailable
            </span>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="h-52 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      ) : error ? (
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-error-200 bg-error-50 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      ) : lastTenYearRows.length > 0 ? (
        <>
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                10-year monthly return table
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Green months gained, red months declined; stronger color means larger move.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="h-3 w-5 rounded bg-error-500" />
              Loss
              <span className="h-3 w-5 rounded bg-gray-100 dark:bg-white/[0.08]" />
              Flat
              <span className="h-3 w-5 rounded bg-success-500" />
              Gain
            </div>
          </div>
          <div className="max-w-full overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="min-w-[920px] divide-y divide-gray-100 text-xs dark:divide-gray-800">
              <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900/70 dark:text-gray-400">
                <tr>
                  <th className="sticky left-0 z-[1] bg-gray-50 px-3 py-2 text-left font-semibold dark:bg-gray-900">
                    Year
                  </th>
                  {Array.from({ length: 12 }, (_, index) => (
                    <th key={index + 1} className="px-2 py-2 text-center font-semibold">
                      T{(index + 1).toString().padStart(2, "0")}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {lastTenYearRows.map((row) => (
                  <tr key={row.year}>
                    <td className="sticky left-0 z-[1] bg-white px-3 py-2 font-semibold text-gray-800 dark:bg-gray-950 dark:text-white">
                      {row.year}
                    </td>
                    {row.cells.map((value, index) => (
                      <td key={`${row.year}-${index + 1}`} className="p-1">
                        <div
                          className={`flex h-8 items-center justify-center rounded-md px-1 font-semibold tabular-nums ${getReturnCellClass(value)}`}
                          title={`${row.year} T${(index + 1).toString().padStart(2, "0")}: ${formatPct(value, 2)}`}
                        >
                          {value === null ? "-" : formatPct(value, 1)}
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <span className={`inline-flex min-w-16 justify-center rounded-md px-2 py-1 font-semibold tabular-nums ${getReturnCellClass(row.yearReturnPct)}`}>
                        {formatPct(row.yearReturnPct, 1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
