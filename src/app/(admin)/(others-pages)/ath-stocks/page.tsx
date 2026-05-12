import type { Metadata } from "next";
import React from "react";
import ATHStocksPage from "@/components/stocks/ATHStocksPage";

export const metadata: Metadata = {
  title: "ATH Stocks | TailAdmin",
  description: "Stocks reaching All-Time High within 1 year",
};

export default function ATHPage() {
  return <ATHStocksPage />;
}
