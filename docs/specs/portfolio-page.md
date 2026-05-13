# Spec: Hidden Portfolio Page

## Objective
Add a hidden admin page at `/portfolio` for managing personal investment holdings. The page must not appear in the sidebar navigation. Users can create, update, and delete holdings, maintain daily price snapshots in a JSON file, and see portfolio summaries for total cost, market value, unrealized profit/loss, and latest daily movement.

## Tech Stack
Next.js App Router, React client components, TypeScript, Tailwind CSS, local JSON persistence through an API route.

## Commands
- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Dev: `npm run dev`

## Project Structure
- `data/portfolio.json` stores editable portfolio data.
- `src/lib/portfolio` contains portfolio types, validation, and summary logic.
- `src/app/api/portfolio/route.ts` reads and writes the JSON file.
- `src/components/portfolio/PortfolioPage.tsx` renders the hidden page UI.
- `src/app/(admin)/(others-pages)/portfolio/page.tsx` exposes `/portfolio`.

## Code Style
```ts
export type PortfolioHolding = {
  id: string;
  type: PortfolioAssetType;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
};
```

Use small typed helpers for calculations, keep UI state local to the page, and preserve the existing dashboard spacing, border, and dark-mode classes.

## Testing Strategy
No unit test runner is configured in this repository. Verify with TypeScript, lint, production build, and manual browser checks for CRUD flows.

## Boundaries
- Always: keep the route hidden from `AppSidebar.tsx`, validate numeric inputs, preserve JSON shape.
- Ask first: adding a database, adding dependencies, syncing live broker/market APIs.
- Never: store secrets or credentials in `data/portfolio.json`.

## Success Criteria
- `/portfolio` loads inside the admin layout.
- Sidebar navigation remains unchanged.
- Holdings can be added, edited, and deleted.
- Daily price snapshots can be saved per holding and date.
- `data/portfolio.json` updates through the API.
- Summary cards reflect total value, cost, unrealized P/L, daily P/L, and allocation.
