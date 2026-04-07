/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@finance.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

const fail = (msg, details) => {
  console.error(`FAIL: ${msg}`);
  if (details) console.error(details);
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

const readJson = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

const requestJson = async (url, options) => {
  const res = await fetch(url, options);
  const data = await readJson(res);
  if (!res.ok) {
    return { res, data, error: `HTTP ${res.status} ${res.statusText}` };
  }
  return { res, data };
};

const formatDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'string') return value.slice(0, 10);
  return String(value).slice(0, 10);
};

const addDays = (date, days) => {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
};

const run = async () => {
  try {
    const login = await requestJson(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword })
    });

    expect(login.res.ok, 'Login for business logic tests');
    expect(Boolean(login.data && login.data.token), 'JWT token received');

    const authHeaders = {
      Authorization: `Bearer ${login.data.token}`,
      'Content-Type': 'application/json'
    };

    const phone = `9${String(Date.now()).slice(-9)}`;
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

    const customer = await requestJson(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Test Customer ${stamp}`,
        phone,
        email: `test.${stamp}@example.com`
      })
    });

    if (!customer.res.ok) {
      fail('Customer created', customer);
      return;
    }
    pass('Customer created');

    const customerId = customer.data.id;

    const today = new Date();
    const disbursedDate = formatDate(addDays(today, -60));
    const firstEmiDate = formatDate(addDays(today, -30));

    const loan = await requestJson(`${baseUrl}/api/loans`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customer_id: customerId,
        loan_type: 'business',
        principal_amount: 50000,
        interest_rate: 12,
        interest_type: 'reducing',
        tenure_months: 2,
        disbursed_date: disbursedDate,
        first_emi_date: firstEmiDate,
        purpose: 'Business logic test'
      })
    });

    if (!loan.res.ok) {
      fail('Loan created', loan);
      return;
    }
    pass('Loan created');

    const loanId = loan.data.id;

    const loanDetails = await requestJson(`${baseUrl}/api/loans/${loanId}`, { headers: authHeaders });
    if (!loanDetails.res.ok) {
      fail('Loan details fetched', loanDetails);
      return;
    }
    pass('Loan details fetched');

    const loanSchedule = loanDetails.data.schedule || [];
    expect(loanSchedule.length === 2, 'Loan schedule length equals tenure');

    const lateEmi = await requestJson(`${baseUrl}/api/loans/${loanId}/pay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        emi_no: 1,
        paid_date: formatDate(today)
      })
    });

    if (!lateEmi.res.ok) {
      fail('Late EMI payment recorded', lateEmi);
      return;
    }
    pass('Late EMI payment recorded');
    expect(Number(lateEmi.data.penalty) > 0, 'Late EMI penalty applied');

    const emi2Due = formatDate(
      loanSchedule.find((item) => item.emi_no === 2)?.due_date || addDays(today, 1)
    );

    const emi2 = await requestJson(`${baseUrl}/api/loans/${loanId}/pay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        emi_no: 2,
        paid_date: emi2Due
      })
    });

    if (!emi2.res.ok) {
      fail('Final EMI payment recorded', emi2);
      return;
    }
    pass('Final EMI payment recorded');

    const loanAfter = await requestJson(`${baseUrl}/api/loans/${loanId}`, { headers: authHeaders });
    if (!loanAfter.res.ok) {
      fail('Loan status recheck', loanAfter);
      return;
    }
    pass('Loan status recheck');
    expect(loanAfter.data.loan.loan_status === 'closed', 'Loan auto-closed after final EMI');

    const rd = await requestJson(`${baseUrl}/api/rd`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customer_id: customerId,
        monthly_amount: 3000,
        interest_rate: 7,
        tenure_months: 2,
        start_date: formatDate(addDays(today, -30))
      })
    });

    if (!rd.res.ok) {
      fail('RD created', rd);
      return;
    }
    pass('RD created');

    const rdId = rd.data.id;

    const rdDetails = await requestJson(`${baseUrl}/api/rd/${rdId}`, { headers: authHeaders });
    if (!rdDetails.res.ok) {
      fail('RD details fetched', rdDetails);
      return;
    }
    pass('RD details fetched');

    const rdSchedule = rdDetails.data.schedule || [];
    expect(rdSchedule.length === 2, 'RD schedule length equals tenure');

    const rdPay1 = await requestJson(`${baseUrl}/api/rd/${rdId}/pay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        installment_no: 1,
        paid_date: formatDate(rdSchedule[0]?.due_date || today)
      })
    });

    if (!rdPay1.res.ok) {
      fail('RD installment 1 payment recorded', rdPay1);
      return;
    }
    pass('RD installment 1 payment recorded');

    const rdPay2 = await requestJson(`${baseUrl}/api/rd/${rdId}/pay`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        installment_no: 2,
        paid_date: formatDate(rdSchedule[1]?.due_date || today)
      })
    });

    if (!rdPay2.res.ok) {
      fail('RD installment 2 payment recorded', rdPay2);
      return;
    }
    pass('RD installment 2 payment recorded');

    const rdAfter = await requestJson(`${baseUrl}/api/rd/${rdId}`, { headers: authHeaders });
    if (!rdAfter.res.ok) {
      fail('RD status recheck', rdAfter);
      return;
    }
    pass('RD status recheck');
    expect(rdAfter.data.rd.rd_status === 'matured', 'RD auto-matured after final installment');

    const chitGroup = await requestJson(`${baseUrl}/api/chits`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        group_name: `Test Chit ${stamp}`,
        chit_value: 100000,
        monthly_contribution: 5000,
        total_members: 5,
        duration_months: 3,
        commission_pct: 5,
        start_date: formatDate(addDays(today, -30)),
        status: 'active'
      })
    });

    if (!chitGroup.res.ok) {
      fail('Chit group created', chitGroup);
      return;
    }
    pass('Chit group created');

    const chitId = chitGroup.data.id;

    const member = await requestJson(`${baseUrl}/api/chits/${chitId}/members`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customer_id: customerId,
        ticket_no: `T-${stamp.slice(-4)}`
      })
    });

    if (!member.res.ok) {
      fail('Chit member added', member);
      return;
    }
    pass('Chit member added');

    const memberId = member.data.member_id;

    const chitDetails = await requestJson(`${baseUrl}/api/chits/${chitId}`, { headers: authHeaders });
    if (!chitDetails.res.ok) {
      fail('Chit details fetched', chitDetails);
      return;
    }
    pass('Chit details fetched');

    const memberCollections = (chitDetails.data.collections || []).filter(
      (row) => row.chit_member_id === memberId
    );

    expect(memberCollections.length === 3, 'Chit collections generated for member');

    const auction = await requestJson(`${baseUrl}/api/chits/${chitId}/auction`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        month_no: 1,
        winner_member_id: memberId,
        bid_amount: 20000,
        auction_date: formatDate(today)
      })
    });

    if (!auction.res.ok) {
      fail('Chit auction recorded', auction);
      return;
    }
    pass('Chit auction recorded');

    const chitAfter = await requestJson(`${baseUrl}/api/chits/${chitId}`, { headers: authHeaders });
    if (!chitAfter.res.ok) {
      fail('Chit status recheck', chitAfter);
      return;
    }
    pass('Chit status recheck');

    const winner = (chitAfter.data.members || []).find((row) => row.id === memberId);
    expect(Boolean(winner && Number(winner.has_received) === 1), 'Chit winner marked as received');
    expect(Number(winner.received_month) === 1, 'Chit winner received month recorded');

    console.log('Business logic checks completed successfully');
  } catch (error) {
    fail(error.message);
  }
};

run();
