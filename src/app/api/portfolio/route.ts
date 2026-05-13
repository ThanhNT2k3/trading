import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { normalizePortfolioData, summarizePortfolio } from "@/lib/portfolio";
import type { PortfolioData } from "@/lib/portfolio";

const PORTFOLIO_FILE = path.join(process.cwd(), "data", "portfolio.json");

async function readPortfolioFile() {
  const raw = await fs.readFile(PORTFOLIO_FILE, "utf8");
  return normalizePortfolioData(JSON.parse(raw) as Partial<PortfolioData>);
}

async function writePortfolioFile(data: PortfolioData) {
  await fs.mkdir(path.dirname(PORTFOLIO_FILE), { recursive: true });
  await fs.writeFile(PORTFOLIO_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function GET() {
  try {
    const portfolio = await readPortfolioFile();

    return NextResponse.json({
      portfolio,
      summary: summarizePortfolio(portfolio),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cannot read portfolio data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PortfolioData>;
    const portfolio = normalizePortfolioData({
      holdings: body.holdings,
      dailySnapshots: body.dailySnapshots,
      updatedAt: new Date().toISOString(),
    });

    await writePortfolioFile(portfolio);

    return NextResponse.json({
      portfolio,
      summary: summarizePortfolio(portfolio),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cannot save portfolio data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
