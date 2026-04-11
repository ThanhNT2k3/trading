export type Exchange =
  | "ALL"
  | "HOSE"
  | "HNX"
  | "UPCOM"
  | "VN30"
  | "VN100"
  | "UNKNOWN";

export type TradableExchange = "HOSE" | "HNX" | "UPCOM" | "UNKNOWN";

export interface HistoryBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoryApiResponse {
  s: "ok" | "error" | string;
  t?: number[];
  o?: number[];
  h?: number[];
  l?: number[];
  c?: number[];
  v?: number[];
  nextTime?: number;
  errmsg?: string;
}

export interface StockRow {
  ticker: string;
  exchange: TradableExchange;
  latestClose: number | null;
  changePercent: number | null;
  latestVolume: number | null;
  ma20: number | null;
  ma50: number | null;
  ma200: number | null;
  aboveMa20: boolean | null;
  aboveMa50: boolean | null;
  volumeMomentum: number | null;
  volumeMomentumState: "expanding" | "neutral" | "contracting" | "unknown";
  supply: number | null;
  demand: number | null;
  powerIndex: number | null;
  isNear52WeekHigh: boolean;
  isNear52WeekLow: boolean;
  hasEnough52WeekData: boolean;
  points: HistoryBar[];
  pe: number | null;
  pb: number | null;
  roe: number | null;
  marketCap: number | null;
  proprietaryTradeVolume: number | null;
  error?: string;
}

export interface ChartPoint {
  x: string;
  y: number;
}

export interface StocksFilterState {
  exchange: Exchange;
  startDate: string;
  endDate: string;
  search: string;
  liquidityMode: "ALL" | "MIN_TRADE_VALUE" | "RANGE";
  minTradeValue: string;
  maxTradeValue: string;
}

export interface MarketOverviewItem {
  label: "HOSE" | "HNX" | "UPCOM" | "VNINDEX";
  totalLiquidity: number | null;
  avgChangePercent: number | null;
  up: number;
  down: number;
  flat: number;
  note?: string;
}

export interface BreadthMetrics {
  advancers: number;
  decliners: number;
  flats: number;
  advanceDeclineRatio: number | null;
  highCount: number;
  lowCount: number;
  hlRatio: number | null;
  hlIsEstimated: boolean;
}

export interface VolumeMomentumMetrics {
  value: number | null;
  state: "expanding" | "neutral" | "contracting" | "unknown";
}

export interface MovingAverageMetrics {
  totalEligibleMa20: number;
  totalEligibleMa50: number;
  aboveMa20Percent: number | null;
  aboveMa50Percent: number | null;
}

export interface PowerMetrics {
  demandAvg: number | null;
  supplyAvg: number | null;
  powerIndexAvg: number | null;
}

export interface DailyAggregateRow {
  date: string;
  aboveMa10Count: number;
  aboveMa20Count: number;
  aboveMa50Count: number;
  totalLiquidity: number;
  indexChangeVsCurrent: number | null;
  indexChangeVsPrevious: number | null;
}

export interface VixSnapshot {
  value: number | null;
  timestamp: number | null;
  asOf: string | null;
}

export interface FinanceMetrics {
  pb: number | null;
  pe: number | null;
  roa: number | null;
  roe: number | null;
  marketCap: number | null;
}

export interface PEPBData {
  now: FinanceMetrics;
  past: FinanceMetrics;
  dataChart: Array<{
    pe: number;
    index: number;
    lnst: number;
    time: string;
    timeStamp: number;
  }>;
}

export interface ProprietaryTradeData {
  symbol: string;
  currentPrice: number;
  basicPrice: number;
  changePrice: number;
  changePricePercent: number;
  ceilPrice: number;
  floorPrice: number;
  volume: number;
  value: number;
  companyName: string;
  changeType: number;
}

export interface InvestorHistoryData {
  buyVol: number;
  buyVal: number;
  sellVol: number;
  sellVal: number;
  netVol: number;
  netVal: number;
  date: string;
}
