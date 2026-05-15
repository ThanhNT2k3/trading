import {
  AbnormalAlertRank,
  AbnormalBacktestSummary,
  AbnormalBacktestWindowStats,
  AbnormalSignal,
  AbnormalSignalType,
  BreadthRegimeSignal,
  SmartMoneyBacktestSummary,
  SmartMoneyBacktestRecommendation,
  SmartMoneyFilterConfig,
  SmartMoneyBacktestWindowStats,
  SmartMoneyPattern,
  SmartMoneySignal,
  StockRow,
  TradableExchange,
} from "@/types/stocks";
import { enrichStockRow } from "@/lib/stocks/analytics";

export interface TechnicalScore {
  ticker: string;
  exchange: string;
  score: number;
  priceTrendScore: number;
  cashFlowScore: number;
  momentumScore: number;
  position52wScore: number;
  details: {
    ma50ma200Status: "positive" | "negative" | "neutral";
    macdStatus: "positive" | "neutral" | "negative";
    volumeStatus: "positive" | "neutral" | "negative";
    obvStatus: "positive" | "neutral" | "negative";
    rsLine: number | null;
    breakoutStatus: "positive" | "neutral" | "negative";
    near52wHigh: boolean;
    near52wLow: boolean;
  };
}

export function calculateTechnicalScore(row: StockRow): TechnicalScore {
  const priceTrendScore = calculatePriceTrendScore(row);
  const cashFlowScore = calculateCashFlowScore(row);
  const momentumScore = calculateMomentumScore(row);
  const position52wScore = calculatePosition52wScore(row);

  const totalScore =
    priceTrendScore +
    cashFlowScore +
    momentumScore +
    position52wScore;

  return {
    ticker: row.ticker,
    exchange: row.exchange,
    score: Math.round(totalScore),
    priceTrendScore,
    cashFlowScore,
    momentumScore,
    position52wScore,
    details: {
      ma50ma200Status: getMa50Ma200Status(row),
      macdStatus: getMacdStatus(row),
      volumeStatus: getVolumeStatus(row),
      obvStatus: getObvStatus(row),
      rsLine: row.powerIndex,
      breakoutStatus: getBreakoutStatus(row),
      near52wHigh: row.isNear52WeekHigh,
      near52wLow: row.isNear52WeekLow,
    },
  };
}

// Price Trend (35 points)
function calculatePriceTrendScore(row: StockRow): number {
  let score = 0;

  // MA50/MA200 position (max 20 points)
  const ma50ma200Status = getMa50Ma200Status(row);
  if (ma50ma200Status === "positive") {
    score += 20;
  } else if (ma50ma200Status === "negative") {
    score += 0;
  } else {
    score += 10;
  }

  // MACD signal (max 15 points)
  const macdStatus = getMacdStatus(row);
  if (macdStatus === "positive") {
    score += 15;
  } else if (macdStatus === "neutral") {
    score += 7;
  }

  return Math.min(score, 35);
}

function getMa50Ma200Status(
  row: StockRow,
): "positive" | "negative" | "neutral" {
  if (row.latestClose === null || row.ma50 === null || row.ma200 === null) {
    return "neutral";
  }

  // If price is below MA200, it's definitely negative
  if (row.latestClose < row.ma200) {
    return "negative";
  }

  // If price is above both MA50 and MA200, it's positive
  if (row.latestClose > row.ma50 && row.latestClose > row.ma200) {
    return "positive";
  }

  return "neutral";
}

function getMacdStatus(row: StockRow): "positive" | "neutral" | "negative" {
  if (row.points.length < 26) return "neutral";

  const closes = row.points.map((p) => p.close);

  // Simple MACD calculation: EMA12 - EMA26
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  if (!ema12 || !ema26) return "neutral";

  const macd = ema12 - ema26;
  const signal = calculateEMA([ema12 - ema26], 9); // Simplified signal line

  if (macd > 0) {
    return "positive";
  } else if (signal !== null && macd < 0 && macd < signal) {
    return "negative";
  }

  return "neutral";
}

// Cash Flow (30 points)
function calculateCashFlowScore(row: StockRow): number {
  let score = 0;

  // Volume trend (max 15 points)
  const volumeStatus = getVolumeStatus(row);
  if (volumeStatus === "positive") {
    score += 15;
  } else if (volumeStatus === "neutral") {
    score += 7;
  }

  // OBV Trend (max 15 points)
  const obvStatus = getObvStatus(row);
  if (obvStatus === "positive") {
    score += 15;
  } else if (obvStatus === "neutral") {
    score += 7;
  }

  return Math.min(score, 30);
}

function getVolumeStatus(row: StockRow): "positive" | "neutral" | "negative" {
  if (
    row.volumeMomentum === null ||
    row.volumeMomentumState === "unknown"
  ) {
    return "neutral";
  }

  if (row.volumeMomentumState === "expanding") {
    return "positive";
  } else if (row.volumeMomentumState === "contracting") {
    return "negative";
  }

  return "neutral";
}

function getObvStatus(row: StockRow): "positive" | "neutral" | "negative" {
  if (row.points.length < 20) return "neutral";

  const volumes = row.points.map((p) => p.volume);
  const closes = row.points.map((p) => p.close);

  // OBV: accumulate volume based on price direction
  let obv = 0;
  const obvValues: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      obv = volumes[i];
    } else if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
    obvValues.push(obv);
  }

  // Check if OBV is increasing with price
  const recentOBV = obvValues.slice(-5);
  const earlierOBV = obvValues.slice(-10, -5);

  const recentAvg = recentOBV.reduce((a, b) => a + b, 0) / recentOBV.length;
  const earlierAvg =
    earlierOBV.length > 0
      ? earlierOBV.reduce((a, b) => a + b, 0) / earlierOBV.length
      : recentAvg;

  const recentPrice =
    closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const earlierPrice =
    closes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;

  // Positive: OBV and price both increasing
  if (recentOBV[recentOBV.length - 1] > earlierAvg && recentPrice > earlierPrice) {
    return "positive";
  }

  // Negative: Price increasing but OBV decreasing (divergence)
  if (recentPrice > earlierPrice && recentOBV[recentOBV.length - 1] < earlierAvg) {
    return "negative";
  }

  return "neutral";
}

// Momentum (30 points)
function calculateMomentumScore(row: StockRow): number {
  let score = 0;

  // RS Line/Power Index (max 20 points)
  if (row.powerIndex !== null) {
    if (row.powerIndex > 50) {
      score += 20;
    } else if (row.powerIndex > 0) {
      score += 15;
    } else if (row.powerIndex > -50) {
      score += 5;
    }
  }

  // Breakout status (max 10 points)
  const breakoutStatus = getBreakoutStatus(row);
  if (breakoutStatus === "positive") {
    score += 10;
  } else if (breakoutStatus === "neutral") {
    score += 5;
  }

  return Math.min(score, 30);
}

function getBreakoutStatus(row: StockRow): "positive" | "neutral" | "negative" {
  if (row.points.length < 20) return "neutral";

  const closes = row.points.map((p) => p.close);
  const volumes = row.points.map((p) => p.volume);

  const recent20High = Math.max(...closes.slice(-20));
  const recent60High = Math.max(...closes.slice(-60));
  const latestClose = closes[closes.length - 1];
  const latestVolume = volumes[volumes.length - 1];
  const avgVolume =
    volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;

  // Breakout: price at new recent high with above-average volume
  if (
    latestClose >= recent20High &&
    latestClose > recent60High * 0.95 &&
    latestVolume > avgVolume * 1.2
  ) {
    return "positive";
  }

  // Sideway/range: price between 20-60 day highs
  if (latestClose < recent20High && latestClose > recent60High * 0.8) {
    return "neutral";
  }

  return "neutral";
}

// 52-Week Position (5 points)
function calculatePosition52wScore(row: StockRow): number {
  // Near 52W high while market is weak = extra points
  if (row.isNear52WeekHigh) {
    return 5;
  }

  // Near 52W low = avoid (0 points)
  if (row.isNear52WeekLow) {
    return 0;
  }

  // In middle range = some points
  return 2;
}

