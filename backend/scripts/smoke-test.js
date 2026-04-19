/* eslint-disable no-console */
const dotenv = require('dotenv');

dotenv.config();

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const requestedAuthProvider = String(process.env.SMOKE_AUTH_PROVIDER || 'auto').toLowerCase();
const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;

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

const detectAuthProvider = async () => {
  if (requestedAuthProvider === 'jwt' || requestedAuthProvider === 'firebase') {
    return requestedAuthProvider;
  }

  try {
    const probeRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'probe@example.com',
        password: 'invalid-probe-password'
      })
    });

    if (probeRes.status === 400) {
      const probeData = await probeRes.json().catch(() => ({}));
      const message = String(probeData?.message || '').toLowerCase();
      if (message.includes('use firebase sign-in')) {
        return 'firebase';
      }
    }
  } catch (error) {
    // If probing fails, continue with jwt to keep backward compatibility.
  }

  return 'jwt';
};

const run = async () => {
  try {
    const healthRes = await fetch(`${baseUrl}/health`);
    expect(healthRes.ok, 'Health endpoint reachable');

    const authProvider = await detectAuthProvider();
    pass(`Auth mode detected: ${authProvider}`);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@finance.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    let token = '';

    if (authProvider === 'firebase') {
      expect(Boolean(firebaseWebApiKey), 'Firebase web API key configured for smoke test');

      const firebaseLoginRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseWebApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            returnSecureToken: true
          })
        }
      );
      expect(firebaseLoginRes.ok, 'Firebase sign-in successful');

      const firebaseLoginData = await firebaseLoginRes.json();
      token = String(firebaseLoginData.idToken || '');
      expect(Boolean(token), 'Firebase ID token returned');
    } else {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword
        })
      });
      expect(loginRes.ok, 'Login endpoint successful');

      const loginData = await loginRes.json();
      token = String(loginData.token || '');
      expect(Boolean(token), 'JWT token returned');
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
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
