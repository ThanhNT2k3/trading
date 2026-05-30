# Spec: MOS Screener Deep Fundamentals

## Objective
Build a valuation screener that ranks HOSE stocks by margin of safety while using deeper financial data when available. The screener must remain useful with partial data and must not present alerts as personalized investment advice.

## Tech Stack
Next.js App Router, React, TypeScript, Tailwind CSS, server-side CafeF parsing with `cheerio`.

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Lint changed files: `npx eslint src/lib/stocks/mos.ts src/lib/stocks/fundamentals.ts src/app/api/stocks/fundamentals/route.ts src/components/stocks/MOSScreenerPanel.tsx src/components/stocks/StocksDashboard.tsx src/types/stocks.ts`

## Project Structure
- `src/lib/stocks/mos.ts` -> MOS valuation/ranking engine
- `src/lib/stocks/fundamentals.ts` -> CafeF fundamentals parser/fetcher
- `src/app/api/stocks/fundamentals/route.ts` -> server-side fundamentals API
- `src/components/stocks/MOSScreenerPanel.tsx` -> screener, alerts, filters
- `src/components/stocks/StocksDashboard.tsx` -> orchestration and data loading
- `src/types/stocks.ts` -> stock, fundamentals, MOS contracts

## Code Style
```ts
const mosRows = getMOSRankingRows(rows, fundamentalsByTicker);
```

Use pure functions for scoring. Treat financial fields as nullable and lower confidence when data is missing.

## Testing Strategy
Use build and scoped ESLint for the MVP. Parser behavior should be verified with representative CafeF HTML samples before widening coverage.

## Boundaries
- Always: cap external fundamental requests, cache server responses, show missing data explicitly.
- Ask first: adding paid data providers, storing financial snapshots in a database, changing valuation thresholds.
- Never: auto-place trades, hide low-confidence assumptions, present output as guaranteed buy/sell advice.

## Success Criteria
- The dashboard shows a MOS panel with ranking, signals, filters and top alerts.
- The MOS panel only ranks stocks listed on HOSE.
- MOS can use EPS/BVPS from fundamentals instead of only reverse-engineering from PE/PB.
- PE/PB/ROE are derived from fundamentals when they are missing from the market row.
- Growth and debt metrics affect quality/confidence when available.
- Missing cash-flow data is visible as `N/A` rather than fabricated.
