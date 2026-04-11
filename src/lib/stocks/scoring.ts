import { StockRow } from "@/types/stocks";

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
