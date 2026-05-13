import { NextRequest, NextResponse } from "next/server";
import {
  buildDailyPortfolioReport,
  sendDiscordPortfolioReport,
} from "@/lib/portfolio/report";

function isAuthorized(request: NextRequest) {
  const expectedSecrets = [
    process.env.PORTFOLIO_REPORT_SECRET,
    process.env.CRON_SECRET,
  ].filter((secret): secret is string => Boolean(secret));

  if (expectedSecrets.length === 0) return false;

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const querySecret = request.nextUrl.searchParams.get("secret");

  return expectedSecrets.includes(bearer ?? "") || expectedSecrets.includes(querySecret ?? "");
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const shouldSend = request.nextUrl.searchParams.get("send") !== "false";
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (shouldSend) {
      if (!webhookUrl) {
        return NextResponse.json(
          { error: "DISCORD_WEBHOOK_URL is not configured" },
          { status: 500 },
        );
      }

      const report = await sendDiscordPortfolioReport(webhookUrl);
      return NextResponse.json({ sent: true, report });
    }

    const report = await buildDailyPortfolioReport();
    return NextResponse.json({ sent: false, report });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Cannot build or send daily portfolio report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
