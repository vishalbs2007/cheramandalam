/* eslint-disable no-console */
const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5000';

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
};

const pass = (msg) => {
  console.log(`PASS: ${msg}`);
};

const expect = (condition, msg) => {
  if (!condition) {
    fail(msg);
    throw new Error(msg);
  }
  pass(msg);
};

const run = async () => {
  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    expect(healthRes.ok, 'Health endpoint reachable');

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@finance.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123'
      })
    });
    expect(loginRes.ok, 'Login endpoint successful');

    const loginData = await loginRes.json();
    expect(Boolean(loginData.token), 'JWT token returned');

    const authHeaders = {
      Authorization: `Bearer ${loginData.token}`,
      'Content-Type': 'application/json'
    };

    const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders });
    expect(meRes.ok, 'Protected /auth/me endpoint successful');

    const summaryRes = await fetch(`${baseUrl}/api/dashboard/summary`, { headers: authHeaders });
    expect(summaryRes.ok, 'Dashboard summary endpoint successful');

    const calcLoanRes = await fetch(`${baseUrl}/api/loans/calculate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        principal_amount: 100000,
        interest_rate: 12,
        interest_type: 'reducing',
        tenure_months: 12,
        first_emi_date: '2026-05-01'
      })
    });
    expect(calcLoanRes.ok, 'Loan calculator endpoint successful');

    const calcRdRes = await fetch(`${baseUrl}/api/rd/calculate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        monthly_amount: 5000,
        interest_rate: 7,
        tenure_months: 24
      })
    });
    expect(calcRdRes.ok, 'RD calculator endpoint successful');

    const calcFdRes = await fetch(`${baseUrl}/api/fd/calculate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        principal_amount: 200000,
        interest_rate: 7.5,
        tenure_months: 24,
        compounding: 'quarterly'
      })
    });
    expect(calcFdRes.ok, 'FD calculator endpoint successful');

    const pdfRes = await fetch(
      `${baseUrl}/api/dashboard/monthly-report/pdf?year=2026&month=4`,
      { headers: authHeaders }
    );
    expect(pdfRes.ok, 'PDF report endpoint successful');

    console.log('Smoke test completed successfully');
  } catch (error) {
    fail(error.message);
  }
};

run();
