# Production Handover

## Deployment Status

- Frontend: Netlify
- Backend: Render Web Service
- Database: Managed MySQL-compatible database

## Live Endpoints

- Frontend URL: https://aesthetic-kelpie-ef565f.netlify.app
- Backend URL: https://cheramandalam-finance.onrender.com
- Health: https://cheramandalam-finance.onrender.com/health
- Readiness: https://cheramandalam-finance.onrender.com/health/ready

## Configuration Ownership

- Do not store production secrets in repository files.
- Set all production environment variables only in Netlify and Render dashboards.
- Rotate secrets directly in platform dashboards, then redeploy.

## Backend Environment Checklist (Render)

Required keys:

- NODE_ENV=production
- PORT=10000 (or value provided by Render)
- DB_HOST
- DB_PORT
- DB_USER
- DB_PASSWORD
- DB_NAME
- DB_POOL_SIZE
- DB_CONNECT_TIMEOUT_MS
- JWT_SECRET
- JWT_EXPIRES_IN
- ADMIN_EMAIL
- ADMIN_PASSWORD
- BUSINESS_NAME
- FRONTEND_ORIGIN=https://aesthetic-kelpie-ef565f.netlify.app
- REQUEST_BODY_LIMIT
- API_RATE_LIMIT_WINDOW_MS
- API_RATE_LIMIT_MAX
- AUTH_RATE_LIMIT_WINDOW_MS
- AUTH_RATE_LIMIT_MAX
- ENABLE_HTTP_LOGGING=true
- AUTO_INIT_DB=true

Notes:

- Keep JWT_SECRET at least 32 characters.
- DB credentials must match your managed database service.
- FRONTEND_ORIGIN can be comma-separated for multiple allowed domains.

## Frontend Environment Checklist (Netlify)

Required key:

- VITE_API_URL=https://cheramandalam-finance.onrender.com/api

## Go-Live Verification

Run after every deploy:

1. Check backend liveness:

```bash
curl -sS https://cheramandalam-finance.onrender.com/health
```

2. Check backend readiness:

```bash
curl -sS https://cheramandalam-finance.onrender.com/health/ready
```

3. Run smoke test from local machine:

```bash
SMOKE_BASE_URL=https://cheramandalam-finance.onrender.com npm --prefix backend run smoke-test
```

4. Manual UI checks:
- Login
- Dashboard cards and charts
- Customers/Loans/RD/FD/Chits/Reports pages
- PDF export from Reports

## Rollback Plan

### Backend rollback (Render)

1. Open Render service.
2. Go to Events.
3. Select last known-good deploy.
4. Click Rollback.
5. Re-run health and readiness checks.

### Frontend rollback (Netlify)

1. Open Netlify site.
2. Go to Deploys.
3. Select last known-good production deploy.
4. Publish deploy.

### Database rollback

1. Restore latest known-good SQL backup to recovery database.
2. Validate schema and key table counts.
3. Promote restored database credentials in Render env.
4. Redeploy backend and re-run smoke test.

## Incident Response Quick Steps

- If login fails:
  - Check Render logs for auth errors.
  - Confirm ADMIN_EMAIL and ADMIN_PASSWORD env values.
  - Confirm DB connectivity and table presence through readiness endpoint.
- If frontend cannot call backend:
  - Confirm FRONTEND_ORIGIN in Render matches Netlify URL.
  - Confirm VITE_API_URL in Netlify points to backend /api.
- If API is down:
  - Check /health and /health/ready.
  - Roll back backend deploy if needed.

## Release Operations

- Follow and update RELEASE_CHECKLIST.md per release.
- Keep daily backups and regular restore drills.
- Review logs and metrics daily for first week after each major release.

## Nightly Production Smoke Checks

GitHub Actions workflow file:

- .github/workflows/nightly-prod-smoke.yml

This workflow runs nightly and can also be run manually from the Actions tab.

### One-time setup

In GitHub repository settings:

1. Settings -> Secrets and variables -> Actions -> Secrets:
  - Add PROD_SMOKE_ADMIN_EMAIL
  - Add PROD_SMOKE_ADMIN_PASSWORD
2. Optional: Settings -> Secrets and variables -> Actions -> Variables:
  - Add PROD_SMOKE_BASE_URL if you want a URL other than the default production URL.
  - Add PROD_SMOKE_FIREBASE_API_KEY when production backend AUTH_PROVIDER is set to firebase.

### Failure alerting

- On failure, the workflow creates or updates an open issue titled:
  [Alert] Nightly production smoke test failed
- This issue includes the workflow run link for quick triage.

### Notification recommendation

- In GitHub notifications/watch settings for this repository, enable Actions notifications so failed runs are visible immediately.

## Weekly Business Logic Regression

GitHub Actions workflow file:

- .github/workflows/weekly-business-logic-regression.yml

This workflow runs weekly on Monday at 03:00 UTC and can be run manually.

### What it covers

- Creates customer, loan, RD, and chit test records through API routes.
- Validates penalty, auto-close, auto-mature, and chit winner business rules.
- Cleans up generated test records automatically at the end.

### Failure alerting

- On failure, the workflow creates or updates an issue titled:
  [Alert] Weekly business logic regression failed
- Attached workflow artifacts include backend, regression, and cleanup logs.

## Monthly Platform Health Report

GitHub Actions workflow file:

- .github/workflows/monthly-platform-health-report.yml

This workflow runs monthly on day 1 at 04:00 UTC and can also be run manually.

### Report format

Each monthly report issue includes:

- Executive Summary table with pass/fail status for:
  - Production Smoke Suite
  - Business Logic Regression Suite
  - Overall Platform Health
- Scope Covered section listing validated areas.
- Evidence section with artifact names.
- Action Guidance section for failed and passed outcomes.

### Publication behavior

- Creates or updates issue title:
  [Report] Monthly Platform Health Report - YYYY-MM
- Uploads report markdown artifact:
  monthly-platform-health-report
- Uploads suite logs via existing job artifacts.

### Failure behavior

- If any suite fails, workflow exits with failure after publishing report.
- Use the report issue + artifacts as the triage entry point.
