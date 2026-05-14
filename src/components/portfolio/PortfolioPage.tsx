"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "@/icons";
import type {
  FundNavRow,
  PortfolioAssetType,
  PortfolioData,
  PortfolioHolding,
  PortfolioSnapshot,
  PortfolioSummary,
  StockPriceRow,
  WeeklyFundPlanRow,
} from "@/lib/portfolio";
import { summarizePortfolio } from "@/lib/portfolio";

type PortfolioResponse = {
  portfolio: PortfolioData;
  summary: PortfolioSummary;
};

type FundNavResponse = {
  funds: FundNavRow[];
  weeklyPlan: WeeklyFundPlanRow[];
  updatedAt: string;
};

type StockPricesResponse = {
  prices: StockPriceRow[];
  updatedAt: string;
};

type HoldingFormState = {
  id: string;
  symbol: string;
  category: string;
  quantity: string;
  averageCost: string;
};

type DailyPortfolioRow = {
  date: string;
  totalCost: number;
  marketValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossPercent: number;
  dailyProfitLoss: number;
  dailyProfitLossPercent: number;
  categorySummary: string;
};

type CategoryMovementRow = {
  category: string;
  count: number;
  marketValue: number;
  dailyProfitLoss: number;
  dailyProfitLossPercent: number;
};

const blankHolding: HoldingFormState = {
  id: "",
  symbol: "",
  category: "Co phieu",
  quantity: "",
  averageCost: "",
};

const defaultPortfolio: PortfolioData = {
  holdings: [],
  dailySnapshots: [],
  updatedAt: new Date().toISOString(),
};

