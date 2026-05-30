import type { StockFundamentals } from "@/types/stocks";

const CAFEF_FINANCIAL_RATIO_URL =
  "https://cafef.vn/du-lieu/Ajax/PageNew/ChiSoTaiChinh.ashx";
const REQUEST_TIMEOUT_MS = 12000;

function parseApiNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/\s+/g, "").replace(/[^\d,.-]/g, "").trim();
  if (!cleaned || cleaned === "-") return null;

  const parsed = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getApiMetric(payload: unknown, code: string): number | null {
  if (!payload || typeof payload !== "object") return null;

  const data = (payload as Record<string, unknown>).Data;
  if (!Array.isArray(data)) return null;

  const item = data.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return (entry as Record<string, unknown>).Code === code;
  });

  if (!item || typeof item !== "object") return null;
  return parseApiNumber((item as Record<string, unknown>).Value);
}

function getApiText(payload: unknown, code: string): string | null {
  if (!payload || typeof payload !== "object") return null;

  const data = (payload as Record<string, unknown>).Data;
  if (!Array.isArray(data)) return null;

  const item = data.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return (entry as Record<string, unknown>).Code === code;
  });

  if (!item || typeof item !== "object") return null;
  const value = (item as Record<string, unknown>).Value;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildCoverage(metrics: Record<string, number | null>) {
  const dataPoints: string[] = [];
  const missingData: string[] = [];

  for (const [key, value] of Object.entries(metrics)) {
    if (value !== null && Number.isFinite(value)) dataPoints.push(key);
    else missingData.push(key);
  }

  return { dataPoints, missingData };
}

export function parseCafeFFinancialRatios(
  payload: unknown,
  ticker: string,
): StockFundamentals | null {
  if (!payload || typeof payload !== "object") return null;

  const success = (payload as Record<string, unknown>).Success;
  const data = (payload as Record<string, unknown>).Data;
  if (success !== true || !Array.isArray(data)) return null;

  const eps = getApiMetric(payload, "EPScoBan");
  const dilutedEps = getApiMetric(payload, "EPSphaLoang");
  const bvps = getApiMetric(payload, "GiaTriSoSach");
  const pe = getApiMetric(payload, "P/E");
  const pb = getApiMetric(payload, "Beta");
  const marketCap = getApiMetric(payload, "VonHoaThiTruong");
  const sharesOutstanding = getApiMetric(payload, "KlcpLuuHanh");
  const roe =
    eps !== null && bvps !== null && bvps > 0 ? (eps / bvps) * 100 : null;

  const coverage = buildCoverage({
    eps,
    dilutedEps,
    bvps,
    pe,
    pb,
    marketCap,
    sharesOutstanding,
    roe,
  });

  return {
    ticker: ticker.toUpperCase(),
    source: "cafef",
    asOf: getApiText(payload, "ThoiGian") ?? new Date().toISOString(),
    eps,
    dilutedEps,
    bvps,
    pe,
    pb,
    marketCap,
    sharesOutstanding,
    revenue: null,
    revenueGrowth: null,
    netIncome: null,
    netIncomeGrowth: null,
    roe,
    totalAssets: null,
    totalDebt: null,
    equity: null,
    debtToAssets: null,
    debtToEquity: null,
    operatingCashFlow: null,
    freeCashFlow: null,
    dataPoints: coverage.dataPoints,
    missingData: [
      ...coverage.missingData,
      "revenue",
      "netIncome",
      "totalAssets",
      "totalDebt",
      "equity",
      "operatingCashFlow",
      "freeCashFlow",
    ],
  };
}

export async function fetchCafeFFundamentals(ticker: string): Promise<StockFundamentals | null> {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(normalizedTicker)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${CAFEF_FINANCIAL_RATIO_URL}?Symbol=${normalizedTicker.toLowerCase()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: controller.signal,
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    return parseCafeFFinancialRatios(payload, normalizedTicker);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// --- DNSE Senses business-result normalization ---
const SENSES_INDEX_GROUP_URL =
  "https://api-bo.dnse.com.vn/senses-api/business-result/index-group";
const SENSES_BUSINESS_RESULT_URL =
  "https://api-bo.dnse.com.vn/senses-api/business-result";
const SENSES_CYCLE_TYPE = "quy";
const SENSES_CYCLE_NUMBER = 5;

interface SensesIndexGroup {
  groupType: string | null;
  codes: string[];
}

interface SensesSeries {
  label: string;
  y: number[];
}

interface SensesBusinessResult {
  code: string;
  x: string[];
  unit: string | null;
  data: SensesSeries[];
}

function normalizeLabel(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseSensesIndexGroup(payload: unknown): SensesIndexGroup | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const indexes = Array.isArray(record.indexes) ? record.indexes : [];
  const codes = indexes
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const code = (item as Record<string, unknown>).code;
      return typeof code === "string" && code.trim() ? code.trim() : null;
    })
    .filter((code): code is string => code !== null);

  if (codes.length === 0) return null;

  return {
    groupType: typeof record.groupType === "string" ? record.groupType : null,
    codes,
  };
}

