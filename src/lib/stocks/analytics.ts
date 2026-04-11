import {
  BreadthMetrics,
  DailyAggregateRow,
  MarketOverviewItem,
  MovingAverageMetrics,
  PowerMetrics,
  StockRow,
  VolumeMomentumMetrics,
} from "@/types/stocks";

const EPSILON_52W = 0.005;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calcSma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const window = values.slice(values.length - period);
  return average(window);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function enrichStockRow(row: StockRow): StockRow {
  if (row.points.length === 0) {
    return {
      ...row,
      latestVolume: null,
      ma20: null,
      ma50: null,
      ma200: null,
      aboveMa20: null,
      aboveMa50: null,
      volumeMomentum: null,
      volumeMomentumState: "unknown",
      supply: null,
      demand: null,
      powerIndex: null,
      isNear52WeekHigh: false,
      isNear52WeekLow: false,
      hasEnough52WeekData: false,
    };
  }

  const closes = row.points.map((point) => point.close);
  const volumes = row.points.map((point) => point.volume);
  const latestClose = closes[closes.length - 1] ?? null;
  const latestVolume = volumes[volumes.length - 1] ?? null;

  const ma20 = calcSma(closes, 20);
  const ma50 = calcSma(closes, 50);
  const ma200 = calcSma(closes, 200);
  const aboveMa20 = latestClose !== null && ma20 !== null ? latestClose > ma20 : null;
  const aboveMa50 = latestClose !== null && ma50 !== null ? latestClose > ma50 : null;

  const shortVol = calcSma(volumes, 5);
  const longVol = calcSma(volumes, 20);
  const volumeMomentum =
    shortVol !== null && longVol !== null && longVol > 0 ? (shortVol - longVol) / longVol : null;
  const volumeMomentumState =
    volumeMomentum === null
      ? "unknown"
      : volumeMomentum > 0.1
        ? "expanding"
        : volumeMomentum < -0.1
          ? "contracting"
          : "neutral";

  const latestPoint = row.points[row.points.length - 1];
  const candleRange = Math.max(latestPoint.high - latestPoint.low, 0.000001);
  const demand = clamp((latestPoint.close - latestPoint.low) / candleRange, 0, 1);
  const supply = clamp((latestPoint.high - latestPoint.close) / candleRange, 0, 1);
  // Power index formula: ((demand - supply) * |%change|), normalized into [-100..100]
  const powerRaw = (demand - supply) * (Math.abs(row.changePercent ?? 0) + 1);
  const powerIndex = clamp(powerRaw * 20, -100, 100);

  const closeMax = Math.max(...closes);
  const closeMin = Math.min(...closes);
  const hasEnough52WeekData = row.points.length >= 240;
  // 52W approximation in available range: near-high if within 0.5% of max close.
  const isNear52WeekHigh =
    latestClose !== null && closeMax > 0 ? (closeMax - latestClose) / closeMax <= EPSILON_52W : false;
  // 52W approximation in available range: near-low if within 0.5% of min close.
  const isNear52WeekLow =
    latestClose !== null && latestClose > 0 ? (latestClose - closeMin) / latestClose <= EPSILON_52W : false;

  return {
    ...row,
    latestVolume,
    ma20,
    ma50,
    ma200,
    aboveMa20,
    aboveMa50,
    volumeMomentum,
    volumeMomentumState,
    supply,
    demand,
    powerIndex,
    isNear52WeekHigh,
    isNear52WeekLow,
    hasEnough52WeekData,
  };
}

export function filterByLiquidity(
  rows: StockRow[],
  mode: "ALL" | "MIN_VOLUME" | "RANGE",
  minVolume: number | null,
  maxVolume: number | null,
): StockRow[] {
  if (mode === "ALL") return rows;
  if (mode === "MIN_VOLUME") {
    if (minVolume === null) return rows;
    return rows.filter((row) => (row.latestVolume ?? 0) >= minVolume);
  }
  if (minVolume === null && maxVolume === null) return rows;

  return rows.filter((row) => {
    const volume = row.latestVolume ?? 0;
    if (minVolume !== null && volume < minVolume) return false;
    if (maxVolume !== null && volume > maxVolume) return false;
    return true;
  });
}

