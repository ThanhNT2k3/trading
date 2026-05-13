import type { Metadata } from "next";
import PortfolioPage from "@/components/portfolio/PortfolioPage";

export const metadata: Metadata = {
  title: "Portfolio | TailAdmin",
  description: "Hidden personal portfolio tracker with local JSON persistence",
};

export default function Page() {
  return <PortfolioPage />;
}