// Helper: Calculate EMA
function calculateEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;

  const multiplier = 2 / (period + 1);
  let ema = null;

  // Initialize with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  ema = sum / period;

  // Calculate EMA
  for (let i = period; i < values.length; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

export function rankStocks(scores: TechnicalScore[]): TechnicalScore[] {
  return [...scores].sort((a, b) => b.score - a.score);
}

export function getTopStocks(
  scores: TechnicalScore[],
  limit: number = 20,
): TechnicalScore[] {
  return rankStocks(scores).slice(0, limit);
}

const SMART_MONEY_MIN_SCORE = 75;
const SMART_MONEY_MIN_EVIDENCE = 3;
const SMART_MONEY_MIN_HISTORY = 60;
const SMART_MONEY_BACKTEST_LOOKBACK_DAYS = 120;
const SMART_MONEY_BACKTEST_COOLDOWN_DAYS = 5;
const SMART_MONEY_BACKTEST_WINDOWS = [5, 10, 20] as const;
const SMART_MONEY_WINRATE_MIN_SAMPLE = 24;
const SMART_MONEY_WINRATE_MIN_SAMPLE_EXCHANGE = 12;
const SMART_MONEY_WINRATE_SCORE_CANDIDATES = [75, 78, 80, 82, 85] as const;
const SMART_MONEY_WINRATE_EVIDENCE_CANDIDATES = [3, 4, 5] as const;
const SMART_MONEY_WINRATE_RS_CANDIDATES: Array<number | null> = [null, 0, 1, 2];
const SMART_MONEY_WINRATE_STATE_CANDIDATES: Array<SmartMoneySignal["state"][] | null> = [
  null,
  ["confirmed", "building"],
  ["confirmed"],
];
const SMART_MONEY_WALK_FORWARD_SLICES = 4;
const SMART_MONEY_WALK_FORWARD_MIN_SLICE_SAMPLE = 4;
const SMART_MONEY_REGIME_SCORE_FLOOR: Record<
  NonNullable<BreadthRegimeSignal["regime"]>,
  number
> = {
  broad_rally: 75,
  early_recovery: 75,
  neutral: 76,
  healthy_pullback: 77,
  narrow_rally: 79,
  market_washout: 82,
};
const SMART_MONEY_DEFAULT_FILTER_CONFIG: SmartMoneyFilterConfig = {
  minScore: SMART_MONEY_MIN_SCORE,
  minEvidence: SMART_MONEY_MIN_EVIDENCE,
  minRelativeStrength20d: null,
  allowedStates: null,
};
export const SMART_MONEY_WINRATE_FALLBACK_CONFIG: SmartMoneyFilterConfig = {
  minScore: 80,
  minEvidence: 4,
  minRelativeStrength20d: 0,
  allowedStates: ["confirmed", "building"],
};

export interface SmartMoneySignalContext {
  regime?: BreadthRegimeSignal | null;
  indexRow?: StockRow | null;
  filterConfig?: SmartMoneyFilterConfig | null;
}

function safeAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function percentChange(current: number, previous: number): number | null {
  return previous !== 0 ? ((current - previous) / previous) * 100 : null;
}

function max(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null;
}

function min(values: number[]): number | null {
  return values.length > 0 ? Math.min(...values) : null;
}

function standardDeviation(values: number[]): number | null {
  if (values.length === 0) return null;
  const avg = safeAverage(values);
  if (avg === null) return null;

  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundSignalPrice(price: number): number {
  if (!Number.isFinite(price)) return 0;
  if (price >= 1000) return Math.round(price);
  if (price >= 100) return roundTo(price, 1);
  return roundTo(price, 3);
}

function getIndexChange20d(indexRow: StockRow | null | undefined): number | null {
  if (!indexRow || indexRow.points.length < 21) return null;
  const closes = indexRow.points.map((point) => point.close);
  const latestClose = closes.at(-1);
  const close20Ago = closes.at(-21);
  if (latestClose === undefined || close20Ago === undefined) return null;
  return percentChange(latestClose, close20Ago);
}

function getRegimeScoreFloor(regime: BreadthRegimeSignal["regime"] | null): number {
  if (!regime) return SMART_MONEY_MIN_SCORE;
  return Math.max(SMART_MONEY_REGIME_SCORE_FLOOR[regime], SMART_MONEY_MIN_SCORE);
}

function getRegimeScoreAdjustment(regime: BreadthRegimeSignal["regime"] | null): number {
  if (regime === "broad_rally") return 1;
  if (regime === "early_recovery") return 0.5;
  if (regime === "neutral") return 0;
  if (regime === "healthy_pullback") return -1;
  if (regime === "narrow_rally") return -2;
  if (regime === "market_washout") return -4;
  return 0;
}

function getRegimeRiskAdjustment(regime: BreadthRegimeSignal["regime"] | null): number {
  if (regime === "broad_rally") return 1;
  if (regime === "early_recovery") return 0;
  if (regime === "neutral") return 0;
  if (regime === "healthy_pullback") return -1;
  if (regime === "narrow_rally") return -1;
  if (regime === "market_washout") return -2;
  return 0;
}

function getDateKeyFromPoint(point: StockRow["points"][number]): string {
  return new Date(point.time * 1000).toISOString().slice(0, 10);
}

function buildIndexChange20dMap(indexRow: StockRow | null | undefined): Map<string, number> {
  const map = new Map<string, number>();
  if (!indexRow || indexRow.points.length < 21) return map;

  const points = indexRow.points;
  for (let i = 20; i < points.length; i += 1) {
    const currentClose = points[i]?.close;
    const previousClose = points[i - 20]?.close;
    if (currentClose === undefined || previousClose === undefined) continue;
    const change = percentChange(currentClose, previousClose);
    if (change === null) continue;
    map.set(getDateKeyFromPoint(points[i]), change);
  }
  return map;
}

function calculateObv(points: StockRow["points"]): number[] {
  let obv = 0;
  return points.map((point, index) => {
    if (index === 0) {
      obv = point.volume;
      return obv;
    }

    const previousClose = points[index - 1].close;
    if (point.close > previousClose) {
      obv += point.volume;
    } else if (point.close < previousClose) {
      obv -= point.volume;
    }
    return obv;
  });
}

function getGrade(score: number): SmartMoneySignal["grade"] {
  if (score >= 90) return "A+";
  if (score >= 82) return "A";
  return "B";
}

function getSmartMoneyState(
  score: number,
  evidenceCount: number,
  relativeStrength20d: number | null,
): SmartMoneySignal["state"] {
  if (
    score >= 88 &&
    evidenceCount >= 5 &&
    (relativeStrength20d === null || relativeStrength20d >= 2)
  ) {
    return "confirmed";
  }
  if (
    score >= 80 &&
    evidenceCount >= 4 &&
    (relativeStrength20d === null || relativeStrength20d >= 0)
  ) {
    return "building";
  }
  return "early_watch";
}

export function calculateSmartMoneySignal(
  row: StockRow,
  runtimeContext: {
    regime: BreadthRegimeSignal | null;
    scoreFloor: number;
    indexChange20d: number | null;
    filterConfig?: SmartMoneyFilterConfig | null;
  },
): SmartMoneySignal | null {
  if (
    row.points.length < SMART_MONEY_MIN_HISTORY ||
    row.latestClose === null ||
    row.ma50 === null
  ) {
    return null;
  }

  const closes = row.points.map((point) => point.close);
  const volumes = row.points.map((point) => point.volume);
  const tradeValues = row.points.map((point) => point.close * point.volume);
  const latestClose = row.latestClose;
  const last20Closes = closes.slice(-20);
  const last60Closes = closes.slice(-60);
  const last5Volumes = volumes.slice(-5);
  const last10Volumes = volumes.slice(-10);
  const last20Volumes = volumes.slice(-20);
  const previous10Volumes = volumes.slice(-20, -10);
  const last5TradeValues = tradeValues.slice(-5);
  const last20TradeValues = tradeValues.slice(-20);
  const last60TradeValues = tradeValues.slice(-60);
  const first10Closes = closes.slice(-20, -10);
  const second10Closes = closes.slice(-10);
  const high20 = max(last20Closes);
  const low20 = min(last20Closes);
  const high60 = max(last60Closes);
  const low60 = min(last60Closes);
  const latestVolume = volumes.at(-1) ?? null;
  const volume5Average = safeAverage(last5Volumes);
  const volume10Average = safeAverage(last10Volumes);
  const volume20Average = safeAverage(last20Volumes);
  const previous10VolumeAverage = safeAverage(previous10Volumes);
  const tradeValue5Average = safeAverage(last5TradeValues);
  const tradeValue20Average = safeAverage(last20TradeValues);
  const tradeValue60Average = safeAverage(last60TradeValues);
  const first10CloseAverage = safeAverage(first10Closes);
  const second10CloseAverage = safeAverage(second10Closes);
  const price20Ago = closes.at(-21) ?? null;
  const price10Ago = closes.at(-11) ?? null;
  const price60Ago = closes.at(-61) ?? null;
  const priceChange20d = price20Ago === null ? null : percentChange(latestClose, price20Ago);
  const priceChange10d = price10Ago === null ? null : percentChange(latestClose, price10Ago);
  const priceChange60d = price60Ago === null ? null : percentChange(latestClose, price60Ago);
  const rangeCompression20d =
    high20 !== null && low20 !== null && latestClose > 0
      ? ((high20 - low20) / latestClose) * 100
      : null;
  const rangeCompression60d =
    high60 !== null && low60 !== null && latestClose > 0
      ? ((high60 - low60) / latestClose) * 100
      : null;
  const drawdownFrom60dHigh =
    high60 !== null && high60 > 0 ? ((latestClose - high60) / high60) * 100 : null;
  const volatility20dRaw = standardDeviation(last20Closes);
  const volatility20d =
    volatility20dRaw !== null && latestClose > 0
      ? (volatility20dRaw / latestClose) * 100
      : null;
  const baseDrift20d =
    first10CloseAverage !== null && second10CloseAverage !== null
      ? percentChange(second10CloseAverage, first10CloseAverage)
      : null;
  const volumeRatio5dTo20d =
    volume5Average !== null && volume20Average !== null && volume20Average > 0
      ? volume5Average / volume20Average
      : null;
  const volumeRatio10dTo20d =
    volume10Average !== null && volume20Average !== null && volume20Average > 0
      ? volume10Average / volume20Average
      : null;
  const volumeDryUpRatio =
    volume10Average !== null && previous10VolumeAverage !== null && previous10VolumeAverage > 0
      ? volume10Average / previous10VolumeAverage
      : null;
  const latestVolumeVs20d =
    latestVolume !== null && volume20Average !== null && volume20Average > 0
      ? latestVolume / volume20Average
      : null;
  const tradeValueRatio5dTo20d =
    tradeValue5Average !== null && tradeValue20Average !== null && tradeValue20Average > 0
      ? tradeValue5Average / tradeValue20Average
      : null;
  const tradeValueRatio20dTo60d =
    tradeValue20Average !== null && tradeValue60Average !== null && tradeValue60Average > 0
      ? tradeValue20Average / tradeValue60Average
      : null;
  const relativeStrength20d =
    priceChange20d !== null && runtimeContext.indexChange20d !== null
      ? priceChange20d - runtimeContext.indexChange20d
      : null;

  const obvValues = calculateObv(row.points);
  const obvLatest = obvValues.at(-1) ?? null;
  const obv10Ago = obvValues.at(-11) ?? null;
  const obvChange10d =
    obvLatest !== null && obv10Ago !== null && Math.abs(obv10Ago) > 0
      ? ((obvLatest - obv10Ago) / Math.abs(obv10Ago)) * 100
      : null;

  const latestPoint = row.points.at(-1);
  const latestRange = latestPoint ? Math.max(latestPoint.high - latestPoint.low, 0.000001) : null;
  const latestBody = latestPoint ? Math.abs(latestPoint.close - latestPoint.open) : null;
  const latestCloseLocation =
    latestPoint && latestRange !== null ? (latestPoint.close - latestPoint.low) / latestRange : null;

  const accumulationBase =
    rangeCompression20d !== null &&
    rangeCompression60d !== null &&
    priceChange20d !== null &&
    baseDrift20d !== null &&
    volatility20d !== null &&
    rangeCompression20d <= 14 &&
    rangeCompression60d <= 32 &&
    volatility20d <= 6.5 &&
    Math.abs(baseDrift20d) <= 8 &&
    priceChange20d >= -10 &&
    priceChange20d <= 18;
  const volumeExpansion =
    volumeRatio5dTo20d !== null &&
    volumeRatio10dTo20d !== null &&
    (volumeRatio5dTo20d >= 1.2 || (volumeRatio5dTo20d >= 1.1 && volumeRatio10dTo20d >= 1.05));
  const volumeDryUp = volumeDryUpRatio !== null && volumeDryUpRatio <= 0.9;
  const liquiditySupport =
    tradeValueRatio5dTo20d !== null &&
    tradeValueRatio20dTo60d !== null &&
    tradeValueRatio5dTo20d >= 0.85 &&
    tradeValueRatio20dTo60d >= 0.8;
  const liquidityExpansion =
    tradeValueRatio5dTo20d !== null &&
    tradeValueRatio20dTo60d !== null &&
    (tradeValueRatio5dTo20d >= 1.1 || tradeValueRatio20dTo60d >= 1.05);
  const liquidityWeak =
    tradeValueRatio5dTo20d !== null &&
    tradeValueRatio20dTo60d !== null &&
    (tradeValueRatio5dTo20d < 0.55 || tradeValueRatio20dTo60d < 0.6);
  const obvConfirmation =
    obvChange10d !== null &&
    priceChange10d !== null &&
    obvChange10d > 2 &&
    priceChange10d >= -2;
  const absorption =
    latestPoint !== undefined &&
    latestBody !== null &&
    latestRange !== null &&
    latestCloseLocation !== null &&
    latestVolumeVs20d !== null &&
    latestBody / latestRange <= 0.45 &&
    latestCloseLocation >= 0.6 &&
    latestVolumeVs20d >= 1.35;
  const breakoutSetup =
    high20 !== null &&
    volumeRatio5dTo20d !== null &&
    latestClose >= high20 * 0.97 &&
    volumeRatio5dTo20d >= 1.05;
  const trendSupport =
    row.ma20 !== null &&
    row.ma50 !== null &&
    latestClose >= row.ma20 &&
    latestClose >= row.ma50;
  const midTrendSupport =
    row.ma200 !== null &&
    latestClose >= row.ma50 &&
    latestClose >= row.ma200 * 0.96 &&
    priceChange60d !== null &&
    priceChange60d >= -12;
  const relativeStrengthPositive = relativeStrength20d !== null && relativeStrength20d >= 1.5;
  const relativeStrengthStrong = relativeStrength20d !== null && relativeStrength20d >= 4;
  const relativeStrengthWeak = relativeStrength20d !== null && relativeStrength20d < -2;

  const patterns: SmartMoneyPattern[] = [];
  if (accumulationBase) patterns.push("Accumulation base");
  if (volumeExpansion) patterns.push("Volume expansion");
  if (volumeDryUp) patterns.push("Volume dry-up");
  if (liquiditySupport) patterns.push("Liquidity support");
  if (obvConfirmation) patterns.push("OBV confirmation");
  if (absorption) patterns.push("Absorption");
  if (breakoutSetup) patterns.push("Breakout setup");

  const priceStructure = Math.min(
    25,
    (accumulationBase ? 12 : 0) +
      (rangeCompression20d !== null && rangeCompression20d <= 15 ? 5 : 0) +
      (volatility20d !== null && volatility20d <= 7 ? 4 : 0) +
      (drawdownFrom60dHigh !== null && drawdownFrom60dHigh >= -14 ? 2 : 0) +
      (priceChange20d !== null && priceChange20d >= -6 && priceChange20d <= 10 ? 2 : 0),
  );
  const volumeRaw =
    (volumeExpansion ? 9 : 0) +
    (volumeDryUp ? 4 : 0) +
    (latestVolumeVs20d !== null && latestVolumeVs20d >= 1.2 ? 2 : 0) +
    (volumeRatio10dTo20d !== null && volumeRatio10dTo20d >= 1 ? 1 : 0) +
    (liquiditySupport ? 4 : 0) +
    (liquidityExpansion ? 3 : 0) -
    (liquidityWeak ? 5 : 0);
  const volume = Math.max(0, Math.min(20, volumeRaw));
  const flow = Math.min(
    25,
    (obvConfirmation ? 12 : 0) +
      (absorption ? 7 : 0) +
      ((row.demand ?? 0) >= 0.55 ? 4 : 0) +
      ((row.supply ?? 1) <= 0.45 ? 2 : 0),
  );
  const trend = Math.min(
    20,
    (trendSupport ? 8 : 0) +
      (breakoutSetup ? 5 : 0) +
      (row.ma20 !== null && row.ma50 !== null && row.ma20 >= row.ma50 ? 3 : 0) +
      (row.ma50 !== null && row.ma200 !== null && row.ma50 >= row.ma200 ? 2 : 0) +
      (midTrendSupport ? 1 : 0) +
      (!row.isNear52WeekLow ? 1 : 0),
  );
  const riskBeforeRegime = Math.max(
    0,
    10 -
      (row.isNear52WeekLow ? 4 : 0) -
      (latestClose < row.ma50 ? 2 : 0) -
      (row.ma200 !== null && latestClose < row.ma200 ? 2 : 0) -
      (drawdownFrom60dHigh !== null && drawdownFrom60dHigh < -20 ? 2 : 0) -
      (volatility20d !== null && volatility20d > 10 ? 2 : 0) -
      (liquidityWeak ? 2 : 0) +
      (liquiditySupport ? 1 : 0),
  );
  const risk = Math.max(
    0,
    Math.min(10, riskBeforeRegime + getRegimeRiskAdjustment(runtimeContext.regime?.regime ?? null)),
  );
  const regimeScoreAdjustment = getRegimeScoreAdjustment(runtimeContext.regime?.regime ?? null);
  const relativeStrengthScoreAdjustment = relativeStrengthStrong
    ? 5
    : relativeStrengthPositive
      ? 3
      : relativeStrengthWeak
        ? -4
        : 0;
  const score = Math.round(
    priceStructure +
      volume +
      flow +
      trend +
      risk +
      regimeScoreAdjustment +
      relativeStrengthScoreAdjustment,
  );
  const evidenceCount = [
    accumulationBase,
    volumeExpansion,
    volumeDryUp,
    liquiditySupport,
    obvConfirmation,
    absorption,
    breakoutSetup,
    trendSupport,
    midTrendSupport,
    relativeStrengthPositive,
  ].filter(Boolean).length;
  const hasCoreEvidence = accumulationBase || obvConfirmation || absorption;
  const filterConfig = runtimeContext.filterConfig ?? SMART_MONEY_DEFAULT_FILTER_CONFIG;
  const appliedScoreFloor = Math.max(runtimeContext.scoreFloor, filterConfig.minScore);
  const appliedEvidenceFloor = Math.max(
    SMART_MONEY_MIN_EVIDENCE,
    filterConfig.minEvidence,
  );

  if (
    score < appliedScoreFloor ||
    evidenceCount < appliedEvidenceFloor ||
    !hasCoreEvidence
  ) {
    return null;
  }

  const explanations = [
    accumulationBase
      ? `Tight base: 20D range ${rangeCompression20d?.toFixed(1)}%, 20D price change ${priceChange20d?.toFixed(1)}%.`
      : null,
    volumeExpansion
      ? `Volume expands: 5D volume is ${volumeRatio5dTo20d?.toFixed(2)}x the 20D average.`
      : null,
    volumeDryUp
      ? `Prior volume dry-up: recent 10D volume is ${volumeDryUpRatio?.toFixed(2)}x the previous 10D.`
      : null,
    liquiditySupport
      ? `Liquidity support: 5D/20D trade value ${tradeValueRatio5dTo20d?.toFixed(2)}x and 20D/60D ${tradeValueRatio20dTo60d?.toFixed(2)}x.`
      : null,
    liquidityWeak
      ? `Liquidity caution: turnover is fading (5D/20D ${tradeValueRatio5dTo20d?.toFixed(2)}x, 20D/60D ${tradeValueRatio20dTo60d?.toFixed(2)}x).`
      : null,
    obvConfirmation
      ? `OBV confirms accumulation with a ${obvChange10d?.toFixed(1)}% 10D improvement.`
      : null,
    absorption
      ? "Absorption candle: high activity with a small body and close in the upper half."
      : null,
    breakoutSetup
      ? "Price is sitting near a 20D high with supportive volume."
      : null,
    trendSupport ? "Price holds above MA20 and MA50." : null,
    midTrendSupport ? "Mid-trend holds with MA200 support and controlled 60D drift." : null,
    relativeStrength20d !== null
      ? `Relative strength vs VNINDEX (20D): ${relativeStrength20d >= 0 ? "+" : ""}${relativeStrength20d.toFixed(1)}%.`
      : null,
    runtimeContext.regime
      ? `Breadth regime: ${runtimeContext.regime.label}. Dynamic score floor set to ${appliedScoreFloor}.`
      : null,
    `Component mix: Structure ${priceStructure}/25, Volume ${volume}/20, Flow ${flow}/25, Trend ${trend}/20, Risk ${risk}/10.`,
  ].filter((item): item is string => item !== null);

  const state = getSmartMoneyState(score, evidenceCount, relativeStrength20d);
  if (
    filterConfig.allowedStates !== null &&
    !filterConfig.allowedStates.includes(state)
  ) {
    return null;
  }
  if (filterConfig.minRelativeStrength20d !== null) {
    if (
      relativeStrength20d === null ||
      relativeStrength20d < filterConfig.minRelativeStrength20d
    ) {
      return null;
    }
  }

  const baseRangePoints =
    high20 !== null && low20 !== null && high20 > low20
      ? high20 - low20
      : latestClose * 0.03;
  const normalizedVolatilityPercent =
    volatility20d !== null
      ? Math.min(12, Math.max(2, volatility20d * 1.35))
      : 4.5;
  const volatilityRangePoints = latestClose * (normalizedVolatilityPercent / 100);
  const activeRangePoints = Math.max(baseRangePoints, volatilityRangePoints * 0.75);

  const breakoutTrigger = high20 !== null ? high20 * 1.002 : latestClose * 1.004;
  const pullbackAnchor =
    high20 !== null && low20 !== null
      ? low20 + activeRangePoints * 0.68
      : latestClose * 0.996;
  let entryPriceRaw = breakoutSetup
    ? Math.max(latestClose, breakoutTrigger)
    : Math.max(latestClose * 0.995, pullbackAnchor);
  if (liquidityWeak) {
    entryPriceRaw *= 0.992;
  }

  const structuralStop = low20 !== null ? low20 * 0.992 : entryPriceRaw * 0.94;
  const trendStop = row.ma50 !== null ? row.ma50 * 0.985 : structuralStop;
  const volatilityStop = entryPriceRaw * (1 - normalizedVolatilityPercent / 100);
  let stopLossRaw = Math.min(structuralStop, trendStop, volatilityStop);
  if (!Number.isFinite(stopLossRaw) || stopLossRaw <= 0 || stopLossRaw >= entryPriceRaw) {
    stopLossRaw = entryPriceRaw * 0.94;
  }

  const minRiskPercent = 0.02;
  const maxRiskPercent = liquidityWeak ? 0.13 : 0.11;
  let riskPercent = (entryPriceRaw - stopLossRaw) / entryPriceRaw;
  if (riskPercent < minRiskPercent) {
    stopLossRaw = entryPriceRaw * (1 - minRiskPercent);
    riskPercent = minRiskPercent;
  }
  if (riskPercent > maxRiskPercent) {
    stopLossRaw = entryPriceRaw * (1 - maxRiskPercent);
  }

  const riskPoints = Math.max(entryPriceRaw - stopLossRaw, entryPriceRaw * 0.01);
  const tp1Multiplier = liquidityWeak ? 1.4 : state === "confirmed" ? 2 : 1.8;
  const tp2Multiplier = liquidityWeak ? 2.2 : state === "confirmed" ? 3 : 2.6;
  const takeProfit1Raw = entryPriceRaw + riskPoints * tp1Multiplier;
  const takeProfit2Raw = entryPriceRaw + riskPoints * tp2Multiplier;
  const entryZoneLowRaw = Math.max(0, entryPriceRaw - riskPoints * 0.35);
  const entryZoneHighRaw = entryPriceRaw + riskPoints * 0.2;

  const entryPrice = roundSignalPrice(entryPriceRaw);
  const entryZoneLow = roundSignalPrice(Math.min(entryZoneLowRaw, entryPriceRaw));
  const entryZoneHigh = roundSignalPrice(Math.max(entryZoneHighRaw, entryPriceRaw));
  const stopLoss = roundSignalPrice(stopLossRaw);
  const takeProfit1 = roundSignalPrice(takeProfit1Raw);
  const takeProfit2 = roundSignalPrice(takeProfit2Raw);
  const riskReward1 = riskPoints > 0 ? roundTo((takeProfit1Raw - entryPriceRaw) / riskPoints, 2) : null;
  const riskReward2 = riskPoints > 0 ? roundTo((takeProfit2Raw - entryPriceRaw) / riskPoints, 2) : null;

  return {
    ticker: row.ticker,
    exchange: row.exchange,
    score,
    grade: getGrade(score),
    state,
    evidenceCount,
    appliedScoreFloor,
    componentScores: {
      volume,
      priceStructure,
      flow,
      trend,
      risk,
    },
    patterns,
    explanations,
    metrics: {
      latestClose,
      priceChange20d,
      rangeCompression20d,
      volumeRatio5dTo20d,
      volumeRatio10dTo20d,
      avgTradeValue20d: tradeValue20Average,
      avgTradeValue60d: tradeValue60Average,
      tradeValueRatio5dTo20d,
      tradeValueRatio20dTo60d,
      obvChange10d,
      volatility20d,
      drawdownFrom60dHigh,
      priceChange60d,
      relativeStrength20d,
      indexChange20d: runtimeContext.indexChange20d,
      entryPrice,
      entryZoneLow,
      entryZoneHigh,
      stopLoss,
      takeProfit1,
      takeProfit2,
      riskReward1,
      riskReward2,
    },
  };
}

export function getSmartMoneyAccumulationSignals(
  rows: StockRow[],
  context: SmartMoneySignalContext = {},
): SmartMoneySignal[] {
  const indexChange20d = getIndexChange20d(context.indexRow);
  const scoreFloor = getRegimeScoreFloor(context.regime?.regime ?? null);
  const regime = context.regime ?? null;
  const filterConfig = context.filterConfig ?? null;

  return rows
    .map((row) =>
      calculateSmartMoneySignal(row, {
        regime,
        scoreFloor,
        indexChange20d,
        filterConfig,
      }),
    )
    .filter((signal): signal is SmartMoneySignal => signal !== null)
    .sort((a, b) => b.score - a.score);
}

interface BacktestSample {
  ticker: string;
  exchange: TradableExchange;
  dateKey: string;
  score: number;
  state: SmartMoneySignal["state"];
  evidenceCount: number;
  relativeStrength20d: number | null;
  returns: Record<(typeof SMART_MONEY_BACKTEST_WINDOWS)[number], number | null>;
}

interface WinRateConfigEvaluation {
  config: SmartMoneyFilterConfig;
  sampleSize: number;
  winRate: number | null;
  avgReturn: number | null;
  robustnessScore: number | null;
  walkForward: SmartMoneyBacktestRecommendation["walkForward"];
}

function getWindowStats(
  samples: BacktestSample[],
  horizon: (typeof SMART_MONEY_BACKTEST_WINDOWS)[number],
): SmartMoneyBacktestWindowStats {
  const values = samples
    .map((sample) => sample.returns[horizon])
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const positiveCount = values.filter((value) => value > 0).length;
  const negativeCount = values.filter((value) => value < 0).length;
  const sampleSize = values.length;
  const winRate = sampleSize > 0 ? (positiveCount / sampleSize) * 100 : null;
  const avgReturn = safeAverage(values);
  const medianReturn = median(values);

  return {
    horizon,
    sampleSize,
    positiveCount,
    negativeCount,
    winRate,
    avgReturn,
    medianReturn,
  };
}

function applyBacktestConfig(
  samples: BacktestSample[],
  config: SmartMoneyFilterConfig,
): BacktestSample[] {
  return samples.filter((sample) => {
    if (sample.score < config.minScore) return false;
    if (sample.evidenceCount < config.minEvidence) return false;
    if (
      config.minRelativeStrength20d !== null &&
      (sample.relativeStrength20d === null || sample.relativeStrength20d < config.minRelativeStrength20d)
    ) {
      return false;
    }
    if (config.allowedStates !== null && !config.allowedStates.includes(sample.state)) {
      return false;
    }
    return true;
  });
}

function splitIntoSlices<T>(values: T[], sliceCount: number): T[][] {
  if (values.length === 0 || sliceCount <= 0) return [];
  const normalizedSliceCount = Math.min(sliceCount, values.length);
  const slices: T[][] = [];
  let start = 0;
  for (let index = 0; index < normalizedSliceCount; index += 1) {
    const remainingItems = values.length - start;
    const remainingSlices = normalizedSliceCount - index;
    const size = Math.ceil(remainingItems / remainingSlices);
    slices.push(values.slice(start, start + size));
    start += size;
  }
  return slices;
}

function calculateWalkForwardStats(
  samples: BacktestSample[],
): SmartMoneyBacktestRecommendation["walkForward"] {
  if (samples.length === 0) return null;

  const chronological = [...samples].sort((left, right) =>
    left.dateKey.localeCompare(right.dateKey),
  );
  const slices = splitIntoSlices(chronological, SMART_MONEY_WALK_FORWARD_SLICES);
  const sliceStats = slices
    .map((slice) => {
      const values = slice
        .map((sample) => sample.returns[10])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      if (values.length < SMART_MONEY_WALK_FORWARD_MIN_SLICE_SAMPLE) return null;
      const positive = values.filter((value) => value > 0).length;
      return {
        sampleSize: values.length,
        winRate: (positive / values.length) * 100,
        avgReturn: safeAverage(values),
      };
    })
    .filter(
      (
        item,
      ): item is {
        sampleSize: number;
        winRate: number;
        avgReturn: number | null;
      } => item !== null,
    );

  if (sliceStats.length === 0) {
    return null;
  }

  const winRates = sliceStats.map((item) => item.winRate);
  const avgReturns = sliceStats
    .map((item) => item.avgReturn)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  return {
    sliceCount: slices.length,
    eligibleSlices: sliceStats.length,
    sampleSize: sliceStats.reduce((sum, item) => sum + item.sampleSize, 0),
    winRate10d: safeAverage(winRates),
    avgReturn10d: safeAverage(avgReturns),
    worstSliceWinRate10d: min(winRates),
    dispersion10d: standardDeviation(winRates),
  };
}

function evaluateWinRateConfig(
  samples: BacktestSample[],
  config: SmartMoneyFilterConfig,
): WinRateConfigEvaluation {
  const filtered = applyBacktestConfig(samples, config);
  const tenDayValues = filtered
    .map((sample) => sample.returns[10])
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const positive = tenDayValues.filter((value) => value > 0).length;
  const sampleSize = tenDayValues.length;
  const winRate = sampleSize > 0 ? (positive / sampleSize) * 100 : null;
  const avgReturn = safeAverage(tenDayValues);
  const walkForward = calculateWalkForwardStats(filtered);
  const walkForwardWinRate = walkForward?.winRate10d ?? null;
  const worstSliceWinRate = walkForward?.worstSliceWinRate10d ?? null;
  const dispersion = walkForward?.dispersion10d ?? null;
  const robustnessScore =
    walkForwardWinRate === null || worstSliceWinRate === null || dispersion === null || winRate === null
      ? null
      : walkForwardWinRate * 0.45 + worstSliceWinRate * 0.4 + winRate * 0.2 - dispersion * 0.25;

  return {
    config,
    sampleSize,
    winRate,
    avgReturn,
    robustnessScore,
    walkForward,
  };
}

function getWinRateRecommendation(
  samples: BacktestSample[],
  options: {
    scope: "ALL" | TradableExchange;
    minSample: number;
  },
): SmartMoneyBacktestRecommendation | null {
  const candidates: SmartMoneyFilterConfig[] = [];
  for (const minScore of SMART_MONEY_WINRATE_SCORE_CANDIDATES) {
    for (const minEvidence of SMART_MONEY_WINRATE_EVIDENCE_CANDIDATES) {
      for (const minRelativeStrength20d of SMART_MONEY_WINRATE_RS_CANDIDATES) {
        for (const allowedStates of SMART_MONEY_WINRATE_STATE_CANDIDATES) {
          candidates.push({
            minScore,
            minEvidence,
            minRelativeStrength20d,
            allowedStates,
          });
        }
      }
    }
  }

  const evaluated = candidates
    .map((config) => evaluateWinRateConfig(samples, config))
    .filter((result) => result.sampleSize >= options.minSample && result.winRate !== null);
  const robustCandidates = evaluated.filter(
    (result) =>
      result.walkForward !== null &&
      result.walkForward.eligibleSlices >= 2 &&
      result.robustnessScore !== null,
  );
  const candidatePool = robustCandidates.length > 0 ? robustCandidates : evaluated;

  const best = candidatePool.sort((a, b) => {
    const robustnessGap = (b.robustnessScore ?? -Infinity) - (a.robustnessScore ?? -Infinity);
    if (Math.abs(robustnessGap) > 0.0001) return robustnessGap;
    const winRateGap = (b.winRate ?? -Infinity) - (a.winRate ?? -Infinity);
    if (Math.abs(winRateGap) > 0.0001) {
      return winRateGap;
    }
    if (b.sampleSize !== a.sampleSize) return b.sampleSize - a.sampleSize;
    return (b.avgReturn ?? -Infinity) - (a.avgReturn ?? -Infinity);
  })[0];

  if (!best) return null;
  return {
    mode: "win_rate",
    scope: options.scope,
    config: best.config,
    sampleSize: best.sampleSize,
    winRate10d: best.winRate,
    avgReturn10d: best.avgReturn,
    robustnessScore: best.robustnessScore,
    walkForward: best.walkForward,
  };
}

function getExchangeRecommendations(
  samples: BacktestSample[],
): SmartMoneyBacktestRecommendation[] {
  const exchanges: TradableExchange[] = ["HOSE", "HNX", "UPCOM", "UNKNOWN"];
  return exchanges
    .map((exchange) => {
      const exchangeSamples = samples.filter((sample) => sample.exchange === exchange);
      return getWinRateRecommendation(exchangeSamples, {
        scope: exchange,
        minSample: SMART_MONEY_WINRATE_MIN_SAMPLE_EXCHANGE,
      });
    })
    .filter((item): item is SmartMoneyBacktestRecommendation => item !== null)
    .sort((left, right) => right.sampleSize - left.sampleSize);
}

function createSnapshotRow(row: StockRow, endIndex: number): StockRow | null {
  const points = row.points.slice(0, endIndex + 1);
  const latestPoint = points.at(-1);
  const previousPoint = points.at(-2);
  if (!latestPoint) return null;
  const latestClose = latestPoint.close;
  const changePercent =
    previousPoint && previousPoint.close !== 0
      ? ((latestClose - previousPoint.close) / previousPoint.close) * 100
      : null;

  return enrichStockRow({
    ...row,
    points,
    latestClose,
    changePercent,
    latestVolume: latestPoint.volume,
  });
}

export function getSmartMoneyBacktestSummary(
  rows: StockRow[],
  context: SmartMoneySignalContext = {},
): SmartMoneyBacktestSummary {
  if (rows.length === 0) {
    return {
      lookbackDays: SMART_MONEY_BACKTEST_LOOKBACK_DAYS,
      totalSignals: 0,
      coverageTickers: 0,
      windows: SMART_MONEY_BACKTEST_WINDOWS.map((horizon) => ({
        horizon,
        sampleSize: 0,
        positiveCount: 0,
        negativeCount: 0,
        winRate: null,
        avgReturn: null,
        medianReturn: null,
      })),
      byState: [],
      scoreBuckets: [],
      recommendedWinRate: null,
      recommendationsByExchange: [],
    };
  }

  const indexChange20dMap = buildIndexChange20dMap(context.indexRow);
  const samples: BacktestSample[] = [];
  const uniqueTickers = new Set<string>();
  const maxWindow = Math.max(...SMART_MONEY_BACKTEST_WINDOWS);

  for (const row of rows) {
    const points = row.points;
    if (points.length < SMART_MONEY_MIN_HISTORY + maxWindow + 1) continue;

    const latestSignalIndex = points.length - 1 - maxWindow;
    const earliestSignalIndex = Math.max(
      SMART_MONEY_MIN_HISTORY - 1,
      latestSignalIndex - SMART_MONEY_BACKTEST_LOOKBACK_DAYS + 1,
    );
    let nextEligibleIndex = earliestSignalIndex;

    for (let index = earliestSignalIndex; index <= latestSignalIndex; index += 1) {
      if (index < nextEligibleIndex) continue;
      const snapshotRow = createSnapshotRow(row, index);
      if (!snapshotRow) continue;
      const snapshotLastPoint = snapshotRow.points.at(-1);
      if (!snapshotLastPoint) continue;
      const dateKey = getDateKeyFromPoint(snapshotLastPoint);
      const historicalIndexChange20d = indexChange20dMap.get(dateKey) ?? null;
      const signal = calculateSmartMoneySignal(snapshotRow, {
        regime: null,
        scoreFloor: SMART_MONEY_MIN_SCORE,
        indexChange20d: historicalIndexChange20d,
        filterConfig: SMART_MONEY_DEFAULT_FILTER_CONFIG,
      });
      if (!signal) continue;

      const entryClose = points[index]?.close;
      if (!entryClose || entryClose <= 0) continue;
      const returns = SMART_MONEY_BACKTEST_WINDOWS.reduce(
        (acc, horizon) => {
          const exitClose = points[index + horizon]?.close;
          acc[horizon] = exitClose ? percentChange(exitClose, entryClose) : null;
          return acc;
        },
        {} as Record<(typeof SMART_MONEY_BACKTEST_WINDOWS)[number], number | null>,
      );

      samples.push({
        ticker: row.ticker,
        exchange: row.exchange,
        dateKey,
        score: signal.score,
        state: signal.state,
        evidenceCount: signal.evidenceCount,
        relativeStrength20d: signal.metrics.relativeStrength20d,
        returns,
      });
      uniqueTickers.add(row.ticker);
      nextEligibleIndex = index + SMART_MONEY_BACKTEST_COOLDOWN_DAYS;
    }
  }

  const windows = SMART_MONEY_BACKTEST_WINDOWS.map((horizon) =>
    getWindowStats(samples, horizon),
  );

  const stateOrder: SmartMoneySignal["state"][] = [
    "confirmed",
    "building",
    "early_watch",
  ];
  const byState = stateOrder
    .map((state) => {
      const stateSamples = samples.filter((sample) => sample.state === state);
      const tenDayValues = stateSamples
        .map((sample) => sample.returns[10])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      const tenDayPositive = tenDayValues.filter((value) => value > 0).length;
      return {
        state,
        sampleSize: stateSamples.length,
        avgScore: safeAverage(stateSamples.map((sample) => sample.score)),
        avgReturn10d: safeAverage(tenDayValues),
        winRate10d: tenDayValues.length > 0 ? (tenDayPositive / tenDayValues.length) * 100 : null,
      };
    })
    .filter((item) => item.sampleSize > 0);

  const scoreBuckets = [
    { label: "90+", min: 90, max: Number.POSITIVE_INFINITY },
    { label: "85-89", min: 85, max: 89.999 },
    { label: "80-84", min: 80, max: 84.999 },
    { label: "75-79", min: 75, max: 79.999 },
  ]
    .map((bucket) => {
      const bucketSamples = samples.filter(
        (sample) => sample.score >= bucket.min && sample.score <= bucket.max,
      );
      const tenDayValues = bucketSamples
        .map((sample) => sample.returns[10])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      const positive = tenDayValues.filter((value) => value > 0).length;
      return {
        label: bucket.label,
        sampleSize: bucketSamples.length,
        avgReturn10d: safeAverage(tenDayValues),
        winRate10d: tenDayValues.length > 0 ? (positive / tenDayValues.length) * 100 : null,
      };
    })
    .filter((bucket) => bucket.sampleSize > 0);
  const recommendedWinRate = getWinRateRecommendation(samples, {
    scope: "ALL",
    minSample: SMART_MONEY_WINRATE_MIN_SAMPLE,
  });
  const recommendationsByExchange = getExchangeRecommendations(samples);

  return {
    lookbackDays: SMART_MONEY_BACKTEST_LOOKBACK_DAYS,
    totalSignals: samples.length,
    coverageTickers: uniqueTickers.size,
    windows,
    byState,
    scoreBuckets,
    recommendedWinRate,
    recommendationsByExchange,
  };
}

const ABNORMAL_MIN_HISTORY = 75;
const ABNORMAL_MIN_TRADE_VALUE_20D = 1_000_000_000;
const ABNORMAL_MIN_SEVERITY = 68;
const ABNORMAL_MIN_EVIDENCE = 2;
const ABNORMAL_RELAXED_MIN_SEVERITY = 48;
const ABNORMAL_RELAXED_MIN_EVIDENCE = 1;
const ABNORMAL_BACKTEST_LOOKBACK_DAYS = 140;
const ABNORMAL_BACKTEST_COOLDOWN_DAYS = 3;
const ABNORMAL_BACKTEST_WINDOWS = [1, 3, 5, 10] as const;
const ABNORMAL_BASELINE_WINDOW = 60;
const ABNORMAL_TYPES: AbnormalSignalType[] = [
  "PRICE_SHOCK",
  "VOLUME_SHOCK",
  "TURNOVER_SPIKE",
  "FLOW_ANOMALY",
  "RANGE_BREAK",
];

export interface AbnormalSignalContext {
  indexRow?: StockRow | null;
  minTradeValue20d?: number;
  minSeverity?: number;
  minEvidence?: number;
}

interface AbnormalBacktestSample {
  ticker: string;
  direction: AbnormalSignal["direction"];
  rank: AbnormalAlertRank;
  severity: number;
  types: AbnormalSignalType[];
  returns: Record<(typeof ABNORMAL_BACKTEST_WINDOWS)[number], number | null>;
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.min(maxValue, Math.max(minValue, value));
}

function absolute(value: number | null): number {
  return value === null ? 0 : Math.abs(value);
}

function medianAbsoluteDeviation(values: number[]): number | null {
  if (values.length === 0) return null;
  const med = median(values);
  if (med === null) return null;
  const deviations = values.map((value) => Math.abs(value - med));
  const mad = median(deviations);
  return mad === null || mad === 0 ? null : mad;
}

function robustZScore(
  value: number | null,
  baseline: number[],
): number | null {
  if (value === null) return null;
  const filteredBaseline = baseline.filter(Number.isFinite);
  if (filteredBaseline.length < 12) return null;

  const med = median(filteredBaseline);
  const mad = medianAbsoluteDeviation(filteredBaseline);
  if (med !== null && mad !== null) {
    return 0.6745 * (value - med) / mad;
  }

  const avg = safeAverage(filteredBaseline);
  const sd = standardDeviation(filteredBaseline);
  if (avg === null || sd === null || sd === 0) return null;
  return (value - avg) / sd;
}

function buildReturnSeries(closes: number[], horizon: number): number[] {
  const values: number[] = [];
  for (let index = horizon; index < closes.length; index += 1) {
    const current = closes[index];
    const previous = closes[index - horizon];
    const change = percentChange(current, previous);
    if (change !== null && Number.isFinite(change)) {
      values.push(change);
    }
  }
  return values;
}

function buildRangeSeries(points: StockRow["points"]): number[] {
  return points
    .map((point) =>
      point.close > 0 ? ((point.high - point.low) / point.close) * 100 : null,
    )
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

function buildObvChangeSeries(obvValues: number[], horizon: number): number[] {
  const changes: number[] = [];
  for (let index = horizon; index < obvValues.length; index += 1) {
    const current = obvValues[index];
    const previous = obvValues[index - horizon];
    if (previous === 0) continue;
    const change = ((current - previous) / Math.abs(previous)) * 100;
    if (Number.isFinite(change)) {
      changes.push(change);
    }
  }
  return changes;
}

function getBaseline(values: number[], length: number): number[] {
  if (values.length <= 1) return [];
  return values.slice(-(length + 1), -1);
}

function getAbnormalAlertRank(params: {
  severity: number;
  evidenceCount: number;
  turnoverRatio5dTo20d: number | null;
  typesCount: number;
}): AbnormalAlertRank {
  if (
    params.severity >= 80 &&
    params.evidenceCount >= 2 &&
    (params.turnoverRatio5dTo20d === null || params.turnoverRatio5dTo20d >= 1.05) &&
    params.typesCount >= 2
  ) {
    return "A";
  }
  if (params.severity >= 66 && params.evidenceCount >= 2) {
    return "B";
  }
  return "C";
}

function getAbnormalPriorityScore(params: {
  severity: number;
  evidenceCount: number;
  rank: AbnormalAlertRank;
  turnoverZ: number | null;
  volumeZ: number | null;
}): number {
  const rankBoost = params.rank === "A" ? 9 : params.rank === "B" ? 4 : 0;
  const liquidityBoost = clamp((params.turnoverZ ?? 0) * 1.6 + (params.volumeZ ?? 0) * 1.1, -5, 12);
  return roundTo(
    params.severity + params.evidenceCount * 3.5 + rankBoost + liquidityBoost,
    1,
  );
}

export function calculateAbnormalSignal(
  row: StockRow,
  runtimeContext: {
    indexChange20d: number | null;
    minTradeValue20d: number;
    minSeverity: number;
    minEvidence: number;
    mode?: "strict" | "balanced";
  },
): AbnormalSignal | null {
  if (row.points.length < ABNORMAL_MIN_HISTORY || row.latestClose === null) {
    return null;
  }

  const points = row.points;
  const closes = points.map((point) => point.close);
  const volumes = points.map((point) => point.volume);
  const tradeValues = points.map((point) => point.close * point.volume);
  const latestPoint = points.at(-1);
  const latestClose = row.latestClose;
  const latestVolume = volumes.at(-1) ?? null;
  const latestTradeValue = tradeValues.at(-1) ?? null;
  const previousClose = closes.at(-2) ?? null;
  const close3dAgo = closes.at(-4) ?? null;
  const close20dAgo = closes.at(-21) ?? null;

  const return1d = previousClose === null ? null : percentChange(latestClose, previousClose);
  const return3d = close3dAgo === null ? null : percentChange(latestClose, close3dAgo);
  const priceChange20d = close20dAgo === null ? null : percentChange(latestClose, close20dAgo);
  const relativeStrength20d =
    priceChange20d !== null && runtimeContext.indexChange20d !== null
      ? priceChange20d - runtimeContext.indexChange20d
      : null;
  const rangePercent1d =
    latestPoint && latestPoint.close > 0
      ? ((latestPoint.high - latestPoint.low) / latestPoint.close) * 100
      : null;

  const volume20Average = safeAverage(volumes.slice(-20));
  const tradeValue20Average = safeAverage(tradeValues.slice(-20));
  const tradeValue60Average = safeAverage(tradeValues.slice(-60));
  if (
    tradeValue20Average === null ||
    tradeValue20Average < runtimeContext.minTradeValue20d
  ) {
    return null;
  }

  const volumeRatio1dTo20d =
    latestVolume !== null && volume20Average !== null && volume20Average > 0
      ? latestVolume / volume20Average
      : null;
  const turnoverRatio5dTo20d = (() => {
    const avg5 = safeAverage(tradeValues.slice(-5));
    if (avg5 === null || tradeValue20Average <= 0) return null;
    return avg5 / tradeValue20Average;
  })();
  const turnoverRatio20dTo60d =
    tradeValue20Average !== null &&
    tradeValue60Average !== null &&
    tradeValue60Average > 0
      ? tradeValue20Average / tradeValue60Average
      : null;

  const return1dSeries = buildReturnSeries(closes, 1);
  const return3dSeries = buildReturnSeries(closes, 3);
  const rangeSeries = buildRangeSeries(points);
  const volumeSeries = volumes.filter(Number.isFinite);
  const turnoverSeries = tradeValues.filter(Number.isFinite);

  const return1dZ = robustZScore(
    return1d,
    getBaseline(return1dSeries, ABNORMAL_BASELINE_WINDOW),
  );
  const return3dZ = robustZScore(
    return3d,
    getBaseline(return3dSeries, ABNORMAL_BASELINE_WINDOW),
  );
  const rangeZ = robustZScore(
    rangePercent1d,
    getBaseline(rangeSeries, ABNORMAL_BASELINE_WINDOW),
  );
  const volumeZ = robustZScore(
    latestVolume,
    getBaseline(volumeSeries, ABNORMAL_BASELINE_WINDOW),
  );
  const turnoverZ = robustZScore(
    latestTradeValue,
    getBaseline(turnoverSeries, ABNORMAL_BASELINE_WINDOW),
  );

  const obvValues = calculateObv(points);
  const obvChangeSeries = buildObvChangeSeries(obvValues, 5);
  const obvLatest = obvValues.at(-1) ?? null;
  const obv5Ago = obvValues.at(-6) ?? null;
  const obvChange5d =
    obvLatest !== null && obv5Ago !== null && obv5Ago !== 0
      ? ((obvLatest - obv5Ago) / Math.abs(obv5Ago)) * 100
      : null;
  const obvZ = robustZScore(
    obvChange5d,
    getBaseline(obvChangeSeries, ABNORMAL_BASELINE_WINDOW),
  );

  const prev20Closes = closes.slice(-21, -1);
  const prev20High = max(prev20Closes);
  const prev20Low = min(prev20Closes);
  const breakUp = prev20High !== null && latestClose > prev20High * 1.01;
  const breakDown = prev20Low !== null && latestClose < prev20Low * 0.99;
  const mode = runtimeContext.mode ?? "strict";
  const isBalanced = mode === "balanced";

  const priceShock =
    absolute(return1dZ) >= (isBalanced ? 1.7 : 1.9) ||
    absolute(return3dZ) >= (isBalanced ? 1.6 : 1.8);
  const volumeShock =
    (volumeZ !== null && volumeZ >= (isBalanced ? 1.9 : 2.1)) ||
    (volumeRatio1dTo20d !== null && volumeRatio1dTo20d >= (isBalanced ? 1.65 : 1.9));
  const turnoverSpike =
    (turnoverZ !== null && turnoverZ >= (isBalanced ? 1.9 : 2.1)) ||
    (turnoverRatio5dTo20d !== null && turnoverRatio5dTo20d >= (isBalanced ? 1.45 : 1.65));
  const rangeBreak =
    (rangeZ !== null && rangeZ >= (isBalanced ? 1.55 : 1.75)) && (breakUp || breakDown);
  const demandStrong = row.demand !== null && row.demand >= (isBalanced ? 0.61 : 0.64);
  const supplyStrong = row.supply !== null && row.supply >= (isBalanced ? 0.61 : 0.64);
  const flowAnomaly =
    ((obvZ !== null && absolute(obvZ) >= (isBalanced ? 1.65 : 1.85)) && turnoverSpike) ||
    (demandStrong && (return1d ?? 0) > (isBalanced ? 0.05 : 0.2)) ||
    (supplyStrong && (return1d ?? 0) < (isBalanced ? -0.05 : -0.2));

  const types: AbnormalSignalType[] = [];
  if (priceShock) types.push("PRICE_SHOCK");
  if (volumeShock) types.push("VOLUME_SHOCK");
  if (turnoverSpike) types.push("TURNOVER_SPIKE");
  if (flowAnomaly) types.push("FLOW_ANOMALY");
  if (rangeBreak) types.push("RANGE_BREAK");

  const evidenceCount = types.length;
  if (evidenceCount < runtimeContext.minEvidence) {
    return null;
  }

  const priceComponent = Math.min(
    35,
    Math.max(0, (absolute(return1dZ) - 1.1) * 11) +
      Math.max(0, (absolute(return3dZ) - 1) * 8) +
      Math.max(0, ((rangeZ ?? 0) - 1) * 7) +
      (rangeBreak ? 4 : 0),
  );
  const liquidityComponent = Math.min(
    30,
    Math.max(0, ((turnoverZ ?? 0) - 1.2) * 9) +
      Math.max(0, ((volumeZ ?? 0) - 1.1) * 6) +
      (turnoverRatio5dTo20d !== null
        ? Math.max(0, (turnoverRatio5dTo20d - 1) * 8)
        : 0),
  );
  const flowComponent = Math.min(
    20,
    Math.max(0, (absolute(obvZ) - 1.1) * 7) +
      (flowAnomaly ? 6 : 0) +
      (demandStrong || supplyStrong ? 4 : 0),
  );

  let contextComponent = 0;
  if (row.aboveMa20 === true) contextComponent += 3;
  if (row.aboveMa20 === false) contextComponent -= 2;
  if (row.aboveMa50 === true) contextComponent += 4;
  if (row.aboveMa50 === false) contextComponent -= 2;
  if (relativeStrength20d !== null) {
    contextComponent += clamp(relativeStrength20d / 1.8, -4, 6);
  }
  if (row.isNear52WeekLow) contextComponent -= 6;
  if (turnoverRatio20dTo60d !== null && turnoverRatio20dTo60d < 0.75) {
    contextComponent -= 4;
  }

  const direction: AbnormalSignal["direction"] =
    return1d !== null && return1d < -0.15
      ? "DOWN"
      : return1d !== null && return1d > 0.15
        ? "UP"
        : (obvChange5d ?? 0) >= 0
          ? "UP"
          : "DOWN";
  if (direction === "DOWN") {
    contextComponent -= 1;
  }

  const evidenceBoost = evidenceCount >= 3 ? 6 : evidenceCount === 2 ? 3 : 0;
  const turnoverPersistenceBoost =
    turnoverRatio20dTo60d !== null && turnoverRatio20dTo60d >= 0.9 ? 2 : 0;

  const severity = Math.round(
    clamp(
      priceComponent +
        liquidityComponent +
        flowComponent +
        contextComponent +
        evidenceBoost +
        turnoverPersistenceBoost,
      0,
      100,
    ),
  );
  if (severity < runtimeContext.minSeverity) {
    return null;
  }

  const rank = getAbnormalAlertRank({
    severity,
    evidenceCount,
    turnoverRatio5dTo20d,
    typesCount: types.length,
  });
  const priorityScore = getAbnormalPriorityScore({
    severity,
    evidenceCount,
    rank,
    turnoverZ,
    volumeZ,
  });

  const explanations = [
    isBalanced ? "Balanced mode is active to surface more actionable daily candidates." : null,
    priceShock
      ? `Price shock: 1D z-score ${return1dZ?.toFixed(2) ?? "N/A"}, 3D z-score ${return3dZ?.toFixed(2) ?? "N/A"}.`
      : null,
    volumeShock
      ? `Volume shock: 1D/20D volume ${volumeRatio1dTo20d?.toFixed(2) ?? "N/A"}x, z-score ${volumeZ?.toFixed(2) ?? "N/A"}.`
      : null,
    turnoverSpike
      ? `Turnover spike: 5D/20D ${turnoverRatio5dTo20d?.toFixed(2) ?? "N/A"}x, z-score ${turnoverZ?.toFixed(2) ?? "N/A"}.`
      : null,
    flowAnomaly
      ? `Flow anomaly: OBV change 5D ${obvChange5d?.toFixed(1) ?? "N/A"}%, OBV z-score ${obvZ?.toFixed(2) ?? "N/A"}.`
      : null,
    rangeBreak
      ? "Range break: volatility expansion with a 20-session boundary break."
      : null,
    relativeStrength20d !== null
      ? `Relative strength vs VNINDEX (20D): ${relativeStrength20d >= 0 ? "+" : ""}${relativeStrength20d.toFixed(1)}%.`
      : null,
  ].filter((item): item is string => item !== null);

  const date = latestPoint ? getDateKeyFromPoint(latestPoint) : "";

  return {
    ticker: row.ticker,
    exchange: row.exchange,
    date,
    severity,
    rank,
    priorityScore,
    direction,
    evidenceCount,
    types,
    explanations,
    metrics: {
      latestClose,
      return1d,
      return3d,
      rangePercent1d,
      return1dZ,
      return3dZ,
      rangeZ,
      volumeRatio1dTo20d,
      volumeZ,
      avgTradeValue20d: tradeValue20Average,
      avgTradeValue60d: tradeValue60Average,
      turnoverZ,
      turnoverRatio5dTo20d,
      turnoverRatio20dTo60d,
      obvChange5d,
      obvZ,
      relativeStrength20d,
    },
  };
}

export function getAbnormalSignals(
  rows: StockRow[],
  context: AbnormalSignalContext = {},
): AbnormalSignal[] {
  const indexChange20d = getIndexChange20d(context.indexRow);
  const minTradeValue20d = Math.min(
    context.minTradeValue20d ?? ABNORMAL_MIN_TRADE_VALUE_20D,
    ABNORMAL_MIN_TRADE_VALUE_20D,
  );
  const minSeverity = context.minSeverity ?? ABNORMAL_RELAXED_MIN_SEVERITY;
  const minEvidence = context.minEvidence ?? ABNORMAL_RELAXED_MIN_EVIDENCE;
  const baseSignals = rows
    .map((row) =>
      calculateAbnormalSignal(row, {
        indexChange20d,
        minTradeValue20d,
        minSeverity,
        minEvidence,
        mode: "strict",
      }),
    )
    .filter((signal): signal is AbnormalSignal => signal !== null)
    .sort((left, right) => {
      const priorityGap = right.priorityScore - left.priorityScore;
      if (Math.abs(priorityGap) > 0.001) return priorityGap;
      return right.severity - left.severity;
    });
  if (baseSignals.length > 0) {
    return baseSignals;
  }

  const fallbackMinTradeValue = Math.min(minTradeValue20d, 500_000_000);
  const fallbackMinSeverity = Math.max(40, minSeverity - 8);
  const fallbackSignals = rows
    .map((row) =>
      calculateAbnormalSignal(row, {
        indexChange20d,
        minTradeValue20d: fallbackMinTradeValue,
        minSeverity: fallbackMinSeverity,
        minEvidence: 1,
        mode: "balanced",
      }),
    )
    .filter((signal): signal is AbnormalSignal => signal !== null)
    .sort((left, right) => {
      const priorityGap = right.priorityScore - left.priorityScore;
      if (Math.abs(priorityGap) > 0.001) return priorityGap;
      return right.severity - left.severity;
    });
  return fallbackSignals;
}

function getAbnormalWindowStats(
  samples: AbnormalBacktestSample[],
  horizon: (typeof ABNORMAL_BACKTEST_WINDOWS)[number],
): AbnormalBacktestWindowStats {
  const values = samples
    .map((sample) => sample.returns[horizon])
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const positiveCount = values.filter((value) => value > 0).length;
  const negativeCount = values.filter((value) => value < 0).length;
  const sampleSize = values.length;

  return {
    horizon,
    sampleSize,
    positiveCount,
    negativeCount,
    winRate: sampleSize > 0 ? (positiveCount / sampleSize) * 100 : null,
    avgReturn: safeAverage(values),
    medianReturn: median(values),
  };
}

export function getAbnormalBacktestSummary(
  rows: StockRow[],
  context: AbnormalSignalContext = {},
): AbnormalBacktestSummary {
  if (rows.length === 0) {
    return {
      lookbackDays: ABNORMAL_BACKTEST_LOOKBACK_DAYS,
      totalSignals: 0,
      coverageTickers: 0,
      windows: ABNORMAL_BACKTEST_WINDOWS.map((horizon) => ({
        horizon,
        sampleSize: 0,
        positiveCount: 0,
        negativeCount: 0,
        winRate: null,
        avgReturn: null,
        medianReturn: null,
      })),
      byDirection: [],
      byType: [],
      byRank: [],
    };
  }

  const indexChange20dMap = buildIndexChange20dMap(context.indexRow);
  const samples: AbnormalBacktestSample[] = [];
  const uniqueTickers = new Set<string>();
  const maxWindow = Math.max(...ABNORMAL_BACKTEST_WINDOWS);
  const minTradeValue20d = Math.min(
    context.minTradeValue20d ?? ABNORMAL_MIN_TRADE_VALUE_20D,
    ABNORMAL_MIN_TRADE_VALUE_20D,
  );

  for (const row of rows) {
    const points = row.points;
    if (points.length < ABNORMAL_MIN_HISTORY + maxWindow + 1) continue;

    const latestSignalIndex = points.length - 1 - maxWindow;
    const earliestSignalIndex = Math.max(
      ABNORMAL_MIN_HISTORY - 1,
      latestSignalIndex - ABNORMAL_BACKTEST_LOOKBACK_DAYS + 1,
    );
    let nextEligibleIndex = earliestSignalIndex;

    for (let index = earliestSignalIndex; index <= latestSignalIndex; index += 1) {
      if (index < nextEligibleIndex) continue;
      const snapshotRow = createSnapshotRow(row, index);
      if (!snapshotRow) continue;
      const snapshotLastPoint = snapshotRow.points.at(-1);
      if (!snapshotLastPoint) continue;

      const dateKey = getDateKeyFromPoint(snapshotLastPoint);
      const signal = calculateAbnormalSignal(snapshotRow, {
        indexChange20d: indexChange20dMap.get(dateKey) ?? null,
        minTradeValue20d,
        minSeverity: ABNORMAL_MIN_SEVERITY,
        minEvidence: ABNORMAL_MIN_EVIDENCE,
      });
      if (!signal) continue;

      const entryClose = points[index]?.close;
      if (!entryClose || entryClose <= 0) continue;
      const returns = ABNORMAL_BACKTEST_WINDOWS.reduce(
        (acc, horizon) => {
          const exitClose = points[index + horizon]?.close;
          acc[horizon] = exitClose ? percentChange(exitClose, entryClose) : null;
          return acc;
        },
        {} as Record<(typeof ABNORMAL_BACKTEST_WINDOWS)[number], number | null>,
      );

      samples.push({
        ticker: row.ticker,
        direction: signal.direction,
        rank: signal.rank,
        severity: signal.severity,
        types: signal.types,
        returns,
      });
      uniqueTickers.add(row.ticker);
      nextEligibleIndex = index + ABNORMAL_BACKTEST_COOLDOWN_DAYS;
    }
  }

  const windows = ABNORMAL_BACKTEST_WINDOWS.map((horizon) =>
    getAbnormalWindowStats(samples, horizon),
  );

  const directionOrder: AbnormalSignal["direction"][] = ["UP", "DOWN"];
  const byDirection = directionOrder
    .map((direction) => {
      const subset = samples.filter((sample) => sample.direction === direction);
      const values3d = subset
        .map((sample) => sample.returns[3])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      const positive3d = values3d.filter((value) => value > 0).length;
      return {
        direction,
        sampleSize: subset.length,
        avgSeverity: safeAverage(subset.map((sample) => sample.severity)),
        winRate3d: values3d.length > 0 ? (positive3d / values3d.length) * 100 : null,
        avgReturn3d: safeAverage(values3d),
      };
    })
    .filter((item) => item.sampleSize > 0);

  const byType = ABNORMAL_TYPES
    .map((type) => {
      const subset = samples.filter((sample) => sample.types.includes(type));
      const values3d = subset
        .map((sample) => sample.returns[3])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      const positive3d = values3d.filter((value) => value > 0).length;
      return {
        type,
        sampleSize: subset.length,
        winRate3d: values3d.length > 0 ? (positive3d / values3d.length) * 100 : null,
        avgReturn3d: safeAverage(values3d),
      };
    })
    .filter((item) => item.sampleSize > 0)
    .sort((left, right) => right.sampleSize - left.sampleSize);

  const rankOrder: AbnormalAlertRank[] = ["A", "B", "C"];
  const byRank = rankOrder
    .map((rank) => {
      const subset = samples.filter((sample) => sample.rank === rank);
      const values3d = subset
        .map((sample) => sample.returns[3])
        .filter((value): value is number => value !== null && Number.isFinite(value));
      const positive3d = values3d.filter((value) => value > 0).length;
      return {
        rank,
        sampleSize: subset.length,
        winRate3d: values3d.length > 0 ? (positive3d / values3d.length) * 100 : null,
        avgReturn3d: safeAverage(values3d),
      };
    })
    .filter((item) => item.sampleSize > 0);

  return {
    lookbackDays: ABNORMAL_BACKTEST_LOOKBACK_DAYS,
    totalSignals: samples.length,
    coverageTickers: uniqueTickers.size,
    windows,
    byDirection,
    byType,
    byRank,
  };
}