function parseSensesBusinessResult(
  payload: unknown,
  code: string,
): SensesBusinessResult | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const rawData = Array.isArray(record.data) ? record.data : [];
  const data = rawData
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const itemRecord = item as Record<string, unknown>;
      const label = typeof itemRecord.label === "string" ? itemRecord.label : "";
      const y = Array.isArray(itemRecord.y)
        ? itemRecord.y
            .map((value) => parseApiNumber(value))
            .filter((value): value is number => value !== null)
        : [];

      return label && y.length > 0 ? { label, y } : null;
    })
    .filter((item): item is SensesSeries => item !== null);

  if (data.length === 0) return null;

  return {
    code,
    x: Array.isArray(record.x)
      ? record.x.filter((value): value is string => typeof value === "string")
      : [],
    unit: typeof record.unit === "string" ? record.unit : null,
    data,
  };
}

function latestSeriesValue(
  details: Map<string, SensesBusinessResult>,
  code: string,
  labelMatchers: RegExp[],
): number | null {
  const detail = details.get(code);
  if (!detail) return null;

  for (const series of detail.data) {
    const normalized = normalizeLabel(series.label);
    if (!labelMatchers.some((matcher) => matcher.test(normalized))) continue;

    for (let index = series.y.length - 1; index >= 0; index -= 1) {
      const value = series.y[index];
      if (Number.isFinite(value)) return value;
    }
  }

  return null;
}

function ratioFromPercent(value: number | null): number | null {
  if (value === null) return null;
  return Math.abs(value) > 10 ? value / 100 : value;
}

export function parseSensesBusinessResults(
  ticker: string,
  indexGroup: SensesIndexGroup,
  businessResults: SensesBusinessResult[],
): StockFundamentals | null {
  if (businessResults.length === 0) return null;

  const details = new Map(businessResults.map((item) => [item.code, item]));
  const revenueGrowth =
    latestSeriesValue(details, "BUSINESS_RESULT", [
      /^doanh thu thuan$/,
      /^thu nhap lai thuan$/,
    ]) ?? null;
  const netIncomeGrowth = latestSeriesValue(details, "BUSINESS_RESULT", [
    /^lnst cong ty me$/,
    /^loi nhuan sau thue/,
  ]);
  const roe = latestSeriesValue(details, "PROFITABLE_EFFICIENCY", [/^roe$/]);
  const debtToEquity = ratioFromPercent(
    latestSeriesValue(details, "LEVER", [
      /^no vay von chu$/,
      /^tong no von chu$/,
      /^de$/,
    ]),
  );
  const freeCashFlow = latestSeriesValue(details, "CASH_FLOW", [
    /^fcf$/,
    /^free cash flow$/,
    /^dong tien tu do$/,
  ]);

  const coverage = buildCoverage({
    revenueGrowth,
    netIncomeGrowth,
    roe,
    debtToEquity,
    freeCashFlow,
  });

  return {
    ticker: ticker.toUpperCase(),
    source: `senses-business-result:${indexGroup.groupType ?? "UNKNOWN"}`,
    asOf: new Date().toISOString(),
    eps: null,
    dilutedEps: null,
    bvps: null,
    pe: null,
    pb: null,
    marketCap: null,
    sharesOutstanding: null,
    revenue: null,
    revenueGrowth,
    netIncome: null,
    netIncomeGrowth,
    roe,
    totalAssets: null,
    totalDebt: null,
    equity: null,
    debtToAssets: null,
    debtToEquity,
    operatingCashFlow: null,
    freeCashFlow,
    dataPoints: coverage.dataPoints,
    missingData: [
      ...coverage.missingData,
      "eps",
      "dilutedEps",
      "bvps",
      "pe",
      "pb",
      "marketCap",
      "sharesOutstanding",
      "revenue",
      "netIncome",
      "totalAssets",
      "totalDebt",
      "equity",
      "debtToAssets",
      "operatingCashFlow",
    ],
  };
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;

    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchSensesBusinessResults(ticker: string): Promise<StockFundamentals | null> {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(normalizedTicker)) return null;

  const groupPayload = await fetchJson(
    `${SENSES_INDEX_GROUP_URL}?symbol=${encodeURIComponent(normalizedTicker)}`,
  );
  const indexGroup = parseSensesIndexGroup(groupPayload);
  if (!indexGroup) return null;

  const detailResults = await Promise.all(
    indexGroup.codes.map(async (code) => {
      const url =
        `${SENSES_BUSINESS_RESULT_URL}?symbol=${encodeURIComponent(normalizedTicker)}` +
        `&code=${encodeURIComponent(code)}` +
        `&cycleType=${encodeURIComponent(SENSES_CYCLE_TYPE)}` +
        `&cycleNumber=${SENSES_CYCLE_NUMBER}`;
      const payload = await fetchJson(url);
      return parseSensesBusinessResult(payload, code);
    }),
  );

  return parseSensesBusinessResults(
    normalizedTicker,
    indexGroup,
    detailResults.filter((item): item is SensesBusinessResult => item !== null),
  );
}

