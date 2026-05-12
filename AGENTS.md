# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 admin dashboard using React 19, TypeScript, and Tailwind CSS v4. Application routes live in `src/app`, including grouped layouts such as `src/app/(admin)` and `src/app/(full-width-pages)`. Reusable UI belongs in `src/components`, grouped by feature (`stocks`, `auth`, `ecommerce`, `charts`, etc.). Shared hooks are in `src/hooks`, context providers in `src/context`, types in `src/types`, and stock data logic in `src/lib/stocks`. Public assets live in `public/images`; SVG icons and exports live in `src/icons`.

## Build, Test, and Development Commands

- `npm install`: install dependencies. Use Node.js 18+; Node.js 20+ is recommended by the upstream template.
- `npm run dev`: start the local Next.js development server.
- `npm run build`: create a production build and run Next.js/TypeScript checks.
- `npm run start`: serve the production build after `npm run build`.
- `npm run lint`: run ESLint across the repository.

No test script is currently defined in `package.json`; use `npm run lint` and `npm run build` as the required verification steps before submitting changes.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Keep component filenames in PascalCase, such as `StockRatingCard.tsx`, and hooks in camelCase beginning with `use`, such as `useStocksCached.ts`. Prefer the `@/*` path alias for imports from `src`. Keep Tailwind classes inline for styling, and let `prettier-plugin-tailwindcss` sort class names. ESLint uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.

## Testing Guidelines

There is no dedicated test framework or coverage threshold in this repository yet. When adding tests, colocate them near the module under test or use a clear `__tests__` folder, and name files with `.test.ts` or `.test.tsx`. For UI or stock analytics changes, include manual verification notes in the pull request and run `npm run lint` plus `npm run build`.

## Commit & Pull Request Guidelines

Recent history uses short imperative commits and occasional Conventional Commit prefixes, for example `feat: add detailed sector stock scraping...` or `update README.md...`. Prefer `feat:`, `fix:`, `chore:`, or `docs:`. Pull requests should include a summary, linked issue when applicable, screenshots for UI changes, and build/lint results. Call out changes to stock data fetching, scraping, or external API assumptions explicitly.

## Security & Configuration Tips

Do not commit secrets, API keys, or local environment files. Keep network scraping and market-data logic isolated in `src/lib/stocks`, and document any new external data source, rate limit, or required environment variable in the PR.
