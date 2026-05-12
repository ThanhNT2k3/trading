import { HistoryApiResponse, HistoryBar, StockRow, VixSnapshot, PEPBData, ProprietaryTradeData, FinanceMetrics } from "@/types/stocks";
import { getExchange } from "@/lib/stocks/tickers";

const BASE_URL = "https://histdatafeed.vps.com.vn/tradingview/history";
const AGGRESSIVE_VOLUME_URL = "https://histdatafeed.vps.com.vn/volumeaggressivetrading";
const VIX_URL =
  "https://api.investing.com/api/financialdata/44336/historical/chart/?interval=P1M&pointscount=160";
const PE_PB_URL = "https://cafef.vn/du-lieu/Ajax/PageNew/FinanceData/GetDataChartPE.ashx"; // Update with actual URL
const PROPRIETARY_TRADE_URL = "https://cafef.vn/du-lieu/ajax/mobile/smart/ajaxkhoingoai.ashx?type="; // Update with actual URL
const REQUEST_TIMEOUT_MS = 12000;
const CACHE_TTL_MS = 60_000;
const CONCURRENCY_LIMIT = 8;

interface CacheEntry {
  value: HistoryBar[];
  expiresAt: number;
}

interface PEPBCacheEntry {
  value: PEPBData;
  expiresAt: number;
}

interface ProprietaryTradeCacheEntry {
  value: ProprietaryTradeData | null;
  expiresAt: number;
}

const historyCache = new Map<string, CacheEntry>();
const aggressiveVolumeCache = new Map<string, { value: number | null; expiresAt: number }>();
const pePbCache = new Map<string, PEPBCacheEntry>();
const proprietaryTradeCache = new Map<string, ProprietaryTradeCacheEntry>();
let vixCache: { value: VixSnapshot; expiresAt: number } | null = null;

interface FetchTickerRowsOptions {
  liquidityMode?: "ALL" | "MIN_TRADE_VALUE" | "RANGE" | "MIN_VOLUME";
  minTradeValue?: number | null;
  maxTradeValue?: number | null;
  minVolume?: number | null;
  maxVolume?: number | null;
}