function mergeFundamentals(primary: StockFundamentals | null, secondary: StockFundamentals | null): StockFundamentals | null {
  if (!primary && !secondary) return null;
  const a = primary ?? (secondary as StockFundamentals);
  const b = secondary ?? (primary as StockFundamentals);

  function choose<K extends keyof StockFundamentals>(key: K): StockFundamentals[K] {
    const va = a[key];
    if (va !== null && va !== undefined && !(Array.isArray(va) && (va as unknown[]).length === 0)) return va;
    return b[key];
  }

  const merged: StockFundamentals = {
    ticker: choose("ticker") as string,
    source: `combined:${primary ? primary.source : "none"}+${secondary ? secondary.source : "none"}`,
    asOf: choose("asOf") as string | null,
    eps: choose("eps") as number | null,
    dilutedEps: choose("dilutedEps") as number | null,
    bvps: choose("bvps") as number | null,
    pe: choose("pe") as number | null,
    pb: choose("pb") as number | null,
    marketCap: choose("marketCap") as number | null,
    sharesOutstanding: choose("sharesOutstanding") as number | null,
    revenue: choose("revenue") as number | null,
    revenueGrowth: choose("revenueGrowth") as number | null,
    netIncome: choose("netIncome") as number | null,
    netIncomeGrowth: choose("netIncomeGrowth") as number | null,
    roe: choose("roe") as number | null,
    totalAssets: choose("totalAssets") as number | null,
    totalDebt: choose("totalDebt") as number | null,
    equity: choose("equity") as number | null,
    debtToAssets: choose("debtToAssets") as number | null,
    debtToEquity: choose("debtToEquity") as number | null,
    operatingCashFlow: choose("operatingCashFlow") as number | null,
    freeCashFlow: choose("freeCashFlow") as number | null,
    dataPoints: Array.from(new Set([...(primary?.dataPoints ?? []), ...(secondary?.dataPoints ?? [])])),
    missingData: Array.from(new Set([...(primary?.missingData ?? []), ...(secondary?.missingData ?? [])])),
  };

  // Recompute missingData: remove any keys that now have values
  merged.missingData = merged.missingData.filter((k) => {
    const v = (merged as unknown as Record<string, unknown>)[k];
    if (Array.isArray(v)) return v.length === 0;
    return v === null || v === undefined;
  });

  return merged;
}

export async function fetchCombinedFundamentals(ticker: string): Promise<StockFundamentals | null> {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(normalizedTicker)) return null;

  const [cafefRes, sensesRes] = await Promise.allSettled([
    fetchCafeFFundamentals(normalizedTicker),
    fetchSensesBusinessResults(normalizedTicker),
  ]);

  const cafef = cafefRes.status === "fulfilled" ? cafefRes.value : null;
  const senses = sensesRes.status === "fulfilled" ? sensesRes.value : null;

  // DNSE is preferred for every field; CafeF only fills fields DNSE does not expose.
  const primary = senses ?? cafef;
  const secondary = primary === senses ? cafef : senses;

  return mergeFundamentals(primary, secondary);
}
