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
  ath: number | null;
  athDate: string | null;
  isAtATH: boolean;
  athReachedWithin1Year: boolean;
  error?: string;
}

export interface StockFundamentals {
  ticker: string;
  source: string;
  asOf: string | null;
  eps: number | null;
  dilutedEps: number | null;
  bvps: number | null;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  sharesOutstanding: number | null;
  revenue: number | null;
  revenueGrowth: number | null;
  netIncome: number | null;
  netIncomeGrowth: number | null;
  roe: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  equity: number | null;
  debtToAssets: number | null;
  debtToEquity: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  dataPoints: string[];
  missingData: string[];
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

export type BreadthRegimeType =
  | "broad_rally"
  | "narrow_rally"
  | "healthy_pullback"
  | "market_washout"
  | "early_recovery"
  | "neutral";

export interface BreadthRegimeSignal {
  regime: BreadthRegimeType;
  label: string;
  tone: "success" | "warning" | "error" | "neutral";
  description: string;
  indexChange20d: number | null;
  ma20Breadth: number | null;
  ma20BreadthChange5d: number | null;
  ma20BreadthChange20d: number | null;
  ma50Breadth: number | null;
  divergence: number | null;
}

export type SmartMoneyPattern =
  | "Accumulation base"
  | "Volume expansion"
  | "Volume dry-up"
  | "Liquidity support"
  | "OBV confirmation"
  | "Absorption"
  | "Breakout setup";

export interface SmartMoneySignal {
  ticker: string;
  exchange: TradableExchange;
  score: number;
  grade: "A+" | "A" | "B";
  state: "confirmed" | "building" | "early_watch";
  evidenceCount: number;
  appliedScoreFloor: number;
  componentScores: {
    volume: number;
    priceStructure: number;
    flow: number;
    trend: number;
    risk: number;
  };
  patterns: SmartMoneyPattern[];
  explanations: string[];
  metrics: {
    latestClose: number;
    priceChange20d: number | null;
    rangeCompression20d: number | null;
    volumeRatio5dTo20d: number | null;
    volumeRatio10dTo20d: number | null;
    avgTradeValue20d: number | null;
    avgTradeValue60d: number | null;
    tradeValueRatio5dTo20d: number | null;
    tradeValueRatio20dTo60d: number | null;
    obvChange10d: number | null;
    volatility20d: number | null;
    drawdownFrom60dHigh: number | null;
    priceChange60d: number | null;
    relativeStrength20d: number | null;
    indexChange20d: number | null;
    entryPrice: number;
    entryZoneLow: number;
    entryZoneHigh: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskReward1: number | null;
    riskReward2: number | null;
  };
}

export interface SmartMoneyFilterConfig {
  minScore: number;
  minEvidence: number;
  minRelativeStrength20d: number | null;
  allowedStates: SmartMoneySignal["state"][] | null;
}

export interface SmartMoneyWalkForwardStats {
  sliceCount: number;
  eligibleSlices: number;
  sampleSize: number;
  winRate10d: number | null;
  avgReturn10d: number | null;
  worstSliceWinRate10d: number | null;
  dispersion10d: number | null;
}

export interface SmartMoneyBacktestRecommendation {
  mode: "win_rate";
  scope: "ALL" | TradableExchange;
  config: SmartMoneyFilterConfig;
  sampleSize: number;
  winRate10d: number | null;
  avgReturn10d: number | null;
  robustnessScore: number | null;
  walkForward: SmartMoneyWalkForwardStats | null;
}

export interface SmartMoneyBacktestWindowStats {
  horizon: 5 | 10 | 20;
  sampleSize: number;
  positiveCount: number;
  negativeCount: number;
  winRate: number | null;
  avgReturn: number | null;
  medianReturn: number | null;
}

export interface SmartMoneyBacktestStateStats {
  state: SmartMoneySignal["state"];
  sampleSize: number;
  avgScore: number | null;
  avgReturn10d: number | null;
  winRate10d: number | null;
}

export interface SmartMoneyBacktestScoreBucket {
  label: string;
  sampleSize: number;
  avgReturn10d: number | null;
  winRate10d: number | null;
}

export interface SmartMoneyBacktestSummary {
  lookbackDays: number;
  totalSignals: number;
  coverageTickers: number;
  windows: SmartMoneyBacktestWindowStats[];
  byState: SmartMoneyBacktestStateStats[];
  scoreBuckets: SmartMoneyBacktestScoreBucket[];
  recommendedWinRate: SmartMoneyBacktestRecommendation | null;
  recommendationsByExchange: SmartMoneyBacktestRecommendation[];
}

export type AbnormalSignalType =
  | "PRICE_SHOCK"
  | "VOLUME_SHOCK"
  | "TURNOVER_SPIKE"
  | "FLOW_ANOMALY"
  | "RANGE_BREAK";

export type AbnormalAlertRank = "A" | "B" | "C";

export interface AbnormalSignal {
  ticker: string;
  exchange: TradableExchange;
  date: string;
  severity: number;
  rank: AbnormalAlertRank;
  priorityScore: number;
  direction: "UP" | "DOWN";
  evidenceCount: number;
  types: AbnormalSignalType[];
  explanations: string[];
  metrics: {
    latestClose: number;
    return1d: number | null;
    return3d: number | null;
    rangePercent1d: number | null;
    return1dZ: number | null;
    return3dZ: number | null;
    rangeZ: number | null;
    volumeRatio1dTo20d: number | null;
    volumeZ: number | null;
    avgTradeValue20d: number | null;
    avgTradeValue60d: number | null;
    turnoverZ: number | null;
    turnoverRatio5dTo20d: number | null;
    turnoverRatio20dTo60d: number | null;
    obvChange5d: number | null;
    obvZ: number | null;
    relativeStrength20d: number | null;
  };
}

export interface AbnormalBacktestWindowStats {
  horizon: 1 | 3 | 5 | 10;
  sampleSize: number;
  positiveCount: number;
  negativeCount: number;
  winRate: number | null;
  avgReturn: number | null;
  medianReturn: number | null;
}

export interface AbnormalBacktestDirectionStats {
  direction: AbnormalSignal["direction"];
  sampleSize: number;
  avgSeverity: number | null;
  winRate3d: number | null;
  avgReturn3d: number | null;
}

export interface AbnormalBacktestTypeStats {
  type: AbnormalSignalType;
  sampleSize: number;
  winRate3d: number | null;
  avgReturn3d: number | null;
}

export interface AbnormalBacktestRankStats {
  rank: AbnormalAlertRank;
  sampleSize: number;
  winRate3d: number | null;
  avgReturn3d: number | null;
}

export interface AbnormalBacktestSummary {
  lookbackDays: number;
  totalSignals: number;
  coverageTickers: number;
  windows: AbnormalBacktestWindowStats[];
  byDirection: AbnormalBacktestDirectionStats[];
  byType: AbnormalBacktestTypeStats[];
  byRank: AbnormalBacktestRankStats[];
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

export type MOSSignalType =
  | "STRONG_CANDIDATE"
  | "WATCHLIST"
  | "NEUTRAL"
  | "OVERVALUED"
  | "AVOID";

export type MOSAlertSeverity = "strong" | "watch" | "info" | "risk" | "danger";

export interface IntrinsicValueBreakdown {
  intrinsicValue: number | null;
  peFairValue: number | null;
  pbFairValue: number | null;
  grahamValue: number | null;
  fairPe: number | null;
  fairPb: number | null;
  epsEstimate: number | null;
  bookValuePerShareEstimate: number | null;
  confidence: number;
  dataPoints: string[];
  missingData: string[];
  source: "market-ratios" | "fundamentals";
}

export interface MOSAlert {
  code:
    | "MOS_STRONG_ZONE"
    | "MOS_BUY_ZONE"
    | "MOS_OVERVALUED"
    | "VALUE_TRAP_RISK"
    | "LOW_CONFIDENCE"
    | "QUALITY_SUPPORT";
  severity: MOSAlertSeverity;
  message: string;
}

export interface MOSTradePlan {
  action: "ACCUMULATE" | "WATCH" | "WAIT" | "AVOID";
  entryPrice: number | null;
  entryZoneLow: number | null;
  entryZoneHigh: number | null;
  stopLoss: number | null;
  takeProfit1: number | null;
  takeProfit2: number | null;
  riskReward1: number | null;
  riskReward2: number | null;
  riskPercent: number | null;
  upsideToFairValue: number | null;
  planNote: string;
}

export interface MOSRankingRow {
  ticker: string;
  exchange: TradableExchange;
  price: number | null;
  intrinsicValue: number | null;
  marginOfSafety: number | null;
  qualityScore: number;
  valuationScore: number;
  confidenceScore: number;
  finalScore: number;
  signal: MOSSignalType;
  alerts: MOSAlert[];
  reasons: string[];
  tradePlan: MOSTradePlan;
  breakdown: IntrinsicValueBreakdown;
  metrics: {
    pe: number | null;
    pb: number | null;
    roe: number | null;
    revenueGrowth: number | null;
    netIncomeGrowth: number | null;
    debtToEquity: number | null;
    debtToAssets: number | null;
    operatingCashFlow: number | null;
    freeCashFlow: number | null;
    volumeMomentum: number | null;
    powerIndex: number | null;
  };
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