function toUnixTimestamp(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00`).getTime() / 1000);
}

function getCacheKey(ticker: string, startDate: string, endDate: string): string {
  return `${ticker}_${startDate}_${endDate}`;
}

function toHistoryBars(payload: HistoryApiResponse): HistoryBar[] {
  if (
    payload.s !== "ok" ||
    !payload.t ||
    !payload.o ||
    !payload.h ||
    !payload.l ||
    !payload.c ||
    !payload.v
  ) {
    return [];
  }

  const length = Math.min(
    payload.t.length,
    payload.o.length,
    payload.h.length,
    payload.l.length,
    payload.c.length,
    payload.v.length,
  );

  const points: HistoryBar[] = [];
  for (let idx = 0; idx < length; idx += 1) {
    points.push({
      time: payload.t[idx],
      open: payload.o[idx],
      high: payload.h[idx],
      low: payload.l[idx],
      close: payload.c[idx],
      volume: payload.v[idx],
    });
  }
  return points;
}

function parseAggressiveTradeValue(payload: unknown): number | null {
  const getNumericField = (obj: Record<string, unknown>, keys: string[]): number | null => {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return null;
  };

  const sumLadderRows = (rows: unknown[]): number | null => {
    let totalTradeValue = 0;
    let hasAny = false;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const candidate = row as Record<string, unknown>;
      const price = getNumericField(candidate, ["Price", "price", "p"]);
      if (price === null) continue;
      const totalVolume = getNumericField(candidate, ["TotalVolume", "totalVolume", "volume", "v"]);
      if (totalVolume !== null) {
        totalTradeValue += price * totalVolume;
        hasAny = true;
        continue;
      }
      const buy = getNumericField(candidate, ["AggressiveBuyingVolume", "aggressiveBuyingVolume"]);
      const sell = getNumericField(candidate, ["AggressiveSellingVolume", "aggressiveSellingVolume"]);
      const other = getNumericField(candidate, ["OtherVolume", "otherVolume"]);
      if (buy !== null || sell !== null || other !== null) {
        totalTradeValue += price * ((buy ?? 0) + (sell ?? 0) + (other ?? 0));
        hasAny = true;
      }
    }
    return hasAny ? totalTradeValue : null;
  };

  if (typeof payload === "number" && Number.isFinite(payload)) return payload;
  if (Array.isArray(payload)) return sumLadderRows(payload);

  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    if (Array.isArray(candidate.data)) {
      return sumLadderRows(candidate.data);
    }
    return getNumericField(candidate, ["tradeValue", "TradeValue", "value"]);
  }

  return null;
}

function parseAggressiveTicker(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Record<string, unknown>;
  const keys = ["ticker", "symbol", "code", "stockCode"];
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().toUpperCase();
    }
  }
  return null;
}

function shouldKeepTickerByLiquidity(
  tradeValue: number | null,
  mode: "ALL" | "MIN_TRADE_VALUE" | "RANGE" | "MIN_VOLUME",
  minTradeValue: number | null,
  maxTradeValue: number | null,
): boolean {
  if (mode === "ALL") return true;
  const safeTradeValue = tradeValue ?? 0;
  if (mode === "MIN_TRADE_VALUE" || mode === "MIN_VOLUME") {
    if (minTradeValue === null) return true;
    return safeTradeValue >= minTradeValue;
  }
  if (minTradeValue !== null && safeTradeValue < minTradeValue) return false;
  if (maxTradeValue !== null && safeTradeValue > maxTradeValue) return false;
  return true;
}

function parseAggressiveVolumeList(payload: unknown): Map<string, number | null> {
  const map = new Map<string, number | null>();
  const source =
    payload && typeof payload === "object" && Array.isArray((payload as Record<string, unknown>).data)
      ? ((payload as Record<string, unknown>).data as unknown[])
      : Array.isArray(payload)
        ? payload
        : [];

  for (const item of source) {
    const ticker = parseAggressiveTicker(item);
    if (!ticker) continue;
    const volume = parseAggressiveTradeValue(item);
    map.set(ticker, volume);
  }

  return map;
}

async function fetchAggressiveVolumesForTickers(tickers: string[]): Promise<Map<string, number | null>> {
  const requestedTickers = new Set(tickers.map((ticker) => ticker.toUpperCase()));
  const responseMap = new Map<string, number | null>();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(AGGRESSIVE_VOLUME_URL , {
      method: "GET",
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (response.ok) {
      const payload = (await response.json()) as unknown;
      const parsedMap = parseAggressiveVolumeList(payload);
      if (parsedMap.size > 0) {
        for (const [ticker, volume] of parsedMap.entries()) {
          if (!requestedTickers.has(ticker)) continue;
          responseMap.set(ticker, volume);
          aggressiveVolumeCache.set(ticker, {
            value: volume,
            expiresAt: Date.now() + CACHE_TTL_MS,
          });
        }
      }
    }
  } catch {
    // Fallback to per-ticker endpoint below.
  } finally {
    clearTimeout(timeout);
  }

  const missingTickers = tickers.filter((ticker) => !responseMap.has(ticker.toUpperCase()));
  if (missingTickers.length > 0) {
    for (let index = 0; index < missingTickers.length; index += CONCURRENCY_LIMIT) {
      const chunk = missingTickers.slice(index, index + CONCURRENCY_LIMIT);
      const volumes = await Promise.all(chunk.map((ticker) => fetchAggressiveVolume(ticker)));
      chunk.forEach((ticker, itemIndex) => {
        responseMap.set(ticker.toUpperCase(), volumes[itemIndex]);
      });
    }
  }

  return responseMap;
}

function buildStockRowFromHistory(
  ticker: string,
  points: HistoryBar[],
  aggressiveVolume: number | null,
  pePbData: PEPBData | null = null,
  proprietaryData: ProprietaryTradeData | null = null,
): StockRow {
  const latestClose = points.length > 0 ? points[points.length - 1].close : null;
  const firstClose = points.length > 0 ? points[0].close : null;
  const changePercent =
    latestClose !== null && firstClose !== null && firstClose !== 0
      ? ((latestClose - firstClose) / firstClose) * 100
      : null;

  return {
    ticker: ticker.toUpperCase(),
    exchange: getExchange(ticker),
    latestClose,
    changePercent,
    latestVolume: aggressiveVolume ?? (points.length > 0 ? points[points.length - 1].volume : null),
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
    points,
    pe: pePbData?.now.pe ?? null,
    pb: pePbData?.now.pb ?? null,
    roe: pePbData?.now.roe ?? null,
    marketCap: pePbData?.now.marketCap ?? null,
    proprietaryTradeVolume: proprietaryData?.volume ?? null,
    ath: null,
    athDate: null,
    isAtATH: false,
    athReachedWithin1Year: false,
  };
}

function parseVixSnapshot(payload: unknown): VixSnapshot {
  const candidate = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const times = candidate && Array.isArray(candidate.t) ? candidate.t : [];
  const closes = candidate && Array.isArray(candidate.c) ? candidate.c : [];
  const count = Math.min(times.length, closes.length);

  for (let index = count - 1; index >= 0; index -= 1) {
    const timestamp = times[index];
    const close = closes[index];
    if (typeof timestamp === "number" && Number.isFinite(timestamp) && typeof close === "number") {
      return {
        value: close,
        timestamp,
        asOf: new Date(timestamp * 1000).toISOString(),
      };
    }
  }

  return {
    value: null,
    timestamp: null,
    asOf: null,
  };
}

function parsePEPBData(payload: unknown): PEPBData | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Record<string, unknown>;
  const nowData = candidate.NowDataFinance as Record<string, unknown>;
  const pastData = candidate.PastDataFinance as Record<string, unknown>;
  const dataChart = candidate.DataChart as Record<string, unknown>[];

  if (!nowData || !pastData || !Array.isArray(dataChart)) return null;

  const getFinanceMetrics = (data: Record<string, unknown>): FinanceMetrics => ({
    pb: typeof data.PB === "number" ? data.PB : null,
    pe: typeof data.PE === "number" ? data.PE : null,
    roa: typeof data.ROA === "number" ? data.ROA : null,
    roe: typeof data.ROE === "number" ? data.ROE : null,
    marketCap: typeof data.MaketCap === "number" ? data.MaketCap : null,
  });

  const chart = dataChart
    .map((item) => ({
      pe: typeof item.Pe === "number" ? item.Pe : 0,
      index: typeof item.Index === "number" ? item.Index : 0,
      lnst: typeof item.LNST === "number" ? item.LNST : 0,
      time: typeof item.Time === "string" ? item.Time : "",
      timeStamp: typeof item.TimeStamp === "number" ? item.TimeStamp : 0,
    }))
    .filter((item) => item.pe > 0 && item.timeStamp > 0);

  return {
    now: getFinanceMetrics(nowData),
    past: getFinanceMetrics(pastData),
    dataChart: chart,
  };
}

function parseProprietaryTradeList(payload: unknown): ProprietaryTradeData[] {
  if (!payload || typeof payload !== "object") return [];

  const candidate = payload as Record<string, unknown>;
  const dataArray = Array.isArray(candidate.Data) ? candidate.Data : [];

  return dataArray
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const data = item as Record<string, unknown>;
      return {
        symbol: typeof data.Symbol === "string" ? data.Symbol : "",
        currentPrice: typeof data.CurrentPrice === "number" ? data.CurrentPrice : 0,
        basicPrice: typeof data.BasicPrice === "number" ? data.BasicPrice : 0,
        changePrice: typeof data.ChangePrice === "number" ? data.ChangePrice : 0,
        changePricePercent: typeof data.ChangePricePercent === "number" ? data.ChangePricePercent : 0,
        ceilPrice: typeof data.CeilPrice === "number" ? data.CeilPrice : 0,
        floorPrice: typeof data.FloorPrice === "number" ? data.FloorPrice : 0,
        volume: typeof data.Volume === "number" ? data.Volume : 0,
        value: typeof data.Value === "number" ? data.Value : 0,
        companyName: typeof data.CompanyName === "string" ? data.CompanyName : "",
        changeType: typeof data.ChangeType === "number" ? data.ChangeType : 0,
      };
    })
    .filter((item) => item !== null && item.symbol.length > 0) as ProprietaryTradeData[];
}

async function fetchPEPBData(ticker: string): Promise<PEPBData | null> {
  const normalizedTicker = ticker.toUpperCase();
  const cached = pePbCache.get(normalizedTicker);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${PE_PB_URL}`, {
      method: "GET",
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    const data = parsePEPBData(payload);
    if (data) {
      pePbCache.set(normalizedTicker, {
        value: data,
        expiresAt: Date.now() + CACHE_TTL_MS * 5,
      });
    }
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// This function is disabled to prevent continuous API calls to CAFEF
// The proprietary trade data endpoint was causing excessive requests
/*
async function fetchProprietaryTradeData(ticker: string): Promise<ProprietaryTradeData | null> {
  const normalizedTicker = ticker.toUpperCase();
  const cached = proprietaryTradeCache.get(normalizedTicker);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${PROPRIETARY_TRADE_URL}${"buy"}`, {
      method: "GET",
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    const tradeList = parseProprietaryTradeList(payload);
    const tradeData = tradeList.find((item) => item.symbol === normalizedTicker) || null;

    proprietaryTradeCache.set(normalizedTicker, {
      value: tradeData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return tradeData;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
*/

async function fetchAggressiveVolume(ticker: string): Promise<number | null> {
  const normalizedTicker = ticker.toUpperCase();
  const cached = aggressiveVolumeCache.get(normalizedTicker);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${AGGRESSIVE_VOLUME_URL}/${normalizedTicker}`, {
      method: "GET",
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      aggressiveVolumeCache.set(normalizedTicker, {
        value: null,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return null;
    }
    const payload = (await response.json()) as unknown;
    const volume = parseAggressiveTradeValue(payload);
    aggressiveVolumeCache.set(normalizedTicker, {
      value: volume,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return volume;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTickerHistory(
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<HistoryBar[]> {
  const normalizedTicker = ticker.toUpperCase();
  const cacheKey = getCacheKey(normalizedTicker, startDate, endDate);
  const cached = historyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const startTs = toUnixTimestamp(startDate);
  const endTs = toUnixTimestamp(endDate);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${BASE_URL}?symbol=${normalizedTicker}&resolution=1D&from=${startTs}&to=${endTs}&countback=1000`;
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const payload = (await response.json()) as HistoryApiResponse;
    const points = toHistoryBars(payload);
    historyCache.set(cacheKey, {
      value: points,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return points;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTickerRow(
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<StockRow> {
  try {
    const points = await fetchTickerHistory(ticker, startDate, endDate);
    const pePbData = await fetchPEPBData(ticker);
    // Proprietary trade data removed to prevent continuous API calls
    return buildStockRowFromHistory(ticker, points, null, pePbData, null);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Request timeout"
        : error instanceof Error
          ? error.message
          : "Unable to fetch data";

    return {
      ticker: ticker.toUpperCase(),
      exchange: getExchange(ticker),
      latestClose: null,
      changePercent: null,
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
      points: [],
      pe: null,
      pb: null,
      roe: null,
      marketCap: null,
      proprietaryTradeVolume: null,
      ath: null,
      athDate: null,
      isAtATH: false,
      athReachedWithin1Year: false,
      error: message,
    };
  }
}

export async function fetchTickerRows(
  tickers: string[],
  startDate: string,
  endDate: string,
  options: FetchTickerRowsOptions = {},
): Promise<StockRow[]> {
  const liquidityMode = options.liquidityMode ?? "ALL";
  const minTradeValue = options.minTradeValue ?? options.minVolume ?? null;
  const maxTradeValue = options.maxTradeValue ?? options.maxVolume ?? null;
  const rows: StockRow[] = [];
  const aggressiveVolumes = await fetchAggressiveVolumesForTickers(tickers);
  const eligibleTickers = tickers.filter((ticker) =>
    shouldKeepTickerByLiquidity(
      aggressiveVolumes.get(ticker.toUpperCase()) ?? null,
      liquidityMode,
      minTradeValue,
      maxTradeValue,
    ),
  );

  // Fetch PE/PB data in parallel (proprietary trade data removed to prevent continuous API calls)
  const pePbDataMap = new Map<string, PEPBData | null>();

  for (let index = 0; index < eligibleTickers.length; index += CONCURRENCY_LIMIT) {
    const chunk = eligibleTickers.slice(index, index + CONCURRENCY_LIMIT);
    chunk.forEach((ticker) => {
      pePbDataMap.set(ticker.toUpperCase(), null); // Will be fetched individually in fetchTickerRow to leverage caching
    });
  }

  // Fetch history data in chunks
  for (let index = 0; index < eligibleTickers.length; index += CONCURRENCY_LIMIT) {
    const chunk = eligibleTickers.slice(index, index + CONCURRENCY_LIMIT);
    const chunkRows = await Promise.all(chunk.map((ticker) => fetchTickerHistory(ticker, startDate, endDate)));
    const mappedRows = chunkRows.map((points, itemIndex) =>
      buildStockRowFromHistory(
        chunk[itemIndex],
        points,
        aggressiveVolumes.get(chunk[itemIndex].toUpperCase()) ?? null,
        pePbDataMap.get(chunk[itemIndex].toUpperCase()) ?? null,
        null, // Proprietary data removed to prevent continuous API calls
      ),
    );
    rows.push(...mappedRows);
  }

  return rows;
}

export async function fetchVixSnapshot(): Promise<VixSnapshot> {
  if (vixCache && vixCache.expiresAt > Date.now()) {
    return vixCache.value;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(VIX_URL, {
      method: "GET",
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      return { value: null, timestamp: null, asOf: null };
    }
    const payload = (await response.json()) as unknown;
    const snapshot = parseVixSnapshot(payload);
    vixCache = { value: snapshot, expiresAt: Date.now() + CACHE_TTL_MS };
    return snapshot;
  } catch {
    return { value: null, timestamp: null, asOf: null };
  } finally {
    clearTimeout(timeout);
  }
}
