import {
  MOSAlert,
  MOSRankingRow,
  MOSSignalType,
  MOSTradePlan,
  StockFundamentals,
  StockRow,
} from "@/types/stocks";

const STRONG_MOS = 0.4;
const WATCH_MOS = 0.25;
const NEUTRAL_MOS = 0.1;
const BANK_TICKERS = new Set([
  "ACB",
  "BID",
  "CTG",
  "EIB",
  "HDB",
  "LPB",
  "MBB",
  "MSB",
  "OCB",
  "SHB",
  "SSB",
  "STB",
  "TCB",
  "TPB",
  "VCB",
  "VIB",
  "VPB",
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  if (value >= 100) return round(value, 1);
  if (value >= 10) return round(value, 2);
  return round(value, 3);
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function weightedAverage(
  parts: Array<{ value: number | null; weight: number }>,
): number | null {
  let weightedTotal = 0;
  let weightTotal = 0;

  for (const part of parts) {
    if (!isPositiveNumber(part.value)) continue;
    weightedTotal += part.value * part.weight;
    weightTotal += part.weight;
  }

  if (weightTotal === 0) return null;
  return weightedTotal / weightTotal;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRecentLow(row: StockRow, windowSize: number) {
  const values = row.points.slice(-windowSize).map((point) => point.low).filter(Number.isFinite);
  return values.length > 0 ? Math.min(...values) : null;
}

function getRecentHigh(row: StockRow, windowSize: number) {
  const values = row.points.slice(-windowSize).map((point) => point.high).filter(Number.isFinite);
  return values.length > 0 ? Math.max(...values) : null;
}

function getAverageRangePercent(row: StockRow, windowSize: number) {
  const ranges = row.points
    .slice(-windowSize)
    .map((point) => {
      if (!isPositiveNumber(point.close)) return null;
      return ((point.high - point.low) / point.close) * 100;
    })
    .filter((value): value is number => value !== null && Number.isFinite(value));
  return average(ranges);
}

function getMOSScore(marginOfSafety: number | null) {
  if (marginOfSafety === null) return 0;
  if (marginOfSafety >= STRONG_MOS) return 100;
  if (marginOfSafety >= WATCH_MOS) return 78;
  if (marginOfSafety >= NEUTRAL_MOS) return 58;
  if (marginOfSafety >= 0) return 42;
  return 15;
}

function getValuationScore(row: StockRow, fundamentals?: StockFundamentals | null) {
  let score = 50;
  const pe = getEffectivePE(row, fundamentals);
  const pb = getEffectivePB(row, fundamentals);

  if (isPositiveNumber(pe)) {
    if (pe <= 8) score += 25;
    else if (pe <= 12) score += 18;
    else if (pe <= 18) score += 8;
    else if (pe > 30) score -= 25;
    else score -= 8;
  }

  if (isPositiveNumber(pb)) {
    if (pb <= 1) score += 18;
    else if (pb <= 1.8) score += 10;
    else if (pb > 3.5) score -= 18;
    else score -= 6;
  }

  return clamp(score, 0, 100);
}

function getEffectivePE(row: StockRow, fundamentals?: StockFundamentals | null) {
  if (isPositiveNumber(fundamentals?.pe)) return fundamentals.pe;
  if (isPositiveNumber(row.pe)) return row.pe;
  if (isPositiveNumber(row.latestClose) && isPositiveNumber(fundamentals?.eps)) {
    return row.latestClose / fundamentals.eps;
  }
  return null;
}

function getEffectivePB(row: StockRow, fundamentals?: StockFundamentals | null) {
  if (isPositiveNumber(fundamentals?.pb)) return fundamentals.pb;
  if (isPositiveNumber(row.pb)) return row.pb;
  if (isPositiveNumber(row.latestClose) && isPositiveNumber(fundamentals?.bvps)) {
    return row.latestClose / fundamentals.bvps;
  }
  return null;
}

function getEffectiveROE(row: StockRow, fundamentals?: StockFundamentals | null) {
  if (isPositiveNumber(fundamentals?.roe)) return fundamentals.roe;
  if (isPositiveNumber(row.roe)) return row.roe;
  return null;
}

function normalizePerShareValue(value: number | null | undefined, price: number | null) {
  if (!isPositiveNumber(value)) return null;
  if (isPositiveNumber(price) && value > price * 20) return value / 1000;
  return value;
}

function choosePerShareEstimate(
  directValue: number | null | undefined,
  impliedValue: number | null,
  price: number | null,
) {
  const normalizedDirect = normalizePerShareValue(directValue, price);
  if (!isPositiveNumber(normalizedDirect)) return impliedValue;
  if (!isPositiveNumber(impliedValue)) return normalizedDirect;

  const diff = Math.abs(normalizedDirect - impliedValue) / impliedValue;
  return diff > 0.2 ? impliedValue : normalizedDirect;
}

function getNormalizedGrowth(fundamentals?: StockFundamentals | null) {
  const growthValues = [
    fundamentals?.revenueGrowth ?? null,
    fundamentals?.netIncomeGrowth ?? null,
  ].filter((value): value is number => value !== null && Number.isFinite(value));

  if (growthValues.length === 0) return 0;
  return clamp(average(growthValues) ?? 0, -15, 15);
}

function getFairMultiples(row: StockRow, fundamentals?: StockFundamentals | null) {
  const roe = getEffectiveROE(row, fundamentals);
  const growth = getNormalizedGrowth(fundamentals);
  const debtToEquity = fundamentals?.debtToEquity ?? null;
  const isBank = BANK_TICKERS.has(row.ticker);
  let fairPe = isBank ? 7.5 : 10;
  let fairPb = isBank ? 1.0 : 1.25;

  if (roe !== null) {
    if (roe >= 25) {
      fairPe += isBank ? 2.5 : 3.5;
      fairPb += isBank ? 0.45 : 0.65;
    } else if (roe >= 18) {
      fairPe += isBank ? 1.5 : 2;
      fairPb += isBank ? 0.25 : 0.4;
    } else if (roe >= 12) {
      fairPe += isBank ? 0.8 : 1;
      fairPb += isBank ? 0.12 : 0.2;
    } else if (roe < 8) {
      fairPe -= isBank ? 1.5 : 2;
      fairPb -= isBank ? 0.15 : 0.25;
    }
  }

  if (growth > 12) fairPe += isBank ? 0.7 : 1.2;
  else if (growth > 5) fairPe += isBank ? 0.4 : 0.7;
  else if (growth < -5) fairPe -= isBank ? 0.8 : 1.2;

  if (debtToEquity !== null && !isBank) {
    if (debtToEquity > 2) {
      fairPe -= 1.2;
      fairPb -= 0.2;
    } else if (debtToEquity < 0.8) {
      fairPe += 0.5;
      fairPb += 0.1;
    }
  }

  return {
    fairPe: round(clamp(fairPe, isBank ? 5.5 : 7, isBank ? 12 : 18), 2),
    fairPb: round(clamp(fairPb, isBank ? 0.75 : 0.8, isBank ? 1.8 : 2.5), 2),
    isBank,
  };
}

function getQualityScore(row: StockRow, fundamentals?: StockFundamentals | null) {
  let score = 45;
  const roe = getEffectiveROE(row, fundamentals);

  if (isPositiveNumber(roe)) {
    if (roe >= 20) score += 30;
    else if (roe >= 15) score += 22;
    else if (roe >= 10) score += 12;
    else if (roe < 5) score -= 18;
  }

  if (row.volumeMomentumState === "expanding") score += 10;
  if (row.volumeMomentumState === "contracting") score -= 8;
  if (row.powerIndex !== null) {
    if (row.powerIndex > 50) score += 10;
    else if (row.powerIndex < -50) score -= 10;
  }
  if (row.isNear52WeekLow) score -= 8;
  if (fundamentals?.revenueGrowth !== null && fundamentals?.revenueGrowth !== undefined) {
    if (fundamentals.revenueGrowth > 15) score += 10;
    else if (fundamentals.revenueGrowth > 5) score += 5;
    else if (fundamentals.revenueGrowth < -10) score -= 12;
  }
  if (fundamentals?.netIncomeGrowth !== null && fundamentals?.netIncomeGrowth !== undefined) {
    if (fundamentals.netIncomeGrowth > 15) score += 12;
    else if (fundamentals.netIncomeGrowth > 5) score += 6;
    else if (fundamentals.netIncomeGrowth < -10) score -= 16;
  }
  if (fundamentals?.debtToEquity !== null && fundamentals?.debtToEquity !== undefined) {
    if (fundamentals.debtToEquity < 0.8) score += 8;
    else if (fundamentals.debtToEquity > 2.5) score -= 14;
  }
  if (fundamentals?.freeCashFlow !== null && fundamentals?.freeCashFlow !== undefined) {
    if (fundamentals.freeCashFlow > 0) score += 8;
    else score -= 10;
  }

  return clamp(score, 0, 100);
}

function getConfidenceScore(row: StockRow, fundamentals?: StockFundamentals | null) {
  let score = 25;
  const pe = getEffectivePE(row, fundamentals);
  const pb = getEffectivePB(row, fundamentals);
  const roe = getEffectiveROE(row, fundamentals);
  if (isPositiveNumber(row.latestClose)) score += 20;
  if (isPositiveNumber(pe)) score += 18;
  if (isPositiveNumber(pb)) score += 18;
  if (isPositiveNumber(roe)) score += 14;
  if (row.points.length >= 120) score += 5;
  if (fundamentals) {
    if (isPositiveNumber(fundamentals.eps)) score += 8;
    if (isPositiveNumber(fundamentals.bvps)) score += 8;
    if (isPositiveNumber(fundamentals.equity)) score += 4;
    if (isPositiveNumber(fundamentals.totalDebt)) score += 4;
  }
  return clamp(score, 0, 100);
}

function buildIntrinsicValue(row: StockRow, fundamentals?: StockFundamentals | null) {
  const price = row.latestClose;
  const pe = getEffectivePE(row, fundamentals);
  const pb = getEffectivePB(row, fundamentals);
  const roe = getEffectiveROE(row, fundamentals);
  const { fairPe, fairPb, isBank } = getFairMultiples(row, fundamentals);
  const impliedEps = isPositiveNumber(price) && isPositiveNumber(pe) ? price / pe : null;
  const impliedBookValuePerShare =
    isPositiveNumber(price) && isPositiveNumber(pb) ? price / pb : null;
  const epsEstimate = choosePerShareEstimate(fundamentals?.eps, impliedEps, price);
  const bookValuePerShareEstimate = choosePerShareEstimate(
    fundamentals?.bvps,
    impliedBookValuePerShare,
    price,
  );
  const peFairValue = isPositiveNumber(epsEstimate)
    ? epsEstimate * fairPe
    : null;
  const pbFairValue = isPositiveNumber(bookValuePerShareEstimate)
    ? bookValuePerShareEstimate * fairPb
    : null;
  const grahamValue =
    isPositiveNumber(epsEstimate) && isPositiveNumber(bookValuePerShareEstimate)
      ? Math.sqrt(22.5 * epsEstimate * bookValuePerShareEstimate)
      : null;
  const intrinsicValue = isBank
    ? weightedAverage([
        { value: pbFairValue, weight: 0.6 },
        { value: peFairValue, weight: 0.25 },
        { value: grahamValue, weight: 0.15 },
      ])
    : weightedAverage([
        { value: peFairValue, weight: 0.5 },
        { value: pbFairValue, weight: 0.25 },
        { value: grahamValue, weight: 0.25 },
      ]);

  const dataPoints: string[] = [];
  const missingData: string[] = [];
  if (isPositiveNumber(price)) dataPoints.push("price");
  else missingData.push("price");
  if (isPositiveNumber(pe)) dataPoints.push("PE");
  else missingData.push("PE");
  if (isPositiveNumber(pb)) dataPoints.push("PB");
  else missingData.push("PB");
  if (isPositiveNumber(roe)) dataPoints.push("ROE");
  else missingData.push("ROE");
  if (isPositiveNumber(fundamentals?.eps)) dataPoints.push("EPS");
  else missingData.push("EPS");
  if (isPositiveNumber(fundamentals?.bvps)) dataPoints.push("BVPS");
  else missingData.push("BVPS");
  if (fundamentals?.revenueGrowth !== null && fundamentals?.revenueGrowth !== undefined) {
    dataPoints.push("revenue growth");
  } else {
    missingData.push("revenue growth");
  }
  if (isPositiveNumber(fundamentals?.totalDebt)) dataPoints.push("debt");
  else missingData.push("debt");

  return {
    intrinsicValue: intrinsicValue === null ? null : round(intrinsicValue, 3),
    peFairValue: peFairValue === null ? null : round(peFairValue, 3),
    pbFairValue: pbFairValue === null ? null : round(pbFairValue, 3),
    grahamValue: grahamValue === null ? null : round(grahamValue, 3),
    fairPe,
    fairPb,
    epsEstimate: epsEstimate === null ? null : round(epsEstimate, 3),
    bookValuePerShareEstimate:
      bookValuePerShareEstimate === null ? null : round(bookValuePerShareEstimate, 3),
    confidence: getConfidenceScore(row, fundamentals),
    dataPoints,
    missingData,
    source: fundamentals ? ("fundamentals" as const) : ("market-ratios" as const),
  };
}

function buildReasons(
  marginOfSafety: number | null,
  qualityScore: number,
  confidenceScore: number,
) {
  const reasons: string[] = [];

  if (marginOfSafety === null) {
    reasons.push("Missing enough valuation data to estimate MOS.");
  } else if (marginOfSafety >= STRONG_MOS) {
    reasons.push("Price is deeply below the estimated intrinsic value.");
  } else if (marginOfSafety >= WATCH_MOS) {
    reasons.push("Price is below the estimated intrinsic value with a useful buffer.");
  } else if (marginOfSafety < 0) {
    reasons.push("Price is above the estimated intrinsic value.");
  } else {
    reasons.push("MOS is present but not wide enough for a high-conviction zone.");
  }

  if (qualityScore >= 70) reasons.push("Quality score supports the valuation signal.");
  if (qualityScore < 45) reasons.push("Low quality score raises value-trap risk.");
  if (confidenceScore < 60) reasons.push("Confidence is limited because key data is missing.");

  return reasons;
}

function buildAlerts(
  signal: MOSSignalType,
  marginOfSafety: number | null,
  qualityScore: number,
  confidenceScore: number,
) {
  const alerts: MOSAlert[] = [];

  if (marginOfSafety !== null && marginOfSafety >= STRONG_MOS) {
    alerts.push({
      code: "MOS_STRONG_ZONE",
      severity: "strong",
      message: "MOS is in the strong candidate zone.",
    });
  } else if (marginOfSafety !== null && marginOfSafety >= WATCH_MOS) {
    alerts.push({
      code: "MOS_BUY_ZONE",
      severity: "watch",
      message: "MOS is in the watchlist zone.",
    });
  } else if (marginOfSafety !== null && marginOfSafety < 0) {
    alerts.push({
      code: "MOS_OVERVALUED",
      severity: "danger",
      message: "Current price is above estimated intrinsic value.",
    });
  }

  if (qualityScore < 45 && marginOfSafety !== null && marginOfSafety >= WATCH_MOS) {
    alerts.push({
      code: "VALUE_TRAP_RISK",
      severity: "risk",
      message: "High MOS is offset by weak quality metrics.",
    });
  }

  if (confidenceScore < 60) {
    alerts.push({
      code: "LOW_CONFIDENCE",
      severity: "info",
      message: "Signal confidence is limited by missing data.",
    });
  }

  if (signal === "STRONG_CANDIDATE" || signal === "WATCHLIST") {
    alerts.push({
      code: "QUALITY_SUPPORT",
      severity: "info",
      message: "Review the business thesis before acting on this quantitative alert.",
    });
  }

  return alerts;
}

function getSignal(
  marginOfSafety: number | null,
  qualityScore: number,
  confidenceScore: number,
): MOSSignalType {
  if (marginOfSafety === null || confidenceScore < 45) return "AVOID";
  if (qualityScore < 45 && marginOfSafety >= WATCH_MOS) return "AVOID";
  if (marginOfSafety >= STRONG_MOS && qualityScore >= 60 && confidenceScore >= 60) {
    return "STRONG_CANDIDATE";
  }
  if (marginOfSafety >= WATCH_MOS && confidenceScore >= 55) return "WATCHLIST";
  if (marginOfSafety < 0) return "OVERVALUED";
  return "NEUTRAL";
}

function buildTradePlan(
  row: StockRow,
  signal: MOSSignalType,
  marginOfSafety: number | null,
  intrinsicValue: number | null,
): MOSTradePlan {
  const price = row.latestClose;
  const upsideToFairValue =
    isPositiveNumber(price) && isPositiveNumber(intrinsicValue)
      ? (intrinsicValue - price) / price
      : null;

  if (!isPositiveNumber(price) || !isPositiveNumber(intrinsicValue)) {
    return {
      action: "AVOID",
      entryPrice: null,
      entryZoneLow: null,
      entryZoneHigh: null,
      stopLoss: null,
      takeProfit1: null,
      takeProfit2: null,
      riskReward1: null,
      riskReward2: null,
      riskPercent: null,
      upsideToFairValue,
      planNote: "No trade plan because price or fair value is missing.",
    };
  }

  if (signal === "AVOID" || signal === "OVERVALUED" || marginOfSafety === null || marginOfSafety < NEUTRAL_MOS) {
    return {
      action: signal === "OVERVALUED" ? "WAIT" : "AVOID",
      entryPrice: null,
      entryZoneLow: null,
      entryZoneHigh: null,
      stopLoss: null,
      takeProfit1: null,
      takeProfit2: null,
      riskReward1: null,
      riskReward2: null,
      riskPercent: null,
      upsideToFairValue,
      planNote: "Wait for a wider MOS or a better technical base before planning entry.",
    };
  }

  const low20 = getRecentLow(row, 20);
  const high20 = getRecentHigh(row, 20);
  const rangePercent = getAverageRangePercent(row, 20) ?? 4;
  const normalizedRiskPercent = clamp(rangePercent * 1.6, 5, 12) / 100;
  const hasTrendSupport =
    (row.ma20 === null || price >= row.ma20 * 0.98) &&
    (row.ma50 === null || price >= row.ma50 * 0.97);
  const action: MOSTradePlan["action"] =
    signal === "STRONG_CANDIDATE" && hasTrendSupport ? "ACCUMULATE" : "WATCH";
  const technicalAnchor = row.ma20 ?? row.ma50 ?? low20 ?? price;
  const pullbackEntry = Math.min(price, technicalAnchor * 1.015);
  const breakoutEntry = high20 !== null && price > high20 * 0.985 ? high20 * 1.002 : price;
  const entryRaw = hasTrendSupport ? Math.min(price * 1.005, breakoutEntry) : pullbackEntry;
  const structuralStop = low20 !== null ? low20 * 0.985 : entryRaw * (1 - normalizedRiskPercent);
  const trendStop = row.ma50 !== null ? row.ma50 * 0.975 : structuralStop;
  let stopRaw = Math.min(structuralStop, trendStop, entryRaw * (1 - normalizedRiskPercent));

  if (!Number.isFinite(stopRaw) || stopRaw <= 0 || stopRaw >= entryRaw) {
    stopRaw = entryRaw * (1 - normalizedRiskPercent);
  }

  const minStop = entryRaw * 0.86;
  const maxStop = entryRaw * 0.98;
  stopRaw = clamp(stopRaw, minStop, maxStop);
  const riskPoints = Math.max(entryRaw - stopRaw, entryRaw * 0.02);
  const tp1Raw = Math.min(intrinsicValue * 0.9, entryRaw + riskPoints * 1.8);
  const tp2Raw = Math.min(intrinsicValue * 0.98, entryRaw + riskPoints * 2.8);
  const safeTp1Raw = tp1Raw > entryRaw ? tp1Raw : entryRaw + riskPoints * 1.3;
  const safeTp2Raw = tp2Raw > safeTp1Raw ? tp2Raw : entryRaw + riskPoints * 2;
  const entryZoneLowRaw = Math.max(0, entryRaw - riskPoints * 0.35);
  const entryZoneHighRaw = entryRaw + riskPoints * 0.15;
  const riskReward1 = (safeTp1Raw - entryRaw) / riskPoints;
  const riskReward2 = (safeTp2Raw - entryRaw) / riskPoints;

  return {
    action,
    entryPrice: roundPrice(entryRaw),
    entryZoneLow: roundPrice(Math.min(entryZoneLowRaw, entryRaw)),
    entryZoneHigh: roundPrice(Math.max(entryZoneHighRaw, entryRaw)),
    stopLoss: roundPrice(stopRaw),
    takeProfit1: roundPrice(safeTp1Raw),
    takeProfit2: roundPrice(safeTp2Raw),
    riskReward1: round(riskReward1, 2),
    riskReward2: round(riskReward2, 2),
    riskPercent: round((riskPoints / entryRaw) * 100, 2),
    upsideToFairValue: upsideToFairValue === null ? null : round(upsideToFairValue, 4),
    planNote:
      action === "ACCUMULATE"
        ? "Valuation and trend support allow staged entry inside the zone."
        : "Keep on watchlist and prefer entry near support or after trend confirmation.",
  };
}

export function calculateMOSRanking(
  row: StockRow,
  fundamentals?: StockFundamentals | null,
): MOSRankingRow {
  const price = row.latestClose;
  const breakdown = buildIntrinsicValue(row, fundamentals);
  const marginOfSafety =
    isPositiveNumber(price) && isPositiveNumber(breakdown.intrinsicValue)
      ? (breakdown.intrinsicValue - price) / breakdown.intrinsicValue
      : null;
  const qualityScore = getQualityScore(row, fundamentals);
  const valuationScore = getValuationScore(row, fundamentals);
  const mosScore = getMOSScore(marginOfSafety);
  const confidenceScore = breakdown.confidence;
  const signal = getSignal(marginOfSafety, qualityScore, confidenceScore);
  const tradePlan = buildTradePlan(row, signal, marginOfSafety, breakdown.intrinsicValue);
  const finalScore = clamp(
    mosScore * 0.35 +
      qualityScore * 0.25 +
      valuationScore * 0.2 +
      confidenceScore * 0.2,
    0,
    100,
  );

  return {
    ticker: row.ticker,
    exchange: row.exchange,
    price,
    intrinsicValue: breakdown.intrinsicValue,
    marginOfSafety: marginOfSafety === null ? null : round(marginOfSafety, 4),
    qualityScore: Math.round(qualityScore),
    valuationScore: Math.round(valuationScore),
    confidenceScore: Math.round(confidenceScore),
    finalScore: Math.round(finalScore),
    signal,
    alerts: buildAlerts(signal, marginOfSafety, qualityScore, confidenceScore),
    reasons: buildReasons(marginOfSafety, qualityScore, confidenceScore),
    tradePlan,
    breakdown,
    metrics: {
      pe: getEffectivePE(row, fundamentals),
      pb: getEffectivePB(row, fundamentals),
      roe: getEffectiveROE(row, fundamentals),
      revenueGrowth: fundamentals?.revenueGrowth ?? null,
      netIncomeGrowth: fundamentals?.netIncomeGrowth ?? null,
      debtToEquity: fundamentals?.debtToEquity ?? null,
      debtToAssets: fundamentals?.debtToAssets ?? null,
      operatingCashFlow: fundamentals?.operatingCashFlow ?? null,
      freeCashFlow: fundamentals?.freeCashFlow ?? null,
      volumeMomentum: row.volumeMomentum,
      powerIndex: row.powerIndex,
    },
  };
}

export function getMOSRankingRows(
  rows: StockRow[],
  fundamentalsByTicker: Map<string, StockFundamentals> = new Map(),
): MOSRankingRow[] {
  return rows
    .map((row) => calculateMOSRanking(row, fundamentalsByTicker.get(row.ticker)))
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (b.marginOfSafety ?? -Infinity) - (a.marginOfSafety ?? -Infinity);
    });
}