const defaultCategories = ["Co phieu", "Quy dau tu", "ETF", "Trai phieu", "Tien mat", "Crypto", "Khac"];

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}`;
}

function formatCurrency(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function priceUnitForHolding(holding: PortfolioHolding) {
  return holding.type === "stock" ? 1000 : 1;
}

function toHoldingForm(holding: PortfolioHolding): HoldingFormState {
  return {
    id: holding.id,
    symbol: holding.symbol,
    category: holding.category,
    quantity: String(holding.quantity),
    averageCost: String(holding.averageCost),
  };
}

function getHoldingType(symbol: string, category: string, fundNavBySymbol: Map<string, FundNavRow>): PortfolioAssetType {
  if (fundNavBySymbol.has(symbol.toUpperCase())) return "fund";
  if (category.toLowerCase().includes("quy") || category.toLowerCase().includes("fund")) return "fund";
  return "stock";
}

function getMarketPrice(
  symbol: string,
  fundNavBySymbol: Map<string, FundNavRow>,
  stockPriceBySymbol: Map<string, StockPriceRow>,
) {
  const normalizedSymbol = symbol.toUpperCase();
  const fundNav = fundNavBySymbol.get(normalizedSymbol);
  if (fundNav) {
    return {
      source: "fund" as const,
      latestDate: fundNav.latestDate,
      latestPrice: fundNav.latestNav,
      previousDate: fundNav.previousDate,
      previousPrice: fundNav.previousNav,
      change: fundNav.change,
      changePercent: fundNav.changePercent,
    };
  }

  const stockPrice = stockPriceBySymbol.get(normalizedSymbol);
  if (stockPrice) {
    return {
      source: "stock" as const,
      latestDate: stockPrice.latestDate,
      latestPrice: stockPrice.latestPrice,
      previousDate: stockPrice.previousDate,
      previousPrice: stockPrice.previousPrice,
      change: stockPrice.change,
      changePercent: stockPrice.changePercent,
    };
  }

  return null;
}

function toHolding(
  state: HoldingFormState,
  existing: PortfolioHolding | undefined,
  fundNavBySymbol: Map<string, FundNavRow>,
): PortfolioHolding {
  const symbol = state.symbol.trim().toUpperCase();
  const averageCost = Number(state.averageCost);
  const fundNav = fundNavBySymbol.get(symbol);

  return {
    id: existing?.id || state.id || createId("hld"),
    type: getHoldingType(symbol, state.category, fundNavBySymbol),
    symbol,
    name: existing?.name || symbol,
    category: state.category.trim() || existing?.category || "Portfolio",
    quantity: Number(state.quantity),
    averageCost,
    currentPrice: fundNav?.latestNav ?? existing?.currentPrice ?? averageCost,
    currency: existing?.currency || "VND",
    notes: existing?.notes ?? "",
  };
}

function StatCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-success-600 dark:text-success-400"
      : tone === "bad"
        ? "text-error-600 dark:text-error-400"
        : "text-gray-900 dark:text-white";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>{value}</p>
      {helper ? <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helper}</p> : null}
    </div>
  );
}

function ProfitBadge({ value, percent }: { value: number; percent?: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
  const className = isPositive
    ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
    : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {formatCurrency(value)}
      {typeof percent === "number" ? ` (${formatPercent(percent)})` : null}
    </span>
  );
}

function FundNavBadge({ value, percent }: { value: number; percent: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
  const className = isPositive
    ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
    : "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {formatCurrency(value)} ({formatPercent(percent)})
    </span>
  );
}

function upsertSnapshot(snapshots: PortfolioSnapshot[], snapshot: PortfolioSnapshot) {
  const existingIndex = snapshots.findIndex((item) => item.id === snapshot.id);
  if (existingIndex >= 0) {
    const nextSnapshots = [...snapshots];
    nextSnapshots[existingIndex] = snapshot;
    return nextSnapshots;
  }

  return [...snapshots, snapshot];
}

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData>(defaultPortfolio);
  const [fundNavRows, setFundNavRows] = useState<FundNavRow[]>([]);
  const [weeklyFundPlan, setWeeklyFundPlan] = useState<WeeklyFundPlanRow[]>([]);
  const [stockPriceRows, setStockPriceRows] = useState<StockPriceRow[]>([]);
  const [holdingForm, setHoldingForm] = useState<HoldingFormState>(blankHolding);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFundNav, setIsLoadingFundNav] = useState(false);
  const [isLoadingStockPrices, setIsLoadingStockPrices] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set([...defaultCategories, ...portfolio.holdings.map((holding) => holding.category)]),
    ).filter(Boolean);
  }, [portfolio.holdings]);

  const fundNavBySymbol = useMemo(() => {
    return new Map(fundNavRows.map((row) => [row.symbol, row]));
  }, [fundNavRows]);

  const stockPriceBySymbol = useMemo(() => {
    return new Map(stockPriceRows.map((row) => [row.symbol, row]));
  }, [stockPriceRows]);

  const livePortfolio = useMemo<PortfolioData>(() => {
    let nextSnapshots = [...portfolio.dailySnapshots];
    const nextHoldings = portfolio.holdings.map((holding) => {
      const price = getMarketPrice(holding.symbol, fundNavBySymbol, stockPriceBySymbol);
      if (!price) return holding;

      const latestSnapshot: PortfolioSnapshot = {
        id: `snap-${holding.id}-${price.latestDate}`,
        holdingId: holding.id,
        date: price.latestDate,
        closePrice: price.latestPrice,
      };
      const previousSnapshot: PortfolioSnapshot | null =
        price.previousDate && price.previousPrice !== null
          ? {
              id: `snap-${holding.id}-${price.previousDate}`,
              holdingId: holding.id,
              date: price.previousDate,
              closePrice: price.previousPrice,
            }
          : null;

      if (previousSnapshot) {
        nextSnapshots = upsertSnapshot(nextSnapshots, previousSnapshot);
      }
      nextSnapshots = upsertSnapshot(nextSnapshots, latestSnapshot);

      return {
        ...holding,
        type: price.source,
        currentPrice: price.latestPrice,
      };
    });

    return {
      ...portfolio,
      holdings: nextHoldings,
      dailySnapshots: nextSnapshots,
    };
  }, [fundNavBySymbol, portfolio, stockPriceBySymbol]);

  const liveSummary = useMemo(() => summarizePortfolio(livePortfolio), [livePortfolio]);

  const stockSymbols = useMemo(() => {
    return portfolio.holdings
      .filter((holding) => !fundNavBySymbol.has(holding.symbol.toUpperCase()))
      .map((holding) => holding.symbol.toUpperCase())
      .filter(Boolean);
  }, [fundNavBySymbol, portfolio.holdings]);

  const todayMovements = useMemo(() => {
    return portfolio.holdings
      .map((holding) => {
        const price = getMarketPrice(holding.symbol, fundNavBySymbol, stockPriceBySymbol);
        if (!price) return null;
        const effectiveHolding = { ...holding, type: price.source };
        const priceUnit = priceUnitForHolding(effectiveHolding);
        const dailyProfitLoss = price.change * priceUnit * holding.quantity;
        const marketValue = price.latestPrice * priceUnit * holding.quantity;

        return {
          holding,
          price,
          dailyProfitLoss,
          marketValue,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        const categoryCompare = a.holding.category.localeCompare(b.holding.category, "vi");
        if (categoryCompare !== 0) return categoryCompare;
        return Math.abs(b.dailyProfitLoss) - Math.abs(a.dailyProfitLoss);
      });
  }, [fundNavBySymbol, portfolio.holdings, stockPriceBySymbol]);

  const todayMovementSummary = useMemo(() => {
    const total = todayMovements.reduce((sum, row) => sum + row.dailyProfitLoss, 0);
    const up = todayMovements.filter((row) => row.dailyProfitLoss > 0).length;
    const down = todayMovements.filter((row) => row.dailyProfitLoss < 0).length;
    const largestMove = todayMovements.reduce(
      (largest, row) =>
        Math.abs(row.dailyProfitLoss) > Math.abs(largest?.dailyProfitLoss ?? 0) ? row : largest,
      todayMovements[0] ?? null,
    );

    return { total, up, down, largestMove };
  }, [todayMovements]);

  const categoryMovements = useMemo<CategoryMovementRow[]>(() => {
    const movementByCategory = new Map<string, CategoryMovementRow>();

    todayMovements.forEach((row) => {
      const category = row.holding.category || "Uncategorized";
      const current = movementByCategory.get(category) ?? {
        category,
        count: 0,
        marketValue: 0,
        dailyProfitLoss: 0,
        dailyProfitLossPercent: 0,
      };

      current.count += 1;
      current.marketValue += row.marketValue;
      current.dailyProfitLoss += row.dailyProfitLoss;
      movementByCategory.set(category, current);
    });

    return Array.from(movementByCategory.values())
      .map((row) => {
        const previousValue = row.marketValue - row.dailyProfitLoss;
        return {
          ...row,
          dailyProfitLossPercent:
            previousValue === 0 ? 0 : (row.dailyProfitLoss / previousValue) * 100,
        };
      })
      .sort((a, b) => Math.abs(b.dailyProfitLoss) - Math.abs(a.dailyProfitLoss));
  }, [todayMovements]);

  const groupedTodayMovements = useMemo(() => {
    const groups = new Map<string, typeof todayMovements>();

    todayMovements.forEach((row) => {
      const category = row.holding.category || "Uncategorized";
      groups.set(category, [...(groups.get(category) ?? []), row]);
    });

    return Array.from(groups.entries()).map(([category, rows]) => ({
      category,
      rows,
      dailyProfitLoss: rows.reduce((sum, row) => sum + row.dailyProfitLoss, 0),
      marketValue: rows.reduce((sum, row) => sum + row.marketValue, 0),
    }));
  }, [todayMovements]);


  const weeklyFundPlanSummary = useMemo(() => {
    return {
      totalAmount: weeklyFundPlan.reduce((sum, row) => sum + row.amount, 0),
      totalEstimatedUnits: weeklyFundPlan.reduce((sum, row) => sum + row.estimatedUnits, 0),
      executionDate:
        weeklyFundPlan.find((row) => row.executionDate)?.executionDate ?? null,
      readyCount: weeklyFundPlan.filter((row) => row.nav !== null && row.executionDate).length,
    };
  }, [weeklyFundPlan]);

  const dailyPortfolioRows = useMemo<DailyPortfolioRow[]>(() => {
    const holdingById = new Map(livePortfolio.holdings.map((holding) => [holding.id, holding]));
    const snapshotsByDate = new Map<string, PortfolioSnapshot[]>();
    const snapshotsByHolding = new Map<string, PortfolioSnapshot[]>();

    if (livePortfolio.dailySnapshots.length === 0 && livePortfolio.holdings.length > 0) {
      const totalCost = livePortfolio.holdings.reduce(
        (sum, holding) => sum + holding.averageCost * priceUnitForHolding(holding) * holding.quantity,
        0,
      );
      const marketValue = livePortfolio.holdings.reduce(
        (sum, holding) => sum + holding.currentPrice * priceUnitForHolding(holding) * holding.quantity,
        0,
      );
      const unrealizedProfitLoss = marketValue - totalCost;

      return [
        {
          date: today(),
          totalCost,
          marketValue,
          unrealizedProfitLoss,
          unrealizedProfitLossPercent:
            totalCost === 0 ? 0 : (unrealizedProfitLoss / totalCost) * 100,
          dailyProfitLoss: 0,
          dailyProfitLossPercent: 0,
          categorySummary: "No saved daily snapshot yet",
        },
      ];
    }

    livePortfolio.dailySnapshots.forEach((snapshot) => {
      snapshotsByDate.set(snapshot.date, [...(snapshotsByDate.get(snapshot.date) ?? []), snapshot]);
      snapshotsByHolding.set(snapshot.holdingId, [
        ...(snapshotsByHolding.get(snapshot.holdingId) ?? []),
        snapshot,
      ]);
    });

    snapshotsByHolding.forEach((snapshots, holdingId) => {
      snapshotsByHolding.set(
        holdingId,
        [...snapshots].sort((a, b) => a.date.localeCompare(b.date)),
      );
    });

    const findSnapshotAtOrBefore = (holdingId: string, date: string) => {
      const holdingSnapshots = snapshotsByHolding.get(holdingId) ?? [];
      return [...holdingSnapshots].reverse().find((item) => item.date <= date) ?? null;
    };

    const findSnapshotBefore = (holdingId: string, date: string) => {
      const holdingSnapshots = snapshotsByHolding.get(holdingId) ?? [];
      return [...holdingSnapshots].reverse().find((item) => item.date < date) ?? null;
    };

    return Array.from(snapshotsByDate.keys())
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const categoryMap = new Map<string, number>();
        let totalCost = 0;
        let marketValue = 0;
        let dailyProfitLoss = 0;
        let previousMarketValue = 0;

        livePortfolio.holdings.forEach((holding) => {
          const snapshot = findSnapshotAtOrBefore(holding.id, date);
          if (!snapshot) return;
          const priceUnit = priceUnitForHolding(holding);
          const value = snapshot.closePrice * priceUnit * holding.quantity;
          const cost = holding.averageCost * priceUnit * holding.quantity;
          const previousSnapshot = findSnapshotBefore(holding.id, date);
          const previousValue = previousSnapshot
            ? previousSnapshot.closePrice * priceUnit * holding.quantity
            : value;

          totalCost += cost;
          marketValue += value;
          dailyProfitLoss += value - previousValue;
          previousMarketValue += previousValue;
          categoryMap.set(holding.category, (categoryMap.get(holding.category) ?? 0) + (value - previousValue));
        });

        const unrealizedProfitLoss = marketValue - totalCost;
        const topCategories = Array.from(categoryMap.entries())
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
          .slice(0, 3)
          .map(([category, value]) => `${category}: ${formatCurrency(value)}`);

        return {
          date,
          totalCost,
          marketValue,
          unrealizedProfitLoss,
          unrealizedProfitLossPercent:
            totalCost === 0 ? 0 : (unrealizedProfitLoss / totalCost) * 100,
          dailyProfitLoss,
          dailyProfitLossPercent:
            previousMarketValue === 0 ? 0 : (dailyProfitLoss / previousMarketValue) * 100,
          categorySummary: topCategories.join(" | "),
        };
      });
  }, [livePortfolio]);

  const loadPortfolio = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/portfolio", { cache: "no-store" });
      if (!response.ok) throw new Error("Cannot load portfolio data");
      const data = (await response.json()) as PortfolioResponse;
      setPortfolio(data.portfolio);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected loading error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFundNav = async () => {
    setIsLoadingFundNav(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/portfolio/fund-nav", { cache: "no-store" });
      if (!response.ok) throw new Error("Cannot load fund NAV data");
      const data = (await response.json()) as FundNavResponse;
      setFundNavRows(data.funds);
      setWeeklyFundPlan(data.weeklyPlan ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected fund NAV error");
    } finally {
      setIsLoadingFundNav(false);
    }
  };

  const loadStockPrices = async (symbols: string[]) => {
    if (symbols.length === 0) {
      setStockPriceRows([]);
      return;
    }

    setIsLoadingStockPrices(true);
    setErrorMessage(null);
    try {
      const response = await fetch(
        `/api/portfolio/stock-prices?symbols=${encodeURIComponent(symbols.join(","))}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Cannot load stock prices");
      const data = (await response.json()) as StockPricesResponse;
      setStockPriceRows(data.prices);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected stock price error");
    } finally {
      setIsLoadingStockPrices(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
    loadFundNav();
  }, []);

  useEffect(() => {
    loadStockPrices(stockSymbols);
  }, [stockSymbols.join(",")]);

  const savePortfolio = async (nextPortfolio: PortfolioData, message: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPortfolio),
      });
      if (!response.ok) throw new Error("Cannot save portfolio data");
      const data = (await response.json()) as PortfolioResponse;
      setPortfolio(data.portfolio);
      setSuccessMessage(message);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected saving error");
    } finally {
      setIsSaving(false);
    }
  };

  const submitHolding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const existing = portfolio.holdings.find((item) => item.id === holdingForm.id);
    const holding = toHolding(holdingForm, existing, fundNavBySymbol);

    if (!holding.symbol || holding.quantity < 0 || !Number.isFinite(holding.averageCost)) {
      setErrorMessage("Please enter symbol, quantity, and a valid average cost.");
      return;
    }

    const exists = portfolio.holdings.some((item) => item.id === holding.id);
    const nextHoldings = exists
      ? portfolio.holdings.map((item) => (item.id === holding.id ? holding : item))
      : [...portfolio.holdings, holding];
    const snapshotDate = fundNavBySymbol.get(holding.symbol)?.latestDate ?? today();
    const nextSnapshot: PortfolioSnapshot = {
      id: `snap-${holding.id}-${snapshotDate}`,
      holdingId: holding.id,
      date: snapshotDate,
      closePrice: holding.currentPrice,
    };

    await savePortfolio(
      {
        ...portfolio,
        holdings: nextHoldings,
        dailySnapshots: upsertSnapshot(portfolio.dailySnapshots, nextSnapshot),
      },
      exists ? "Holding updated." : "Holding added.",
    );
    setHoldingForm(blankHolding);
  };

  const deleteHolding = async (holdingId: string) => {
    if (!window.confirm("Delete this holding and its daily snapshots?")) return;

    await savePortfolio(
      {
        ...portfolio,
        holdings: portfolio.holdings.filter((holding) => holding.id !== holdingId),
        dailySnapshots: portfolio.dailySnapshots.filter(
          (snapshot) => snapshot.holdingId !== holdingId,
        ),
      },
      "Holding deleted.",
    );
  };

  const applyMarketPrices = async (targetSymbol?: string) => {
    const eligibleHoldings = portfolio.holdings.filter((holding) => {
      const symbol = holding.symbol.toUpperCase();
      return getMarketPrice(symbol, fundNavBySymbol, stockPriceBySymbol) && (!targetSymbol || symbol === targetSymbol);
    });

    if (eligibleHoldings.length === 0) {
      setErrorMessage("No holdings match available fund NAV or stock price data.");
      return;
    }

    const nextHoldings = portfolio.holdings.map((holding) => {
      const symbol = holding.symbol.toUpperCase();
      const price = getMarketPrice(symbol, fundNavBySymbol, stockPriceBySymbol);
      if (!price || (targetSymbol && symbol !== targetSymbol)) {
        return holding;
      }
      return { ...holding, type: price.source, currentPrice: price.latestPrice };
    });

    const nextSnapshots = [...portfolio.dailySnapshots];

    eligibleHoldings.forEach((holding) => {
      const price = getMarketPrice(holding.symbol, fundNavBySymbol, stockPriceBySymbol);
      if (!price) return;

      const latestSnapshot: PortfolioSnapshot = {
        id: `snap-${holding.id}-${price.latestDate}`,
        holdingId: holding.id,
        date: price.latestDate,
        closePrice: price.latestPrice,
      };
      const previousSnapshot: PortfolioSnapshot | null =
        price.previousDate && price.previousPrice !== null
          ? {
              id: `snap-${holding.id}-${price.previousDate}`,
              holdingId: holding.id,
              date: price.previousDate,
              closePrice: price.previousPrice,
            }
          : null;

      const withPrevious = previousSnapshot
        ? upsertSnapshot(nextSnapshots, previousSnapshot)
        : nextSnapshots;
      nextSnapshots.splice(0, nextSnapshots.length, ...upsertSnapshot(withPrevious, latestSnapshot));
    });

    await savePortfolio(
      { ...portfolio, holdings: nextHoldings, dailySnapshots: nextSnapshots },
      targetSymbol
        ? `Synced market price for ${targetSymbol}.`
        : `Synced market prices for ${eligibleHoldings.length} holdings.`,
    );
  };

  const refreshMarketPrices = () => {
    loadFundNav();
    loadStockPrices(stockSymbols);
  };

  const applyWeeklyFundPlan = async () => {
    const executableRows = weeklyFundPlan.filter(
      (row) => row.executionDate && row.nav !== null && row.estimatedUnits > 0,
    );

    if (executableRows.length === 0) {
      setErrorMessage("No weekly fund orders are ready to apply.");
      return;
    }

    let nextSnapshots = [...portfolio.dailySnapshots];
    const nextHoldings = [...portfolio.holdings];

    executableRows.forEach((row) => {
      const existingIndex = nextHoldings.findIndex(
        (holding) => holding.symbol.toUpperCase() === row.symbol.toUpperCase(),
      );

      if (existingIndex >= 0) {
        const existing = nextHoldings[existingIndex];
        const nextQuantity = existing.quantity + row.estimatedUnits;
        const nextAverageCost =
          nextQuantity === 0
            ? row.nav ?? existing.averageCost
            : (existing.averageCost * existing.quantity + row.amount) / nextQuantity;

        nextHoldings[existingIndex] = {
          ...existing,
          type: "fund",
          category: "Quy dau tu",
          quantity: nextQuantity,
          averageCost: nextAverageCost,
          currentPrice: row.nav ?? existing.currentPrice,
        };
      } else {
        const holdingId = createId("hld");
        nextHoldings.push({
          id: holdingId,
          type: "fund",
          symbol: row.symbol,
          name: row.symbol,
          category: "Quy dau tu",
          quantity: row.estimatedUnits,
          averageCost: row.nav ?? 0,
          currentPrice: row.nav ?? 0,
          currency: "VND",
          notes: `Weekly order ${row.executionDate}`,
        });
      }
    });

    executableRows.forEach((row) => {
      const holding = nextHoldings.find(
        (item) => item.symbol.toUpperCase() === row.symbol.toUpperCase(),
      );
      if (!holding || !row.executionDate || row.nav === null) return;

      nextSnapshots = upsertSnapshot(nextSnapshots, {
        id: `snap-${holding.id}-${row.executionDate}`,
        holdingId: holding.id,
        date: row.executionDate,
        closePrice: row.nav,
      });
    });

    await savePortfolio(
      { ...portfolio, holdings: nextHoldings, dailySnapshots: nextSnapshots },
      `Applied ${executableRows.length} weekly fund orders.`,
    );
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Portfolio" />

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Personal investment portfolio
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage funds, stock tickers, daily prices, and profit/loss from local JSON.
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Updated {new Date(portfolio.updatedAt).toLocaleString("vi-VN")}
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-center gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          <CheckCircleIcon className="h-4 w-4" />
          {successMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <StatCard
          label="Market value"
          value={formatCurrency(liveSummary.totalMarketValue)}
          helper={`${portfolio.holdings.length} holdings`}
        />
        <StatCard label="Total cost" value={formatCurrency(liveSummary.totalCost)} />
        <StatCard
          label="Unrealized P/L"
          value={formatCurrency(liveSummary.totalUnrealizedProfitLoss)}
          helper={formatPercent(liveSummary.totalUnrealizedProfitLossPercent)}
          tone={liveSummary.totalUnrealizedProfitLoss >= 0 ? "good" : "bad"}
        />
        <StatCard
          label="Daily P/L"
          value={formatCurrency(liveSummary.totalDailyProfitLoss)}
          helper={formatPercent(liveSummary.totalDailyProfitLossPercent)}
          tone={liveSummary.totalDailyProfitLoss >= 0 ? "good" : "bad"}
        />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Weekly fund auto-invest
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Monday execution plan using the latest Monday NAV from the fund sheet.
            </p>
          </div>
          <button
            type="button"
            onClick={applyWeeklyFundPlan}
            disabled={isSaving || weeklyFundPlanSummary.readyCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Apply this Monday
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            label="Weekly capital"
            value={formatCurrency(weeklyFundPlanSummary.totalAmount)}
            helper="5 fund orders"
          />
          <StatCard
            label="Execution date"
            value={weeklyFundPlanSummary.executionDate ?? "-"}
            helper="Nearest Monday with NAV"
          />
          <StatCard
            label="Ready"
            value={`${weeklyFundPlanSummary.readyCount}/${weeklyFundPlan.length}`}
            helper="Matched fund symbols"
          />
          <StatCard
            label="Estimated units"
            value={formatNumber(weeklyFundPlanSummary.totalEstimatedUnits)}
            helper="Sum across funds"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          {isLoadingFundNav ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading weekly fund plan">
              {[0, 1].map((item) => (
                <div key={item} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : weeklyFundPlan.length === 0 ? (
            <div role="status" className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Weekly plan is not loaded
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Refresh market prices to load Monday fund NAV.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-3">Fund</th>
                  <th className="px-3 py-3 text-right">Capital</th>
                  <th className="px-3 py-3">Execution date</th>
                  <th className="px-3 py-3 text-right">NAV</th>
                  <th className="px-3 py-3 text-right">Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {weeklyFundPlan.map((row) => (
                  <tr key={row.inputSymbol} className="text-gray-700 dark:text-gray-300">
                    <td className="px-3 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {row.symbol}
                      </div>
                      {row.inputSymbol !== row.symbol ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          mapped from {row.inputSymbol}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-4 text-right">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-4">{row.executionDate ?? "-"}</td>
                    <td className="px-3 py-4 text-right">
                      {row.nav === null ? "-" : formatCurrency(row.nav)}
                    </td>
                    <td className="px-3 py-4 text-right">
                      {row.estimatedUnits > 0 ? formatNumber(row.estimatedUnits) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Today&apos;s movement
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Summary from Google Sheet fund NAV and stock prices from the existing stocks API.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={refreshMarketPrices}
              disabled={isLoadingFundNav || isLoadingStockPrices}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              <ArrowDownIcon className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => applyMarketPrices()}
              disabled={isSaving || todayMovements.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Sync market prices
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard
            label="Today P/L"
            value={formatCurrency(todayMovementSummary.total)}
            helper={`${todayMovements.length} matched holdings`}
            tone={todayMovementSummary.total >= 0 ? "good" : "bad"}
          />
          <StatCard label="Up" value={String(todayMovementSummary.up)} helper="Holdings positive" tone="good" />
          <StatCard label="Down" value={String(todayMovementSummary.down)} helper="Holdings negative" tone="bad" />
          <StatCard
            label="Largest move"
            value={todayMovementSummary.largestMove?.holding.symbol ?? "-"}
            helper={
              todayMovementSummary.largestMove
                ? formatCurrency(todayMovementSummary.largestMove.dailyProfitLoss)
                : "No matched fund"
            }
            tone={(todayMovementSummary.largestMove?.dailyProfitLoss ?? 0) >= 0 ? "good" : "bad"}
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          {categoryMovements.length === 0 ? null : (
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-3">Category</th>
                  <th className="px-3 py-3 text-right">Holdings</th>
                  <th className="px-3 py-3 text-right">Value</th>
                  <th className="px-3 py-3 text-right">Today P/L</th>
                  <th className="px-3 py-3">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {categoryMovements.map((row) => {
                  const maxMove = Math.max(
                    ...categoryMovements.map((item) => Math.abs(item.dailyProfitLoss)),
                    1,
                  );
                  const width = Math.max((Math.abs(row.dailyProfitLoss) / maxMove) * 100, 4);
                  const isPositive = row.dailyProfitLoss >= 0;

                  return (
                    <tr key={row.category} className="text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {row.category}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">{row.count}</td>
                      <td className="px-3 py-4 text-right">{formatCurrency(row.marketValue)}</td>
                      <td className="px-3 py-4 text-right">
                        <ProfitBadge
                          value={row.dailyProfitLoss}
                          percent={row.dailyProfitLossPercent}
                        />
                      </td>
                      <td className="min-w-36 px-3 py-4">
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className={`h-2 rounded-full ${isPositive ? "bg-success-500" : "bg-error-500"}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-5 overflow-x-auto">
          {isLoadingFundNav || isLoadingStockPrices ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading market prices">
              {[0, 1].map((item) => (
                <div key={item} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : todayMovements.length === 0 ? (
            <div role="status" className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                No matched market movement yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add a stock symbol such as ACB or a fund symbol such as DCBF, then refresh prices.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-3">Symbol</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3 text-right">Quantity</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Change</th>
                  <th className="px-3 py-3 text-right">Today P/L</th>
                  <th className="px-3 py-3">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {groupedTodayMovements.flatMap((group) => {
                  const maxMove = Math.max(
                    ...todayMovements.map((item) => Math.abs(item.dailyProfitLoss)),
                    1,
                  );

                  return [
                    <tr key={`category-${group.category}`} className="bg-gray-50 dark:bg-white/[0.03]">
                      <td colSpan={5} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        {group.category} · {group.rows.length} holdings · {formatCurrency(group.marketValue)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ProfitBadge value={group.dailyProfitLoss} />
                      </td>
                      <td />
                    </tr>,
                    ...group.rows.map((row) => {
                      const width = Math.max((Math.abs(row.dailyProfitLoss) / maxMove) * 100, 4);
                      const isPositive = row.dailyProfitLoss >= 0;

                      return (
                        <tr key={row.holding.id} className="text-gray-700 dark:text-gray-300">
                          <td className="px-3 py-4">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {row.holding.symbol}
                            </div>
                          </td>
                          <td className="px-3 py-4">{row.price.latestDate}</td>
                          <td className="px-3 py-4 text-right">{formatNumber(row.holding.quantity)}</td>
                          <td className="px-3 py-4 text-right">{formatCurrency(row.price.latestPrice)}</td>
                          <td className="px-3 py-4 text-right">
                            <FundNavBadge value={row.price.change} percent={row.price.changePercent} />
                          </td>
                          <td className="px-3 py-4 text-right">
                            <ProfitBadge value={row.dailyProfitLoss} />
                          </td>
                          <td className="min-w-36 px-3 py-4">
                            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className={`h-2 rounded-full ${isPositive ? "bg-success-500" : "bg-error-500"}`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    }),
                  ];
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Holdings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                CRUD danh muc, quy dau tu, ma chung khoan va tai san khac.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHoldingForm(blankHolding)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              <PlusIcon className="h-4 w-4" />
              New
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading portfolio">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : portfolio.holdings.length === 0 ? (
            <div role="status" className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                No holdings yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add your first fund or ticker to start tracking profit/loss.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Symbol</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-right">Value</th>
                    <th className="px-3 py-3 text-right">P/L</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {liveSummary.holdings.map((holding) => (
                    <tr key={holding.holdingId} className="text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {holding.symbol}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {holding.name}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {holding.type}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">{formatNumber(holding.quantity)}</td>
                      <td className="px-3 py-4 text-right">
                        <div>{formatCurrency(holding.marketValue)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {holding.allocationPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <ProfitBadge
                          value={holding.unrealizedProfitLoss}
                          percent={holding.unrealizedProfitLossPercent}
                        />
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            aria-label={`Edit ${holding.symbol}`}
                            onClick={() => {
                              const original = portfolio.holdings.find(
                                (item) => item.id === holding.holdingId,
                              );
                              if (original) setHoldingForm(toHoldingForm(original));
                            }}
                            className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${holding.symbol}`}
                            onClick={() => deleteHolding(holding.holdingId)}
                            className="rounded-lg border border-error-200 p-2 text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-6 xl:col-span-4">
          <form
            onSubmit={submitHolding}
            className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {holdingForm.id ? "Edit holding" : "Add holding"}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Symbol
                <input
                  value={holdingForm.symbol}
                  onChange={(event) =>
                    setHoldingForm((current) => ({ ...current, symbol: event.target.value }))
                  }
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  placeholder="FPT"
                />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
                <select
                  value={holdingForm.category}
                  onChange={(event) =>
                    setHoldingForm((current) => ({ ...current, category: event.target.value }))
                  }
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={holdingForm.quantity}
                  onChange={(event) =>
                    setHoldingForm((current) => ({ ...current, quantity: event.target.value }))
                  }
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Average cost
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={holdingForm.averageCost}
                  onChange={(event) =>
                    setHoldingForm((current) => ({ ...current, averageCost: event.target.value }))
                  }
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                />
              </label>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                onClick={() => setHoldingForm(blankHolding)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Clear
              </button>
            </div>
          </form>

        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Allocation summary
          </h2>
          <div className="mt-4 space-y-3">
            {liveSummary.categories.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No allocation data.</p>
            ) : (
              liveSummary.categories.map((category) => (
                <div key={category.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {category.category}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {category.allocationPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${Math.min(category.allocationPercent, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Daily portfolio P/L
          </h2>
          <div className="mt-4 overflow-x-auto">
            {dailyPortfolioRows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No daily portfolio data yet. Add a holding or sync market prices.
              </p>
            ) : (
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3 text-right">Value</th>
                    <th className="px-3 py-3 text-right">Total P/L</th>
                    <th className="px-3 py-3 text-right">Day P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {dailyPortfolioRows.slice(0, 8).map((row) => (
                    <tr key={row.date} className="text-gray-700 dark:text-gray-300">
                      <td className="px-3 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{row.date}</div>
                        {row.categorySummary ? (
                          <div className="mt-1 max-w-72 truncate text-xs text-gray-500 dark:text-gray-400">
                            {row.categorySummary}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 text-right">{formatCurrency(row.marketValue)}</td>
                      <td className="px-3 py-4 text-right">
                        <ProfitBadge
                          value={row.unrealizedProfitLoss}
                          percent={row.unrealizedProfitLossPercent}
                        />
                      </td>
                      <td className="px-3 py-4 text-right">
                        <ProfitBadge
                          value={row.dailyProfitLoss}
                          percent={row.dailyProfitLossPercent}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
