# Finance & Chit Fund Management System

Complete full-stack application for finance operations: customers, loans, recurring deposits, fixed deposits, chit groups, auctions, dashboards, and PDF reports.

## Tech Stack

- Frontend: React + Tailwind + React Router v6 + Axios + Recharts + Lucide + react-hot-toast
- Backend: Node.js + Express + MySQL (mysql2)
- Auth: JWT + bcryptjs
- Utilities: dotenv, cors, helmet, express-rate-limit, morgan, moment, uuid, pdfkit

## Project Structure

- backend
  - server.js
  - .env
  - config/db.js
  - middleware/auth.js
  - controllers/
  - routes/index.js
  - utils/finance.js
  - db/init.js
- frontend
  - src/pages/
  - src/components/
  - src/context/AuthContext.jsx
  - src/api/axios.js

## Environment Variables (backend/.env)

Copy from [backend/.env.example](backend/.env.example) and adjust values.

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=finance_chit_db
DB_POOL_SIZE=10
DB_CONNECT_TIMEOUT_MS=10000
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@finance.com
ADMIN_PASSWORD=Admin@123
BUSINESS_NAME=Sri Finance & Chit Funds
FRONTEND_ORIGIN=http://localhost:5173
REQUEST_BODY_LIMIT=1mb
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=600
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
ENABLE_HTTP_LOGGING=true
AUTO_INIT_DB=true
```

## Setup Instructions

### 1. Backend

```bash
cd backend
npm install
npm run preflight
node db/init.js
npm run seed-sample
npm start
```

Backend runs on `http://localhost:5000`.

`npm start` also runs a safe schema/admin bootstrap on startup (configurable with `AUTO_INIT_DB=false`).

Optional workspace-level commands from project root:

```bash
npm install
npm run preflight
npm run init-db
npm start
```

To run backend and frontend together in development mode:

```bash
npm run dev
```

If preflight fails with `ECONNREFUSED`, install/start MySQL server first.

### Windows MySQL/MariaDB Install (Run As Administrator)

Open Windows Terminal as Administrator and run one of these:

```powershell
choco install mariadb.install -y --no-progress
```

or

```powershell
winget install MariaDB.Server
```

Then start service and verify port:

```powershell
Get-Service | Where-Object { $_.Name -match 'maria|mysql' -or $_.DisplayName -match 'MariaDB|MySQL' }
Start-Service MariaDB
Get-NetTCPConnection -LocalPort 3306
```

To run automated API checks (with backend running):

```bash
cd backend
npm run smoke-test
```

For release readiness use [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

### 2. Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env` from [frontend/.env.example](frontend/.env.example) when API base URL differs.

Frontend runs on `http://localhost:5173`.

### 3. Login

Use admin credentials from `.env`:

- Email: `admin@finance.com`
- Password: `Admin@123`

## API Highlights

Base URL: `http://localhost:5000/api`

Operational endpoints: `/health`, `/health/ready`

- Auth: `/auth/login`, `/auth/me`, `/auth/change-password`
- Dashboard: `/dashboard/summary`, `/dashboard/due-today`, `/dashboard/recent-transactions`, `/dashboard/monthly-report`, `/dashboard/monthly-report/pdf`
- Customers: CRUD + soft delete (`is_active=0`)
- Loans: calculate, create with auto EMI schedule, overdue, details, pay EMI with late penalty and auto close
- RD: calculate, create with installments, list/details, pay installment, auto mature
- FD: calculate, list, maturing, create
- Chits: create group, add members with full collection schedule, record collections, auctions and winner handling

## Business Logic Implemented

- Loan creation auto-generates full EMI rows (`loan_payments`)
- Late EMI payment penalty at 2%/month prorated daily
- Last EMI paid auto-updates loan to `closed`
- RD creation auto-generates all installment rows
- All RD installments paid auto-updates RD to `matured`
- Adding chit member auto-generates monthly collection rows
- Chit auction calculates commission/net/dividend and marks winner received
- Dashboard alerts include overdue EMIs, overdue RD installments, and FDs maturing in next 30 days

## Security

- Password hashing with bcrypt (`saltRounds=12`)
- JWT expiry configurable (default 7d)
- JWT protection enabled for all routes except `/auth/login`
- Parameterized SQL queries with mysql2 placeholders
- CORS restricted using `FRONTEND_ORIGIN` (supports comma-separated origins)
- Security headers via `helmet`
- API rate limiting with stricter limits for `/api/auth/login`
- Request body size limits configurable with `REQUEST_BODY_LIMIT`
- Secrets only in backend `.env`

## Notes

- Currency is shown in Indian Rupees using `toLocaleString('en-IN')` in UI.
- Date format used across UI: `DD-MMM-YYYY` via moment.
- Reports page supports backend PDF export endpoint.
