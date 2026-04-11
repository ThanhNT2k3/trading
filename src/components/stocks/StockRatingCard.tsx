"use client";

import React from "react";
import { TechnicalScore } from "@/lib/stocks/scoring";

interface StockRatingCardProps {
  rating: TechnicalScore;
}

export default function StockRatingCard({ rating }: StockRatingCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-green-600";
    if (score >= 65) return "from-blue-500 to-blue-600";
    if (score >= 50) return "from-yellow-500 to-yellow-600";
    return "from-red-500 to-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-50 dark:bg-green-900";
    if (score >= 65) return "bg-blue-50 dark:bg-blue-900";
    if (score >= 50) return "bg-yellow-50 dark:bg-yellow-900";
    return "bg-red-50 dark:bg-red-900";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-green-700 dark:text-green-200";
    if (score >= 65) return "text-blue-700 dark:text-blue-200";
    if (score >= 50) return "text-yellow-700 dark:text-yellow-200";
    return "text-red-700 dark:text-red-200";
  };

  const getStatusBadge = (status: "positive" | "neutral" | "negative") => {
    switch (status) {
      case "positive":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            Positive
          </span>
        );
      case "negative":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            Negative
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <span className="h-2 w-2 rounded-full bg-gray-500"></span>
            Neutral
          </span>
        );
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {/* Top Bar with Ticker and Score */}
      <div className={`flex items-start justify-between border-b border-gray-200 p-4 dark:border-gray-700 bg-gradient-to-r ${getScoreColor(rating.score)}`}>
        <div>
          <div className="text-sm font-medium text-white opacity-90">{rating.exchange}</div>
          <div className="text-lg font-bold text-white">{rating.ticker}</div>
        </div>
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-lg font-bold text-white shadow-lg ${getScoreBgColor(rating.score)}`}
        >
          <div className={getScoreTextColor(rating.score)}>{rating.score}</div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {/* Criteria Scores */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Price Trend</div>
            <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {rating.priceTrendScore}/35
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                style={{ width: `${(rating.priceTrendScore / 35) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Cash Flow</div>
            <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {rating.cashFlowScore}/30
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
                style={{ width: `${(rating.cashFlowScore / 30) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Momentum</div>
            <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {rating.momentumScore}/30
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600"
                style={{ width: `${(rating.momentumScore / 30) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400">52W Pos</div>
            <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {rating.position52wScore}/5
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600"
                style={{ width: `${(rating.position52wScore / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              MA50/MA200
            </span>
            {getStatusBadge(rating.details.ma50ma200Status)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">MACD</span>
            {getStatusBadge(rating.details.macdStatus)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Volume</span>
            {getStatusBadge(rating.details.volumeStatus)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">OBV</span>
            {getStatusBadge(rating.details.obvStatus)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Breakout</span>
            {getStatusBadge(rating.details.breakoutStatus)}
          </div>
        </div>

        {/* 52W Indicators */}
        {(rating.details.near52wHigh || rating.details.near52wLow) && (
          <div className="flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
            {rating.details.near52wHigh && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                📈 Near 52W High
              </span>
            )}
            {rating.details.near52wLow && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                📉 Near 52W Low
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
