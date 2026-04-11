import type { Metadata } from "next";
import React from "react";
import StockRatingsPage from "@/components/stocks/StockRatingsPage";

export const metadata: Metadata = {
  title: "Stock Technical Ratings | TailAdmin",
  description: "Top 20 stocks ranked by technical analysis score",
};

export default function StockRatingsPageWrapper() {
  return <StockRatingsPage />;
}