export function computeBreadthMetrics(rows: StockRow[]): BreadthMetrics {
  const advancers = rows.filter((row) => (row.changePercent ?? 0) > 0).length;
  const decliners = rows.filter((row) => (row.changePercent ?? 0) < 0).length;
  const flats = rows.filter((row) => (row.changePercent ?? 0) === 0).length;
  const highCount = rows.filter((row) => row.isNear52WeekHigh).length;
  const lowCount = rows.filter((row) => row.isNear52WeekLow).length;
  const complete52wRows = rows.filter((row) => row.hasEnough52WeekData).length;

  return {
    advancers,
    decliners,
    flats,
    advanceDeclineRatio: decliners > 0 ? advancers / decliners : advancers > 0 ? advancers : null,
    highCount,
    lowCount,
    hlRatio: lowCount > 0 ? highCount / lowCount : highCount > 0 ? highCount : null,
    hlIsEstimated: complete52wRows !== rows.length,
  };
}

export function computeVolumeMomentum(rows: StockRow[]): VolumeMomentumMetrics {
  const values = rows
    .map((row) => row.volumeMomentum)
    .filter((value): value is number => value !== null);
  const value = average(values);
  const state =
    value === null ? "unknown" : value > 0.1 ? "expanding" : value < -0.1 ? "contracting" : "neutral";
  return { value, state };
}

export function computeMovingAverageMetrics(rows: StockRow[]): MovingAverageMetrics {
  const ma20Eligible = rows.filter((row) => row.aboveMa20 !== null);
  const ma50Eligible = rows.filter((row) => row.aboveMa50 !== null);
  const ma20Above = ma20Eligible.filter((row) => row.aboveMa20 === true).length;
  const ma50Above = ma50Eligible.filter((row) => row.aboveMa50 === true).length;

  return {
    totalEligibleMa20: ma20Eligible.length,
    totalEligibleMa50: ma50Eligible.length,
    aboveMa20Percent: ma20Eligible.length > 0 ? (ma20Above / ma20Eligible.length) * 100 : null,
    aboveMa50Percent: ma50Eligible.length > 0 ? (ma50Above / ma50Eligible.length) * 100 : null,
  };
}

export function computePowerMetrics(rows: StockRow[]): PowerMetrics {
  const demandValues = rows.map((row) => row.demand).filter((value): value is number => value !== null);
  const supplyValues = rows.map((row) => row.supply).filter((value): value is number => value !== null);
  const powerValues = rows.map((row) => row.powerIndex).filter((value): value is number => value !== null);
  return {
    demandAvg: average(demandValues),
    supplyAvg: average(supplyValues),
    powerIndexAvg: average(powerValues),
  };
}

export function computeMarketOverview(
  rows: StockRow[],
  vnIndexRow: StockRow | null,
): MarketOverviewItem[] {
  const byExchange = (exchange: "HOSE" | "HNX" | "UPCOM") =>
    rows.filter((row) => row.exchange === exchange);

  const buildExchangeItem = (exchange: "HOSE" | "HNX" | "UPCOM"): MarketOverviewItem => {
    const items = byExchange(exchange);
    const liquidity = items.reduce((sum, item) => sum + (item.latestVolume ?? 0), 0);
    const changeValues = items
      .map((item) => item.changePercent)
      .filter((value): value is number => value !== null);
    const avgChangePercent = average(changeValues);
    const up = items.filter((item) => (item.changePercent ?? 0) > 0).length;
    const down = items.filter((item) => (item.changePercent ?? 0) < 0).length;
    const flat = items.length - up - down;
    return {
      label: exchange,
      totalLiquidity: liquidity,
      avgChangePercent,
      up,
      down,
      flat,
    };
  };

  const vnIndexItem: MarketOverviewItem = vnIndexRow
    ? {
        label: "VNINDEX",
        totalLiquidity: vnIndexRow.latestVolume,
        avgChangePercent: vnIndexRow.changePercent,
        up: 0,
        down: 0,
        flat: 0,
      }
    : {
        label: "VNINDEX",
        totalLiquidity: null,
        avgChangePercent: null,
        up: 0,
        down: 0,
        flat: 0,
        note: "N/A",
      };

  return [buildExchangeItem("HOSE"), buildExchangeItem("HNX"), buildExchangeItem("UPCOM"), vnIndexItem];
}

