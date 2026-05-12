"use client";

import React, { useEffect, useMemo, useState } from "react";

interface SectorRating {
  name: string;
  rating: number;
  change?: number;
}

interface DetailedStock {
  ticker: string;
  score: number;
}

interface DetailedSector {
  name: string;
  avgScore: number;
  stocks: DetailedStock[];
}

interface ApiResponse {
  success: boolean;
  data?: SectorRating[];
  detailedSectors?: DetailedSector[];
  error?: string;
}

function getTone(score: number) {
  if (score >= 70) {
    return {
      label: "Very strong",
      badge: "bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-300",
      bar: "bg-success-500",
      soft: "bg-success-50 dark:bg-success-500/10",
    };
  }
  if (score >= 50) {
    return {
      label: "Strong",
      badge: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
      bar: "bg-brand-500",
      soft: "bg-brand-50 dark:bg-brand-500/10",
    };
  }
  if (score >= 30) {
    return {
      label: "Neutral",
      badge: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300",
      bar: "bg-warning-500",
      soft: "bg-warning-50 dark:bg-warning-500/10",
    };
  }

  return {
    label: "Weak",
    badge: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300",
    bar: "bg-error-500",
    soft: "bg-error-50 dark:bg-error-500/10",
  };
}

function formatChange(change?: number) {
  if (change === undefined || change === 0) return "0";
  return `${change > 0 ? "+" : ""}${change}`;
}

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="h-5 w-52 animate-pulse rounded bg-gray-100 dark:bg-white/10" />
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-white/10" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/10" />
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/10" />
      </div>
    </div>
  );
}

export default function SectorValuationRatings() {
  const [ratings, setRatings] = useState<SectorRating[]>([]);
  const [detailedSectors, setDetailedSectors] = useState<DetailedSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [strengthFilter, setStrengthFilter] = useState<"ALL" | "STRONG" | "NEUTRAL" | "WEAK">("ALL");

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/stocks/sector-ratings?t=${Date.now()}`);
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = (await response.json()) as ApiResponse;
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch sector ratings");
      }

      setRatings(data.data || []);
      setDetailedSectors(data.detailedSectors || []);
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();

    const interval = setInterval(fetchRatings, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const rankedRatings = useMemo(
    () => [...ratings].sort((a, b) => b.rating - a.rating),
    [ratings],
  );

  const filteredDetailedSectors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return detailedSectors
      .filter((sector) => {
        if (strengthFilter === "STRONG") return sector.avgScore >= 50;
        if (strengthFilter === "NEUTRAL") return sector.avgScore >= 30 && sector.avgScore < 50;
        if (strengthFilter === "WEAK") return sector.avgScore < 30;
        return true;
      })
      .filter((sector) => {
        if (!query) return true;
        return (
          sector.name.toLowerCase().includes(query) ||
          sector.stocks.some((stock) => stock.ticker.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [detailedSectors, searchTerm, strengthFilter]);

  const leader = rankedRatings[0] ?? null;
  const laggard = rankedRatings[rankedRatings.length - 1] ?? null;
  const average =
    rankedRatings.length > 0
      ? rankedRatings.reduce((sum, sector) => sum + sector.rating, 0) / rankedRatings.length
      : 0;
  const strongCount = rankedRatings.filter((sector) => sector.rating >= 50).length;

  if (loading && ratings.length === 0) return <Skeleton />;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-500">
              Sector Performance Analytics
            </p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
              Market strength by industry group
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
              Compare sector leadership, laggards, and component stocks using the latest strength index.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">
              Updated {lastUpdated || "N/A"}
            </span>
            <button
              type="button"
              onClick={fetchRatings}
              disabled={loading}
              className="h-10 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Sectors tracked</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{rankedRatings.length}</p>
          </div>
          <div className="rounded-xl bg-success-50 p-4 dark:bg-success-500/10">
            <p className="text-xs font-medium text-success-700 dark:text-success-300">Strong sectors</p>
            <p className="mt-1 text-2xl font-semibold text-success-800 dark:text-success-300">{strongCount}</p>
          </div>
          <div className="rounded-xl bg-brand-50 p-4 dark:bg-brand-500/10">
            <p className="text-xs font-medium text-brand-700 dark:text-brand-300">Average score</p>
            <p className="mt-1 text-2xl font-semibold text-brand-800 dark:text-brand-300">{average.toFixed(1)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Leader / laggard</p>
            <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
              {leader?.name || "N/A"} / {laggard?.name || "N/A"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-100 p-4 dark:border-white/[0.05]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sector ranking</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sorted by strength index</p>
          </div>
          <div className="max-h-[620px] overflow-y-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 border-b border-gray-100 bg-white dark:border-white/[0.05] dark:bg-gray-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sector</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {rankedRatings.map((sector, index) => {
                  const tone = getTone(sector.rating);
                  return (
                    <tr key={sector.name} className="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400">#{index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900 dark:text-white">{sector.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
                            {tone.label}
                          </span>
                          {sector.change !== undefined ? (
                            <span
                              className={`text-xs font-semibold ${
                                sector.change > 0
                                  ? "text-success-600 dark:text-success-400"
                                  : sector.change < 0
                                    ? "text-error-600 dark:text-error-400"
                                    : "text-gray-400"
                              }`}
                            >
                              {formatChange(sector.change)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex min-w-12 justify-center rounded-full px-3 py-1 text-sm font-semibold ${tone.badge}`}>
                          {sector.rating}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sector components</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Showing {filteredDetailedSectors.length} of {detailedSectors.length} sectors
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_150px]">
              <input
                type="text"
                placeholder="Search sector or ticker"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <select
                value={strengthFilter}
                onChange={(event) => setStrengthFilter(event.target.value as "ALL" | "STRONG" | "NEUTRAL" | "WEAK")}
                className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="ALL">All strength</option>
                <option value="STRONG">Strong 50+</option>
                <option value="NEUTRAL">Neutral 30-49</option>
                <option value="WEAK">Weak below 30</option>
              </select>
            </div>
          </div>

          <div className="mt-4 max-h-[620px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              {filteredDetailedSectors.map((sector) => {
                const tone = getTone(sector.avgScore);
                const topStocks = [...sector.stocks].sort((a, b) => b.score - a.score).slice(0, 8);

                return (
                  <article
                    key={sector.name}
                    className="rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{sector.name}</h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {sector.stocks.length} stocks tracked
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${tone.badge}`}>
                        {sector.avgScore}
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(100, sector.avgScore)}%` }} />
                    </div>

                    <div className="mt-4 space-y-3">
                      {topStocks.map((stock) => {
                        const stockTone = getTone(stock.score);
                        return (
                          <div key={stock.ticker} className="grid grid-cols-[64px_1fr_42px] items-center gap-3">
                            <span className="text-xs font-semibold text-gray-800 dark:text-white">{stock.ticker}</span>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                              <div
                                className={`h-full rounded-full ${stockTone.bar}`}
                                style={{ width: `${Math.min(100, Math.max(5, stock.score))}%` }}
                              />
                            </div>
                            <span className="text-right text-xs font-semibold text-gray-600 dark:text-gray-300">{stock.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
