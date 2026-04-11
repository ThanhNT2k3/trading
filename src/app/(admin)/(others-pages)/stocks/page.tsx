import type { Metadata } from "next";
import React from "react";
import StocksDashboard from "@/components/stocks/StocksDashboard";

export const metadata: Metadata = {
  title: "Stocks Dashboard | TailAdmin",
  description: "Stock dashboard with exchange filters and chart",
};

export default function StocksPage() {
  return <StocksDashboard />;
}
