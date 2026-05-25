export type PortfolioAssetType = "stock" | "fund" | "bond" | "crypto" | "cash" | "other";

export type PortfolioHolding = {
  id: string;
  type: PortfolioAssetType;
  symbol: string;
  name: string;
  category: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  currency: string;
  notes?: string;
};

export type PortfolioSnapshot = {
  id: string;
  holdingId: string;
  date: string;
  closePrice: number;
};

export type PortfolioData = {
  holdings: PortfolioHolding[];
  dailySnapshots: PortfolioSnapshot[];
  updatedAt: string;
};

export type HoldingSummary = {
  holdingId: string;
  symbol: string;
  name: string;
  type: PortfolioAssetType;
  category: string;
  quantity: number;
  averageCost: number;
  latestPrice: number;
  previousPrice: number | null;
  totalCost: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossPercent: number;
  dailyProfitLoss: number;
  dailyProfitLossPercent: number;
  allocationPercent: number;
};

export type PortfolioCategorySummary = {
  category: string;
  marketValue: number;
  unrealizedProfitLoss: number;
  allocationPercent: number;
};

export type PortfolioSummary = {
  totalCost: number;
  totalMarketValue: number;
  totalUnrealizedProfitLoss: number;
  totalUnrealizedProfitLossPercent: number;
  totalDailyProfitLoss: number;
  totalDailyProfitLossPercent: number;
  bestPerformer: HoldingSummary | null;
  worstPerformer: HoldingSummary | null;
  holdings: HoldingSummary[];
  categories: PortfolioCategorySummary[];
};

export type PriceHistoryPoint = {
  date: string;
  price: number;
};

export type FundNavRow = {
  symbol: string;
  latestDate: string;
  latestNav: number;
  previousDate: string | null;
  previousNav: number | null;
  change: number;
  changePercent: number;
  history: PriceHistoryPoint[];
};

export type StockPriceRow = {
  symbol: string;
  latestDate: string;
  latestPrice: number;
  previousDate: string | null;
  previousPrice: number | null;
  change: number;
  changePercent: number;
  history: PriceHistoryPoint[];
};

export type WeeklyFundPlanRow = {
  symbol: string;
  inputSymbol: string;
  amount: number;
  executionDate: string | null;
  nav: number | null;
  estimatedUnits: number;
};
