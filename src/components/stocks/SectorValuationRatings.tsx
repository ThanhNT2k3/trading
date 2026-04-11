"use client";

import React, { useEffect, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";

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

function getRatingColor(rating: number): string {
  if (rating >= 70) return "bg-purple-600 text-white";
  if (rating >= 50) return "bg-green-600 text-white";
  if (rating >= 30) return "bg-orange-500 text-white";
  return "bg-blue-600 text-white";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-purple-600";
  if (score >= 50) return "text-green-600";
  if (score >= 30) return "text-orange-500";
  return "text-blue-600";
}

function getProgressBarColor(score: number): string {
  if (score >= 70) return "bg-purple-600";
  if (score >= 50) return "bg-green-600";
  if (score >= 30) return "bg-orange-500";
  return "bg-blue-600";
}

export default function SectorValuationRatings() {
  const [ratings, setRatings] = useState<SectorRating[]>([]);
  const [detailedSectors, setDetailedSectors] = useState<DetailedSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDetailedSectors = detailedSectors.filter((sector) =>
    sector.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sector.stocks.some(s => s.ticker.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/stocks/sector-ratings?t=${Date.now()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch sector ratings");
      }

      setRatings(data.data || []);
      setDetailedSectors(data.detailedSectors || []);
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("❌ Error fetching sector ratings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();

    // Refresh every hour
    const interval = setInterval(fetchRatings, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && ratings.length === 0) {
    return (
      <div className="space-y-12 animate-pulse">
        <ComponentCard title="Sector Strength Analysis">
          <div className="flex flex-col xl:flex-row gap-8 py-4">
             {[1, 2].map(t => (
               <div key={t} className="flex-1 space-y-4">
                 <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/3" />
                 {[1, 2, 3, 4, 10].map(i => (
                   <div key={i} className="h-10 bg-gray-50 dark:bg-gray-800/40 rounded-lg" />
                 ))}
               </div>
             ))}
          </div>
        </ComponentCard>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[1, 2, 3, 4].map(i => (
             <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
           ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ComponentCard title="Connection Status">
        <div className="rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 p-8 text-red-800 dark:from-red-900/10 dark:to-orange-900/10 dark:text-red-300 border border-red-100 dark:border-red-900/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-2xl">📡</div>
            <div>
              <p className="font-bold text-xl tracking-tight">Market Data Unreachable</p>
              <p className="text-sm opacity-70">The system encountered an error while connecting to the primary data stream.</p>
            </div>
          </div>
          <div className="bg-white/40 dark:bg-black/20 p-4 rounded-xl text-sm font-mono mb-6 border border-white/40 dark:border-white/10">
            {error.includes("fetch failed") ? "ECONNREFUSED: Provider firewall or network timeout." : error}
          </div>
          <button
            onClick={() => fetchRatings()}
            className="group px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center gap-2"
          >
            <span className="group-hover:rotate-180 transition-transform duration-500">🔄</span> Re-establish Connection
          </button>
        </div>
      </ComponentCard>
    );
  }

  return (
    <div className="space-y-16 pb-20">
      {/* Ranking Tables Section */}
      <section className="relative">
        <div className="absolute -top-4 left-6 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg z-10">
          Live Market Rank
        </div>
        <ComponentCard
          title="Sector Performance Analytics"
          className="rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl dark:border-gray-800 dark:bg-white/[0.02] overflow-hidden backdrop-blur-sm"
        >
          <div className="space-y-10">
            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-6 p-6 bg-gray-50/50 dark:bg-white/[0.03] rounded-[2rem] border border-gray-100 dark:border-white/[0.05]">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "≥70 Rất mạnh", color: "bg-purple-600 shadow-purple-500/40" },
                  { label: "50–69 Mạnh", color: "bg-green-600 shadow-green-500/40" },
                  { label: "30–49 Trung bình", color: "bg-orange-500 shadow-orange-500/40" },
                  { label: "<30 Yếu", color: "bg-blue-600 shadow-blue-500/40" },
                ].map((tier) => (
                  <span key={tier.label} className={`${tier.color} px-5 py-2 text-white rounded-full text-[11px] font-black shadow-lg transition-all hover:scale-105 hover:-translate-y-0.5 cursor-default`}>
                    {tier.label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                Updated {lastUpdated}
              </div>
            </div>

            {/* Tables Container */}
            <div className="flex flex-col xl:flex-row gap-16">
              {[
                { title: "Top Sector Leaders", icon: "💎", data: ratings.slice(0, Math.ceil(ratings.length / 2)), start: 0 },
                { title: "Sector Laggards", icon: "📉", data: ratings.slice(Math.ceil(ratings.length / 2)), start: Math.ceil(ratings.length / 2) }
              ].map((table) => (
                <div key={table.title} className="flex-1 group">
                  <div className={`flex items-center justify-between mb-8 pb-5 border-b-2 border-gray-100 dark:border-white/[0.05] transition-colors group-hover:border-blue-500/30`}>
                     <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-4">
                       <span className="text-3xl filter drop-shadow-lg">{table.icon}</span> {table.title}
                     </h3>
                     <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Strength index</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-y-3">
                      <thead>
                        <tr className="text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">
                          <th className="pb-2 px-4 w-12 text-center">Rank</th>
                          <th className="pb-2 px-2 w-16 text-center">Shift</th>
                          <th className="pb-2 px-2">Industry</th>
                          <th className="pb-2 px-4 text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.data.map((sector, index) => {
                          const realRank = table.start + index + 1;
                          const isTop3 = realRank <= 3;
                          return (
                            <tr key={sector.name} className={`group/row transition-all hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-none`}>
                              <td className={`py-4 px-4 text-center font-black rounded-l-2xl ${isTop3 ? "text-gray-900 dark:text-white" : "text-gray-400 text-xs"}`}>
                                {realRank === 1 ? "🥇" : realRank === 2 ? "🥈" : realRank === 3 ? "🥉" : realRank}
                              </td>
                              <td className="py-4 px-2 text-center">
                                {sector.change !== undefined && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black flex items-center justify-center gap-1.5 ${sector.change > 0 ? "bg-green-100/60 text-green-700 dark:bg-green-900/30 dark:text-green-400" : sector.change < 0 ? "bg-red-100/60 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "text-gray-300"}`}>
                                    {sector.change > 0 && "▲"}
                                    {sector.change < 0 && "▼"}
                                    {sector.change === 0 && "—"}
                                    {sector.change !== 0 && Math.abs(sector.change)}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-2">
                                <span className={`text-sm font-black tracking-tight leading-none ${isTop3 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                                  {sector.name}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right rounded-r-2xl">
                                <span className={`${getRatingColor(sector.rating)} inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs shadow-xl transition-all group-hover/row:scale-110 group-hover/row:rotate-3`}>
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
              ))}
            </div>
          </div>
        </ComponentCard>
      </section>
      
      {/* Detailed Industry Analysis Section */}
      <section className="space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-gray-100 dark:border-white/[0.05] pb-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-5 tracking-tighter">
             Detailed Sector Forensics
            </h2>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.4em] leading-none">Component-level RSI dynamics</p>
          </div>
          
          <div className="relative group w-full lg:w-96">
            <input 
              type="text"
              placeholder="Search industries or tickers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-14 pr-8 py-4 bg-white dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.1] rounded-[1.5rem] text-sm focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all w-full shadow-2xl shadow-blue-500/5 placeholder:text-gray-300 dark:placeholder:text-gray-600"
            />
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl filter grayscale opacity-50">🔍</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {filteredDetailedSectors.map((sector) => {
            const headerColor = sector.avgScore >= 70 ? "from-purple-600 to-indigo-700" : 
                               sector.avgScore >= 50 ? "from-green-600 to-emerald-700" :
                               sector.avgScore >= 30 ? "from-orange-500 to-amber-600" : "from-blue-600 to-cyan-700";
            return (
              <div
                key={sector.name}
                className="bg-white dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl hover:shadow-blue-500/20 transition-all duration-700 group flex flex-col hover:-translate-y-4"
              >
                {/* Header */}
                <div className={`bg-gradient-to-br ${headerColor} p-8 relative overflow-hidden flex flex-col items-center justify-center text-center shadow-2xl`}>
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="absolute -right-6 -top-6 text-white/5 font-black text-8xl select-none group-hover:rotate-12 transition-transform duration-1000 ease-out">
                    {sector.name.slice(0, 1)}
                  </div>
                  <div className="text-[11px] font-black text-white/80 uppercase tracking-[0.4em] mb-3 drop-shadow-xl z-10">{sector.name}</div>
                  <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/20 rounded-2xl text-[11px] font-black text-white backdrop-blur-xl border border-white/30 shadow-2xl z-10 scale-110">
                    AVG <span className="text-sm border-b-2 border-white/50">{sector.avgScore}</span>
                  </div>
                </div>

                {/* List */}
                <div className="p-8 space-y-8 flex-1 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-white/[0.01]">
                  {sector.stocks.map((stock) => (
                    <div key={stock.ticker} className="space-y-3 group/stock">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-900 dark:text-gray-100 group-hover/stock:text-blue-500 transition-colors uppercase tracking-[0.15em]">{stock.ticker}</span>
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5 shadow-inner ${getScoreColor(stock.score)}`}>{stock.score}</span>
                        </div>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-white/[0.08] rounded-full overflow-hidden shadow-inner p-[2px] border border-gray-100 dark:border-white/[0.05]">
                        <div
                          className={`h-full transition-all duration-1000 ${getProgressBarColor(stock.score)} rounded-full shadow-2xl relative`}
                          style={{ width: `${Math.min(100, Math.max(5, stock.score))}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-50" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="pt-20 border-t border-gray-100 dark:border-white/[0.05] flex flex-col lg:flex-row items-center justify-between gap-12 text-[10px] font-black uppercase tracking-[0.5em] text-gray-400">
        <div className="flex items-center gap-4 group">
          Validated Market Intel <a href="https://chungkhoancaykhe.vn/overview" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-400 underline underline-offset-8">chungkhoancaykhe.vn</a>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
           {["Very Strong", "Strong", "Fair", "Weak"].map((label, i) => (
              <div key={label} className="flex items-center gap-4 group/leg cursor-help">
                <span className={`h-3 w-3 rounded-full ring-8 ring-opacity-10 transition-transform group-hover/leg:scale-150 ${["bg-purple-600 ring-purple-600", "bg-green-600 ring-green-600", "bg-orange-500 ring-orange-500", "bg-blue-600 ring-blue-600"][i]}`} />
                <span className="opacity-60 group-hover/leg:opacity-100 transition-opacity">{label}</span>
              </div>
           ))}
        </div>
      </footer>
    </div>
  );
}
