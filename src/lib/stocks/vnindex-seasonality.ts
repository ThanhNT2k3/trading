import type { HistoryBar } from "@/types/stocks";
import { fetchTickerHistory } from "@/lib/stocks/api";

const VIETSTOCK_URL =
  "https://finance.vietstock.vn/Data/GeneralMarket_GetEODMarketIndexVnForChart";
const SIMPLIZE_URL =
  "https://api2.simplize.vn/api/historical/quote/prices/VNINDEX";
const SIMPLIZE_PAGE_SIZE = 1000;
const DEFAULT_VIETSTOCK_TOKEN =
  "U1sNBwp7AkL5gTKY13PbSw20K99LZ7QbcKbiwGmBExItjCFBl0QLGWBmN5HGU5k6dQHo2YlnjgFYQrjcrGTc39TWTb5Y2nL2-x7iVhekMAo1";
const REQUEST_TIMEOUT_MS = 12000;

export interface VnIndexClosePoint {
  date: string;
  close: number;
}

export interface VnIndexMonthlyReturn {
  year: number;
  month: number;
  monthLabel: string;
  startClose: number;
  endClose: number;
  returnPct: number;
}

export interface VnIndexMonthStats {
  month: number;
  monthLabel: string;
  sampleSize: number;
  winCount: number;
  lossCount: number;
  flatCount: number;
  winRate: number | null;
  avgReturnPct: number | null;
  medianReturnPct: number | null;
  bestReturnPct: number | null;
  bestYear: number | null;
  worstReturnPct: number | null;
  worstYear: number | null;
}

export interface VnIndexSeasonalityResult {
  source: "simplize" | "vietstock" | "vps-fallback";
  index: "VNINDEX";
  startDate: string | null;
  endDate: string | null;
  monthlyReturns: VnIndexMonthlyReturn[];
  monthlyStats: VnIndexMonthStats[];
  metadata: {
    rawPointCount: number;
    monthlyReturnCount: number;
    generatedAt: string;
    warning: string | null;
  };
}

function monthLabel(month: number) {
  return `T${month.toString().padStart(2, "0")}`;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDateValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  if (typeof value !== "string" || value.trim().length === 0) return null;
  const trimmed = value.trim();
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    return `${slashMatch[3]}-${month}-${day}`;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function valueFromKeys(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

function parsePoint(item: unknown): VnIndexClosePoint | null {
  if (Array.isArray(item)) {
    const date = parseDateValue(item[0]);
    const close = parseNumber(item[1]) ?? parseNumber(item[4]);
    return date && close !== null ? { date, close } : null;
  }

  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const date = parseDateValue(
    valueFromKeys(record, ["date", "Date", "tradingDate", "TradingDate", "time", "Time", "t", "x"]),
  );
  const close = parseNumber(
    valueFromKeys(record, [
      "close",
      "Close",
      "c",
      "value",
      "Value",
      "indexValue",
      "IndexValue",
      "marketIndex",
      "MarketIndex",
      "y",
    ]),
  );

  return date && close !== null ? { date, close } : null;
}

function collectArrays(payload: unknown, arrays: unknown[][] = []): unknown[][] {
  if (Array.isArray(payload)) {
    arrays.push(payload);
    for (const item of payload) collectArrays(item, arrays);
    return arrays;
  }

  if (payload && typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      collectArrays(value, arrays);
    }
  }

  return arrays;
}

export function parseVietstockIndexPayload(payload: unknown): VnIndexClosePoint[] {
  const arrays = collectArrays(payload);
  let best: VnIndexClosePoint[] = [];

  for (const array of arrays) {
    const points = array
      .map(parsePoint)
      .filter((point): point is VnIndexClosePoint => point !== null);
    if (points.length > best.length) best = points;
  }

  return normalizePoints(best);
}

export function parseSimplizeIndexPayload(payload: unknown): VnIndexClosePoint[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as Record<string, unknown>).data;
  if (!Array.isArray(data)) return [];

  return normalizePoints(
    data
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const date = parseDateValue(record.date);
        const close = parseNumber(record.priceClose);
        return date && close !== null ? { date, close } : null;
      })
      .filter((point): point is VnIndexClosePoint => point !== null),
  );
}

