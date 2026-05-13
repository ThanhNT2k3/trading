# Portfolio Daily Discord Report

The daily report endpoint is:

```text
GET /api/portfolio/daily-report
Authorization: Bearer <secret>
```

Required runtime environment variables:

- `DISCORD_WEBHOOK_URL`
- `PORTFOLIO_REPORT_SECRET`

For Vercel Cron, also set:

- `CRON_SECRET` with the same value as `PORTFOLIO_REPORT_SECRET`

For GitHub Actions fallback, configure:

- Repository Secret: `PORTFOLIO_REPORT_SECRET`
- Repository Variable: `PORTFOLIO_REPORT_URL`

If `PORTFOLIO_REPORT_URL` is not set, the workflow calls:

```text
https://vn2500.azurewebsites.net/api/portfolio/daily-report
```

Vercel Cron can wake a serverless function. For Azure App Service or a sleeping web app, the GitHub Actions schedule acts as an external caller and retries the request.