function getMaAtIndex(closes: number[], index: number, period: number): number | null {
  if (index < period - 1) return null;
  const start = index - period + 1;
  const window = closes.slice(start, index + 1);
  return average(window);
}

export function buildDailyAggregateRows(
  rows: StockRow[],
  vnIndexRow: StockRow | null,
): DailyAggregateRow[] {
  const dailyMap = new Map<
    string,
    Omit<DailyAggregateRow, "indexChangeVsCurrent" | "indexChangeVsPrevious"> & { indexClose: number | null }
  >();

  for (const row of rows) {
    const closes = row.points.map((point) => point.close);
    for (let index = 0; index < row.points.length; index += 1) {
      const point = row.points[index];
      const date = new Date(point.time * 1000).toISOString().slice(0, 10);
      const ma10 = getMaAtIndex(closes, index, 10);
      const ma20 = getMaAtIndex(closes, index, 20);
      const ma50 = getMaAtIndex(closes, index, 50);

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          aboveMa10Count: 0,
          aboveMa20Count: 0,
          aboveMa50Count: 0,
          totalLiquidity: 0,
          indexClose: null,
        });
      }
      const day = dailyMap.get(date);
      if (!day) continue;

      if (ma10 !== null && point.close > ma10) day.aboveMa10Count += 1;
      if (ma20 !== null && point.close > ma20) day.aboveMa20Count += 1;
      if (ma50 !== null && point.close > ma50) day.aboveMa50Count += 1;
      day.totalLiquidity += point.volume;
    }
  }

  const indexCloseByDate = new Map<string, number>();
  if (vnIndexRow && vnIndexRow.points.length > 0) {
    for (const point of vnIndexRow.points) {
      const date = new Date(point.time * 1000).toISOString().slice(0, 10);
      indexCloseByDate.set(date, point.close);
    }
  }

  const sorted = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  const currentIndexClose =
    vnIndexRow && vnIndexRow.points.length > 0
      ? vnIndexRow.points[vnIndexRow.points.length - 1].close
      : null;

  const results: DailyAggregateRow[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const day = sorted[index];
    const indexClose = indexCloseByDate.get(day.date) ?? null;
    const prevDate = index > 0 ? sorted[index - 1].date : null;
    const prevIndexClose = prevDate ? indexCloseByDate.get(prevDate) ?? null : null;

    const indexChangeVsCurrent =
      indexClose !== null && currentIndexClose !== null && currentIndexClose !== 0
        ? ((indexClose - currentIndexClose) / currentIndexClose) * 100
        : null;
    const indexChangeVsPrevious =
      indexClose !== null && prevIndexClose !== null && prevIndexClose !== 0
        ? ((indexClose - prevIndexClose) / prevIndexClose) * 100
        : null;

    results.push({
      date: day.date,
      aboveMa10Count: day.aboveMa10Count,
      aboveMa20Count: day.aboveMa20Count,
      aboveMa50Count: day.aboveMa50Count,
      totalLiquidity: day.totalLiquidity,
      indexChangeVsCurrent,
      indexChangeVsPrevious,
    });
  }

  return results.reverse();
}