function normalizePoints(points: VnIndexClosePoint[]) {
  const byDate = new Map<string, VnIndexClosePoint>();
  for (const point of points) {
    if (!Number.isFinite(point.close) || point.close <= 0) continue;
    byDate.set(point.date, point);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function computeVnIndexSeasonality(
  points: VnIndexClosePoint[],
  source: VnIndexSeasonalityResult["source"],
  warning: string | null,
): VnIndexSeasonalityResult {
  const normalized = normalizePoints(points);
  const monthEnd = new Map<string, VnIndexClosePoint>();

  for (const point of normalized) {
    const key = point.date.slice(0, 7);
    monthEnd.set(key, point);
  }

  const monthEnds = Array.from(monthEnd.entries())
    .map(([key, point]) => ({ key, point }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const monthlyReturns: VnIndexMonthlyReturn[] = [];
  for (let index = 1; index < monthEnds.length; index += 1) {
    const previous = monthEnds[index - 1].point;
    const current = monthEnds[index].point;
    const year = Number(current.date.slice(0, 4));
    const month = Number(current.date.slice(5, 7));
    monthlyReturns.push({
      year,
      month,
      monthLabel: monthLabel(month),
      startClose: previous.close,
      endClose: current.close,
      returnPct: ((current.close / previous.close) - 1) * 100,
    });
  }

  const monthlyStats: VnIndexMonthStats[] = Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const rows = monthlyReturns.filter((row) => row.month === month);
    const sortedReturns = rows.map((row) => row.returnPct).sort((a, b) => a - b);
    const winCount = rows.filter((row) => row.returnPct > 0).length;
    const lossCount = rows.filter((row) => row.returnPct < 0).length;
    const flatCount = rows.length - winCount - lossCount;
    const best = rows.reduce<VnIndexMonthlyReturn | null>(
      (acc, row) => (!acc || row.returnPct > acc.returnPct ? row : acc),
      null,
    );
    const worst = rows.reduce<VnIndexMonthlyReturn | null>(
      (acc, row) => (!acc || row.returnPct < acc.returnPct ? row : acc),
      null,
    );
    const median =
      sortedReturns.length === 0
        ? null
        : sortedReturns.length % 2 === 1
          ? sortedReturns[Math.floor(sortedReturns.length / 2)]
          : (sortedReturns[sortedReturns.length / 2 - 1] + sortedReturns[sortedReturns.length / 2]) / 2;
    const avg =
      rows.length === 0
        ? null
        : rows.reduce((sum, row) => sum + row.returnPct, 0) / rows.length;

    return {
      month,
      monthLabel: monthLabel(month),
      sampleSize: rows.length,
      winCount,
      lossCount,
      flatCount,
      winRate: rows.length > 0 ? winCount / rows.length : null,
      avgReturnPct: avg,
      medianReturnPct: median,
      bestReturnPct: best?.returnPct ?? null,
      bestYear: best?.year ?? null,
      worstReturnPct: worst?.returnPct ?? null,
      worstYear: worst?.year ?? null,
    };
  });

  return {
    source,
    index: "VNINDEX",
    startDate: normalized[0]?.date ?? null,
    endDate: normalized[normalized.length - 1]?.date ?? null,
    monthlyReturns,
    monthlyStats,
    metadata: {
      rawPointCount: normalized.length,
      monthlyReturnCount: monthlyReturns.length,
      generatedAt: new Date().toISOString(),
      warning,
    },
  };
}

export async function fetchVietstockVnIndexPoints(): Promise<VnIndexClosePoint[]> {
  const token = process.env.VIETSTOCK_REQUEST_VERIFICATION_TOKEN || DEFAULT_VIETSTOCK_TOKEN;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body = new URLSearchParams({
      indexType: "1",
      indexId: "1",
      duration: "ALL",
      __RequestVerificationToken: token,
    });
    const response = await fetch(VIETSTOCK_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: `__RequestVerificationToken=${token}`,
        Origin: "https://finance.vietstock.vn",
        Referer: "https://finance.vietstock.vn/chung-khoan-viet-nam.htm",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
      signal: controller.signal,
      redirect: "manual",
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Vietstock returned ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const points = parseVietstockIndexPayload(payload);
    if (points.length === 0) throw new Error("Vietstock response did not contain chart points");
    return points;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSimplizeVnIndexPoints(): Promise<VnIndexClosePoint[]> {
  const allPoints: VnIndexClosePoint[] = [];
  let total = 0;

  for (let page = 0; page < 20; page += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const url =
      `${SIMPLIZE_URL}?type=index&page=${page}` +
      `&size=${SIMPLIZE_PAGE_SIZE}&domestic=true`;

    try {
      const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
      });

      if (!response.ok) {
        throw new Error(`Simplize returned ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      total = parseNumber((payload as Record<string, unknown> | null)?.total) ?? total;
      const points = parseSimplizeIndexPayload(payload);
      if (points.length === 0) break;
      allPoints.push(...points);
      if (total > 0 && allPoints.length >= total) break;
      if (points.length < SIMPLIZE_PAGE_SIZE) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  const normalized = normalizePoints(allPoints);
  if (normalized.length === 0) throw new Error("Simplize response did not contain chart points");
  return normalized;
}

function fromHistoryBars(points: HistoryBar[]): VnIndexClosePoint[] {
  return points
    .map((point) => ({
      date: new Date(point.time * 1000).toISOString().slice(0, 10),
      close: point.close,
    }))
    .filter((point) => Number.isFinite(point.close) && point.close > 0);
}

export async function getVnIndexSeasonality(): Promise<VnIndexSeasonalityResult> {
  try {
    const points = await fetchSimplizeVnIndexPoints();
    return computeVnIndexSeasonality(points, "simplize", null);
  } catch (simplizeError) {
    try {
      const points = await fetchVietstockVnIndexPoints();
      return computeVnIndexSeasonality(
        points,
        "vietstock",
        simplizeError instanceof Error ? simplizeError.message : "Simplize request failed",
      );
    } catch (vietstockError) {
      const today = new Date().toISOString().slice(0, 10);
      const fallback = await fetchTickerHistory("VNINDEX", "2000-01-01", today);
      const warnings = [
        simplizeError instanceof Error ? simplizeError.message : "Simplize request failed",
        vietstockError instanceof Error ? vietstockError.message : "Vietstock request failed",
      ];

      return computeVnIndexSeasonality(
        fromHistoryBars(fallback),
        "vps-fallback",
        warnings.join("; "),
      );
    }
  }
}
