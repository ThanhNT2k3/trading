"use client";

import React, { useEffect, useState } from "react";
import ComponentCard from "@/components/common/ComponentCard";

interface SectorRating {
  name: string;
  rating: number;
  change?: number;
}

interface ApiResponse {
  success: boolean;
  data?: SectorRating[];
  error?: string;
}

function getRatingColor(rating: number): string {
  if (rating >= 70) return "bg-purple-600 text-white";
  if (rating >= 50) return "bg-green-600 text-white";
  if (rating >= 30) return "bg-orange-500 text-white";
  return "bg-blue-600 text-white";
}

function getRatingStyle(rating: number): string {
  if (rating >= 70) return "text-purple-600 dark:text-purple-400";
  if (rating >= 50) return "text-green-600 dark:text-green-400";
  if (rating >= 30) return "text-orange-600 dark:text-orange-400";
  return "text-blue-600 dark:text-blue-400";
}

export default function SectorValuationRatings() {
  const [ratings, setRatings] = useState<SectorRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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

      const ratingsData = data.data || [];
      setRatings(ratingsData);
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
      <ComponentCard title="📊 Sector Strength Ratings (Chungkhoancaykhe.vn)">
        <div className="flex items-center justify-center py-12">
          <div className="space-y-4 w-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded animate-pulse dark:bg-gray-800" />
            ))}
            <div className="text-center text-xs text-gray-400 mt-2">Loading market sector data...</div>
          </div>
        </div>
      </ComponentCard>
    );
  }

  if (error) {
    return (
      <ComponentCard title="📊 Sector Strength Ratings">
        <div className="rounded-lg bg-red-50 p-6 text-red-800 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚠️</span>
            <p className="font-semibold text-lg">Connection Issue</p>
          </div>
          <p className="text-sm border-l-2 border-red-200 pl-3 py-1 mb-4">
            {error.includes("fetch failed") ? "Unable to connect to the data provider." : error}
          </p>
          <button
            onClick={() => fetchRatings()}
            className="px-4 py-2 bg-red-100 dark:bg-red-800/40 hover:bg-red-200 dark:hover:bg-red-800/60 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-700"
          >
            🔄 Try Again
          </button>
        </div>
      </ComponentCard>
    );
  }

  if (ratings.length === 0) {
    return (
      <ComponentCard title="📊 Sector Strength Ratings">
        <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800">
          <div className="mb-4 text-4xl opacity-50 text-gray-400">📊</div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No rating data available</h3>
          <button
            onClick={() => fetchRatings()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium shadow-sm transition-all active:scale-95"
          >
            Refresh Data
          </button>
        </div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard
      title="📊 Sector Strength Ratings"
      className="rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-white/3 overflow-hidden"
    >
      <div className="space-y-6">
        {/* Header Legend */}
        <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Thang điểm:</span>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-bold shadow-sm">≥70 Rất mạnh</span>
            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-bold shadow-sm">50–69 Mạnh</span>
            <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-bold shadow-sm">30–49 Trung bình</span>
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold shadow-sm">&lt;30 Yếu</span>
          </div>
          <div className="ml-auto text-[10px] text-gray-400 font-medium">
             ⏱️ {lastUpdated}
          </div>
        </div>

        {/* Side-by-Side Tables */}
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Top 10 Table */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
               <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                 <span className="text-xl">🏆</span> NGÀNH (TOP 10)
               </h3>
               <span className="text-[10px] text-gray-400 font-bold uppercase">ĐIỂM SỨC MẠNH</span>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase">
                    <th className="pb-3 px-2 w-10 text-center">#</th>
                    <th className="pb-3 px-2 w-12 text-center">±</th>
                    <th className="pb-3 px-2">Tên Ngành</th>
                    <th className="pb-3 px-2 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {ratings.slice(0, Math.ceil(ratings.length / 2)).map((sector, index) => (
                    <tr key={sector.name} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-2 text-center font-bold text-gray-400">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {sector.change !== undefined && (
                          <span className={`text-[10px] font-black flex items-center justify-center gap-0.5 ${sector.change > 0 ? "text-green-600" : sector.change < 0 ? "text-red-500" : "text-gray-300"}`}>
                            {sector.change > 0 && "▲"}
                            {sector.change < 0 && "▼"}
                            {sector.change === 0 && "—"}
                            {sector.change !== 0 && Math.abs(sector.change)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-sm font-bold ${index < 3 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
                          {sector.name}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={`${getRatingColor(sector.rating)} inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-sm shadow-lg transform group-hover:scale-110 transition-transform`}>
                          {sector.rating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom 10 Table */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
               <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                 <span className="text-xl">📉</span> NGÀNH (BOTTOM 10)
               </h3>
               <span className="text-[10px] text-gray-400 font-bold uppercase">ĐIỂM SỨC MẠNH</span>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase">
                    <th className="pb-3 px-2 w-10 text-center">#</th>
                    <th className="pb-3 px-2 w-12 text-center">±</th>
                    <th className="pb-3 px-2">Tên Ngành</th>
                    <th className="pb-3 px-2 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {ratings.slice(Math.ceil(ratings.length / 2)).map((sector, index) => {
                    const rank = Math.ceil(ratings.length / 2) + index + 1;
                    return (
                      <tr key={sector.name} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-2 text-center font-bold text-gray-400">
                          {rank}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {sector.change !== undefined && (
                            <span className={`text-[10px] font-black flex items-center justify-center gap-0.5 ${sector.change > 0 ? "text-green-600" : sector.change < 0 ? "text-red-500" : "text-gray-300"}`}>
                              {sector.change > 0 && "▲"}
                              {sector.change < 0 && "▼"}
                              {sector.change === 0 && "—"}
                              {sector.change !== 0 && Math.abs(sector.change)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                            {sector.name}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={`${getRatingColor(sector.rating)} inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-sm shadow-lg transform group-hover:scale-110 transition-transform`}>
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
        </div>

        {/* Footer Info */}
        <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-400 font-medium">
            Source: <a href="https://chungkhoancaykhe.vn/overview" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">chungkhoancaykhe.vn/overview</a>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Very Strong</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-600"></span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Strong</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Fair</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Weak</span>
             </div>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
