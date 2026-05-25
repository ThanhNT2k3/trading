import { fetchTickerRows } from "@/lib/stocks/api";
import type { FundNavRow, PortfolioHolding, StockPriceRow, WeeklyFundPlanRow } from "@/lib/portfolio";
import type { HistoryBar } from "@/types/stocks";

const SHEET_URL =
  "https://sheets.googleapis.com/v4/spreadsheets/1c_QgP-wTow7ZpjmGpe6f2QYd8EQqbudllhW2O1GfcGM/values/Sheet1!A:AE?key=AIzaSyD5BcA-3QajKBkOYgFjwnawkyf81Gw5A8Y";

const WEEKLY_FUND_PLAN = [
  { inputSymbol: "TCFIN", amount: 500000 },
  { inputSymbol: "VMEEF", amount: 500000 },
  { inputSymbol: "DCDS", amount: 1000000 },
  { inputSymbol: "VCBFBCF", amount: 1000000 },
  { inputSymbol: "VEOF", amount: 500000 },
];

type GoogleSheetResponse = {
  values?: string[][];
};

export type FundMarketData = {
  funds: FundNavRow[];
  weeklyPlan: WeeklyFundPlanRow[];
};

function parseNumber(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSheetDate(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slashMatch) return null;

  const day = Number(slashMatch[1]);
  const month = Number(slashMatch[2]);
  const year = Number(slashMatch[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function toSheetIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseFundSymbol(header: string) {
  return header.replace(/^Gia\s+/i, "").replace(/^Giá\s+/i, "").trim().toUpperCase();
}

function normalizeSymbol(symbol: string) {
  return symbol.replace(/[^A-Z0-9]/g, "").toUpperCase();
}

function isMonday(dateValue: string | undefined) {
  const parsed = parseSheetDate(dateValue);
  return parsed ? parsed.getUTCDay() === 1 : false;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toPointDate(point: HistoryBar) {
  return new Date(point.time * 1000).toISOString().slice(0, 10);
}

function getStockDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 21);

  return {
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

function buildFundNavRows(values: string[][]): FundNavRow[] {
  const [headers, ...rows] = values;
  if (!headers || rows.length === 0) return [];

  return headers.slice(1).flatMap((header, headerIndex) => {
    const columnIndex = headerIndex + 1;
    const points = rows
      .map((row) => {
        const nav = parseNumber(row[columnIndex]);
        const date = parseSheetDate(row[0]);
        if (nav === null || !date) return null;
        return {
          date,
          dateLabel: toSheetIsoDate(date),
          nav,
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const latest = points[0];
    if (!latest) return [];

    const previous = points[1];
    const latestNav = latest.nav;
    const previousNav = previous?.nav ?? null;

    const change = previousNav === null ? 0 : latestNav - previousNav;

    return [
      {
        symbol: parseFundSymbol(header),
        latestDate: latest.dateLabel,
        latestNav,
        previousDate: previous?.dateLabel ?? null,
        previousNav,
        change,
        changePercent: previousNav === null || previousNav === 0 ? 0 : (change / previousNav) * 100,
        history: points
          .map((point) => ({
            date: point.dateLabel,
            price: point.nav,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
    ];
  });
}

function buildWeeklyPlanRows(values: string[][]): WeeklyFundPlanRow[] {
  const [headers, ...rows] = values;
  if (!headers || rows.length === 0) return [];

  const columnByNormalizedSymbol = new Map<string, { symbol: string; columnIndex: number }>();
  headers.slice(1).forEach((header, headerIndex) => {
    const symbol = parseFundSymbol(header);
    columnByNormalizedSymbol.set(normalizeSymbol(symbol), {
      symbol,
      columnIndex: headerIndex + 1,
    });
  });

  return WEEKLY_FUND_PLAN.map((plan) => {
    const column = columnByNormalizedSymbol.get(normalizeSymbol(plan.inputSymbol));
    if (!column) {
      return {
        symbol: plan.inputSymbol,
        inputSymbol: plan.inputSymbol,
        amount: plan.amount,
        executionDate: null,
        nav: null,
        estimatedUnits: 0,
      };
    }

    const mondayRows = rows
      .map((row) => {
        const date = parseSheetDate(row[0]);
        const nav = parseNumber(row[column.columnIndex]);
        if (!date || nav === null) return null;
        return {
          date,
          dateLabel: toSheetIsoDate(date),
          nav,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .filter((row) => isMonday(row.dateLabel))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const executionRow = mondayRows[0];
    const nav = executionRow?.nav ?? null;

    return {
      symbol: column.symbol,
      inputSymbol: plan.inputSymbol,
      amount: plan.amount,
      executionDate: executionRow?.dateLabel ?? null,
      nav,
      estimatedUnits: nav && nav > 0 ? plan.amount / nav : 0,
    };
  });
}

export async function fetchFundMarketData(): Promise<FundMarketData> {
  const response = await fetch(SHEET_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Cannot load fund NAV sheet: ${response.status}`);
  }

  const sheet = (await response.json()) as GoogleSheetResponse;
  const values = sheet.values ?? [];

  return {
    funds: buildFundNavRows(values),
    weeklyPlan: buildWeeklyPlanRows(values),
  };
}

export async function fetchStockPrices(symbols: string[]): Promise<StockPriceRow[]> {
  const normalizedSymbols = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
  if (normalizedSymbols.length === 0) return [];

  const { startDate, endDate } = getStockDateRange();
  const rows = await fetchTickerRows(normalizedSymbols, startDate, endDate, {
    liquidityMode: "ALL",
  });

  return rows.flatMap((row) => {
    const orderedPoints = [...row.points].sort((a, b) => a.time - b.time);
    const latest = orderedPoints.at(-1);
    if (!latest) return [];

    const previous = orderedPoints.at(-2) ?? null;
    const change = previous ? latest.close - previous.close : 0;

    return [
      {
        symbol: row.ticker,
        latestDate: toPointDate(latest),
        latestPrice: latest.close,
        previousDate: previous ? toPointDate(previous) : null,
        previousPrice: previous?.close ?? null,
        change,
        changePercent: previous && previous.close !== 0 ? (change / previous.close) * 100 : 0,
        history: orderedPoints.map((point) => ({
          date: toPointDate(point),
          price: point.close,
        })),
      },
    ];
  });
}

export function getStockSymbolsForPortfolio(
  holdings: PortfolioHolding[],
  fundRows: FundNavRow[],
) {
  const fundSymbols = new Set(fundRows.map((row) => row.symbol.toUpperCase()));
  return holdings
    .filter((holding) => !fundSymbols.has(holding.symbol.toUpperCase()))
    .map((holding) => holding.symbol.toUpperCase());
}
