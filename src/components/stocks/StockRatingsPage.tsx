"use client";

import React, { useState, useEffect } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import StockRatingCard from "./StockRatingCard";
import SectorValuationRatings from "./SectorValuationRatings";
import { TechnicalScore } from "@/lib/stocks/scoring";

export default function StockRatingsPage() {
  const [ratings, setRatings] = useState<TechnicalScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "price-trend" | "cash-flow" | "momentum" | "52w">(
    "score",
  );

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stocks/ratings");
      if (!response.ok) {
        throw new Error("Failed to fetch stock ratings");
      }
      const data = await response.json();
      setRatings(data.ratings || []);
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      setRatings([]);
    } finally {
      setLoading(false);
    }
  };

  const getSortedRatings = () => {
    return [...ratings].sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.score - a.score;
        case "price-trend":
          return b.priceTrendScore - a.priceTrendScore;
        case "cash-flow":
          return b.cashFlowScore - a.cashFlowScore;
        case "momentum":
          return b.momentumScore - a.momentumScore;
        case "52w":
          return b.position52wScore - a.position52wScore;
        default:
          return b.score - a.score;
      }
    });
  };

  const sortedRatings = getSortedRatings();

  return (
    <>


      {/* Sector Valuation Ratings Section */}
      <div className="mt-8">
        <SectorValuationRatings />
      </div>
    </>
  );
}
