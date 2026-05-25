import { promises as fs } from "fs";
import path from "path";
import { normalizePortfolioData, priceToCurrencyValue, summarizePortfolio } from "@/lib/portfolio";
import {
  fetchFundMarketData,
  fetchStockPrices,
  getStockSymbolsForPortfolio,
} from "@/lib/portfolio/market-data";
import type {
  FundNavRow,
  PortfolioData,
  PortfolioHolding,
  PortfolioSnapshot,
  StockPriceRow,
} from "@/lib/portfolio";

const PORTFOLIO_FILE = path.join(process.cwd(), "data", "portfolio.json");

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function upsertSnapshot(snapshots: PortfolioSnapshot[], snapshot: PortfolioSnapshot) {
  const existingIndex = snapshots.findIndex((item) => item.id === snapshot.id);
  if (existingIndex >= 0) {
    const nextSnapshots = [...snapshots];
    nextSnapshots[existingIndex] = snapshot;
    return nextSnapshots;
  }

  return [...snapshots, snapshot];
}

function getMarketPrice(
  holding: PortfolioHolding,
  fundBySymbol: Map<string, FundNavRow>,
  stockBySymbol: Map<string, StockPriceRow>,
) {
  const symbol = holding.symbol.toUpperCase();
  const fund = fundBySymbol.get(symbol);
  if (fund) {
    return {
      source: "fund" as const,
      latestDate: fund.latestDate,
      latestPrice: fund.latestNav,
      previousDate: fund.previousDate,
      previousPrice: fund.previousNav,
      change: fund.change,
      changePercent: fund.changePercent,
      history: fund.history,
    };
  }

  const stock = stockBySymbol.get(symbol);
  if (stock) {
    return {
      source: "stock" as const,
      latestDate: stock.latestDate,
      latestPrice: stock.latestPrice,
      previousDate: stock.previousDate,
      previousPrice: stock.previousPrice,
      change: stock.change,
      changePercent: stock.changePercent,
      history: stock.history,
    };
  }

  return null;
}

function marketSnapshotsForHolding(
  holding: PortfolioHolding,
  price: NonNullable<ReturnType<typeof getMarketPrice>>,
) {
  return price.history.map((point) => ({
    id: `snap-${holding.id}-${point.date}`,
    holdingId: holding.id,
    date: point.date,
    closePrice: point.price,
  }));
}

async function readPortfolioFile() {
  const raw = await fs.readFile(PORTFOLIO_FILE, "utf8");
  return normalizePortfolioData(JSON.parse(raw) as Partial<PortfolioData>);
}

function applyMarketData(
  portfolio: PortfolioData,
  fundRows: FundNavRow[],
  stockRows: StockPriceRow[],
) {
  const fundBySymbol = new Map(fundRows.map((row) => [row.symbol.toUpperCase(), row]));
  const stockBySymbol = new Map(stockRows.map((row) => [row.symbol.toUpperCase(), row]));
  let dailySnapshots = [...portfolio.dailySnapshots];
  const holdings = portfolio.holdings.map((holding) => {
    const price = getMarketPrice(holding, fundBySymbol, stockBySymbol);
    if (!price) return holding;

    marketSnapshotsForHolding(holding, price).forEach((snapshot) => {
      dailySnapshots = upsertSnapshot(dailySnapshots, snapshot);
    });

    return {
      ...holding,
      type: price.source,
      currentPrice: price.latestPrice,
    };
  });

  return {
    ...portfolio,
    holdings,
    dailySnapshots,
  };
}

function buildMovementLines(
  holdings: PortfolioHolding[],
  fundRows: FundNavRow[],
  stockRows: StockPriceRow[],
) {
  const fundBySymbol = new Map(fundRows.map((row) => [row.symbol.toUpperCase(), row]));
  const stockBySymbol = new Map(stockRows.map((row) => [row.symbol.toUpperCase(), row]));

  return holdings
    .map((holding) => {
      const price = getMarketPrice(holding, fundBySymbol, stockBySymbol);
      if (!price) return null;

      const effectiveHolding = { ...holding, type: price.source };
      const latestPrice = priceToCurrencyValue(effectiveHolding, price.latestPrice);
      const previousPrice =
        price.previousPrice === null
          ? latestPrice
          : priceToCurrencyValue(effectiveHolding, price.previousPrice);
      const dailyProfitLoss = (latestPrice - previousPrice) * holding.quantity;

      return {
        symbol: holding.symbol,
        dailyProfitLoss,
        changePercent: price.changePercent,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => Math.abs(b.dailyProfitLoss) - Math.abs(a.dailyProfitLoss))
    .slice(0, 8)
    .map(
      (row) =>
        `${row.dailyProfitLoss >= 0 ? "+" : "-"} ${row.symbol}: ${formatCurrency(
          row.dailyProfitLoss,
        )} (${formatPercent(row.changePercent)})`,
    );
}

export async function buildDailyPortfolioReport() {
  const portfolio = await readPortfolioFile();
  const fundMarketData = await fetchFundMarketData();
  const stockSymbols = getStockSymbolsForPortfolio(portfolio.holdings, fundMarketData.funds);
  const stockRows = await fetchStockPrices(stockSymbols);
  const livePortfolio = applyMarketData(portfolio, fundMarketData.funds, stockRows);
  const summary = summarizePortfolio(livePortfolio);
  const movementLines = buildMovementLines(
    livePortfolio.holdings,
    fundMarketData.funds,
    stockRows,
  );
  const weeklyCapital = fundMarketData.weeklyPlan.reduce((sum, row) => sum + row.amount, 0);
  const weeklyReady = fundMarketData.weeklyPlan.filter(
    (row) => row.executionDate && row.nav !== null,
  ).length;

  const content = [
    `**Daily Portfolio Report - ${new Date().toLocaleDateString("vi-VN")}**`,
    `Market value: **${formatCurrency(summary.totalMarketValue)}**`,
    `Total P/L: **${formatCurrency(summary.totalUnrealizedProfitLoss)}** (${formatPercent(
      summary.totalUnrealizedProfitLossPercent,
    )})`,
    `Day P/L: **${formatCurrency(summary.totalDailyProfitLoss)}** (${formatPercent(
      summary.totalDailyProfitLossPercent,
    )})`,
    `Holdings: ${summary.holdings.length}`,
    "",
    "**Top daily moves**",
    movementLines.length > 0 ? movementLines.join("\n") : "No market price data available.",
    "",
    `Weekly fund plan: ${formatCurrency(weeklyCapital)} (${weeklyReady}/${fundMarketData.weeklyPlan.length} ready)`,
  ].join("\n");

  return {
    content,
    portfolio: livePortfolio,
    summary,
    weeklyPlan: fundMarketData.weeklyPlan,
  };
}

export async function sendDiscordPortfolioReport(webhookUrl: string) {
  const report = await buildDailyPortfolioReport();
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: report.content,
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook returned ${response.status}`);
  }

  return report;
}
