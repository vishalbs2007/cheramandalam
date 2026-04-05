# Release Checklist

## Infrastructure

- [ ] MariaDB/MySQL server installed and set to auto start as Windows service
- [ ] Port `3306` listening locally
- [ ] Backend `.env` configured for production values
- [ ] Frontend `.env` configured with correct `VITE_API_URL`

## Backend Validation

- [ ] `npm run preflight` passes
- [ ] `npm run init-db` completes successfully
- [ ] `npm run seed-sample` (optional sample data) completes
- [ ] `npm run smoke-test` passes with backend running
- [ ] `npm start` runs without runtime errors

## Frontend Validation

- [ ] `npm run build` passes
- [ ] Login page loads and authenticates successfully
- [ ] Dashboard summary, due today, chart, and transactions render
- [ ] Customers, Loans, RD, FD, Chits, Reports pages load without console errors
- [ ] PDF export works from Reports page

## Security

- [ ] JWT secret replaced from default
- [ ] Admin default password changed after first login
- [ ] CORS origin restricted to final frontend origin
- [ ] DB user privileges limited for production

## Business Logic Spot Checks

- [ ] Loan creation generates full EMI schedule
- [ ] Late EMI adds prorated penalty
- [ ] Final EMI closes loan automatically
- [ ] RD creation generates full installment schedule
- [ ] Final RD installment marks RD matured
- [ ] Chit member add generates monthly collections
- [ ] Chit auction marks winner as received

## Operational

- [ ] Daily database backup plan documented
- [ ] Error logs monitored
- [ ] Restore test performed on backup
