import type {
  HoldingSummary,
  PortfolioCategorySummary,
  PortfolioData,
  PortfolioHolding,
  PortfolioSnapshot,
  PortfolioSummary,
} from "./types";

const EMPTY_SUMMARY: PortfolioSummary = {
  totalCost: 0,
  totalMarketValue: 0,
  totalUnrealizedProfitLoss: 0,
  totalUnrealizedProfitLossPercent: 0,
  totalDailyProfitLoss: 0,
  totalDailyProfitLossPercent: 0,
  bestPerformer: null,
  worstPerformer: null,
  holdings: [],
  categories: [],
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function byDateAsc(a: PortfolioSnapshot, b: PortfolioSnapshot) {
  return a.date.localeCompare(b.date);
}

function snapshotsForHolding(snapshots: PortfolioSnapshot[], holdingId: string) {
  return snapshots
    .filter((snapshot) => snapshot.holdingId === holdingId)
    .sort(byDateAsc);
}

export function priceToCurrencyValue(holding: PortfolioHolding, price: number) {
  if (holding.type === "stock") return price * 1000;
  if (holding.type === "fund" && Math.abs(price) < 1000) return price * 1000;
  return price;
}

function buildHoldingSummary(
  holding: PortfolioHolding,
  snapshots: PortfolioSnapshot[],
): Omit<HoldingSummary, "allocationPercent"> {
  const quantity = toNumber(holding.quantity);
  const averageCost = priceToCurrencyValue(holding, toNumber(holding.averageCost));
  const orderedSnapshots = snapshotsForHolding(snapshots, holding.id);
  const latestSnapshot = orderedSnapshots.at(-1);
  const previousSnapshot = orderedSnapshots.at(-2);
  const latestPrice = priceToCurrencyValue(
    holding,
    latestSnapshot?.closePrice ?? toNumber(holding.currentPrice),
  );
  const previousPrice = previousSnapshot
    ? priceToCurrencyValue(holding, previousSnapshot.closePrice)
    : null;
  const totalCost = quantity * averageCost;
  const marketValue = quantity * latestPrice;
  const unrealizedProfitLoss = marketValue - totalCost;
  const dailyProfitLoss = previousPrice === null ? 0 : (latestPrice - previousPrice) * quantity;
  const previousValue = previousPrice === null ? 0 : previousPrice * quantity;

  return {
    holdingId: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    type: holding.type,
    category: holding.category,
    quantity,
    averageCost,
    latestPrice,
    previousPrice,
    totalCost,
    marketValue,
    unrealizedProfitLoss,
    unrealizedProfitLossPercent: totalCost === 0 ? 0 : (unrealizedProfitLoss / totalCost) * 100,
    dailyProfitLoss,
    dailyProfitLossPercent: previousValue === 0 ? 0 : (dailyProfitLoss / previousValue) * 100,
  };
}

function buildCategories(holdings: HoldingSummary[], totalMarketValue: number) {
  const categoryMap = new Map<string, PortfolioCategorySummary>();

  holdings.forEach((holding) => {
    const current = categoryMap.get(holding.category) ?? {
      category: holding.category || "Uncategorized",
      marketValue: 0,
      unrealizedProfitLoss: 0,
      allocationPercent: 0,
    };
    current.marketValue += holding.marketValue;
    current.unrealizedProfitLoss += holding.unrealizedProfitLoss;
    categoryMap.set(current.category, current);
  });

  return Array.from(categoryMap.values())
    .map((category) => ({
      ...category,
      allocationPercent:
        totalMarketValue === 0 ? 0 : (category.marketValue / totalMarketValue) * 100,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}

export function summarizePortfolio(data: PortfolioData): PortfolioSummary {
  if (data.holdings.length === 0) {
    return EMPTY_SUMMARY;
  }

  const baseHoldings = data.holdings.map((holding) =>
    buildHoldingSummary(holding, data.dailySnapshots),
  );
  const totalCost = baseHoldings.reduce((sum, holding) => sum + holding.totalCost, 0);
  const totalMarketValue = baseHoldings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalUnrealizedProfitLoss = totalMarketValue - totalCost;
  const totalDailyProfitLoss = baseHoldings.reduce(
    (sum, holding) => sum + holding.dailyProfitLoss,
    0,
  );
  const previousMarketValue = totalMarketValue - totalDailyProfitLoss;
  const holdings = baseHoldings
    .map((holding) => ({
      ...holding,
      allocationPercent:
        totalMarketValue === 0 ? 0 : (holding.marketValue / totalMarketValue) * 100,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
  const byPerformance = [...holdings].sort(
    (a, b) => b.unrealizedProfitLossPercent - a.unrealizedProfitLossPercent,
  );

  return {
    totalCost,
    totalMarketValue,
    totalUnrealizedProfitLoss,
    totalUnrealizedProfitLossPercent:
      totalCost === 0 ? 0 : (totalUnrealizedProfitLoss / totalCost) * 100,
    totalDailyProfitLoss,
    totalDailyProfitLossPercent:
      previousMarketValue === 0 ? 0 : (totalDailyProfitLoss / previousMarketValue) * 100,
    bestPerformer: byPerformance[0] ?? null,
    worstPerformer: byPerformance.at(-1) ?? null,
    holdings,
    categories: buildCategories(holdings, totalMarketValue),
  };
}

export function normalizePortfolioData(input: Partial<PortfolioData>): PortfolioData {
  return {
    holdings: Array.isArray(input.holdings) ? input.holdings : [],
    dailySnapshots: Array.isArray(input.dailySnapshots) ? input.dailySnapshots : [],
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}
