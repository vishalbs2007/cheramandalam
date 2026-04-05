const dotenv = require('dotenv');
const pool = require('../config/db');
const { generateEMISchedule } = require('../utils/finance');

dotenv.config();

const ensureCustomer = async (conn, payload) => {
  const [rows] = await conn.execute('SELECT id FROM customers WHERE customer_code = ? LIMIT 1', [payload.customer_code]);
  if (rows.length) return rows[0].id;

  const [result] = await conn.execute(
    `INSERT INTO customers (
      customer_code, name, father_name, phone, alt_phone, email, address,
      city, state, pincode, occupation, nominee_name, nominee_relation, nominee_phone, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      payload.customer_code,
      payload.name,
      payload.father_name,
      payload.phone,
      payload.alt_phone,
      payload.email,
      payload.address,
      payload.city,
      payload.state,
      payload.pincode,
      payload.occupation,
      payload.nominee_name,
      payload.nominee_relation,
      payload.nominee_phone
    ]
  );

  return result.insertId;
};

const ensureLoan = async (conn, customerId) => {
  const [rows] = await conn.execute('SELECT id FROM loans WHERE loan_no = ? LIMIT 1', ['LON900001']);
  if (rows.length) return rows[0].id;

  const [insert] = await conn.execute(
    `INSERT INTO loans (
      loan_no, customer_id, loan_type, principal_amount, interest_rate, interest_type,
      tenure_months, emi_amount, total_payable, total_interest, disbursed_date,
      first_emi_date, loan_status, purpose, guarantor_name, collateral
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    [
      'LON900001',
      customerId,
      'business',
      300000,
      12,
      'reducing',
      24,
      14122.44,
      338938.56,
      38938.56,
      '2026-04-01',
      '2026-05-01',
      'Working capital',
      'R Kumar',
      'Vehicle hypothecation'
    ]
  );

  const schedule = generateEMISchedule({
    principal: 300000,
    rate: 12,
    months: 24,
    interestType: 'reducing',
    firstEmiDate: '2026-05-01'
  });

  for (const item of schedule) {
    await conn.execute(
      `INSERT INTO loan_payments (
        loan_id, emi_no, due_date, principal_due, interest_due, emi_amount,
        amount_paid, penalty, balance, payment_mode, status
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, NULL, 'pending')`,
      [insert.insertId, item.emi_no, item.due_date, item.principal_due, item.interest_due, item.emi_amount, item.balance]
    );
  }

  return insert.insertId;
};

const ensureRD = async (conn, customerId) => {
  const [rows] = await conn.execute('SELECT id FROM recurring_deposits WHERE rd_no = ? LIMIT 1', ['RD900001']);
  if (rows.length) return rows[0].id;

  const [insert] = await conn.execute(
    `INSERT INTO recurring_deposits (
      rd_no, customer_id, monthly_amount, interest_rate, tenure_months,
      start_date, maturity_date, maturity_amount, total_deposited, rd_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    ['RD900001', customerId, 5000, 7, 24, '2026-04-01', '2028-03-01', 128354.5, 0]
  );

  for (let i = 1; i <= 24; i += 1) {
    await conn.execute(
      `INSERT INTO rd_installments (
        rd_id, installment_no, due_date, amount_due, amount_paid, status, payment_mode
      ) VALUES (?, ?, DATE_ADD('2026-04-01', INTERVAL ? MONTH), 5000, 0, 'pending', NULL)`,
      [insert.insertId, i, i - 1]
    );
  }

  return insert.insertId;
};

const ensureFD = async (conn, customerId) => {
  const [rows] = await conn.execute('SELECT id FROM fixed_deposits WHERE fd_no = ? LIMIT 1', ['FD900001']);
  if (rows.length) return rows[0].id;

  const [insert] = await conn.execute(
    `INSERT INTO fixed_deposits (
      fd_no, customer_id, principal_amount, interest_rate, compounding, tenure_months,
      deposit_date, maturity_date, maturity_amount, interest_earned,
      fd_status, payout_type, auto_renew
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'on_maturity', 0)`,
    ['FD900001', customerId, 200000, 7.5, 'quarterly', 24, '2026-04-01', '2028-04-01', 232044.33, 32044.33]
  );

  return insert.insertId;
};

const ensureChit = async (conn, customerId) => {
  const [groupRows] = await conn.execute('SELECT id FROM chit_groups WHERE group_name = ? LIMIT 1', ['Sample Chit A']);
  let groupId;

  if (groupRows.length) {
    groupId = groupRows[0].id;
  } else {
    const [groupInsert] = await conn.execute(
      `INSERT INTO chit_groups (
        group_name, chit_value, monthly_contribution, total_members,
        duration_months, commission_pct, start_date, end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      ['Sample Chit A', 500000, 25000, 20, 20, 5, '2026-04-01', '2027-11-01']
    );
    groupId = groupInsert.insertId;
  }

  const [memberRows] = await conn.execute(
    'SELECT id FROM chit_members WHERE chit_group_id = ? AND customer_id = ? LIMIT 1',
    [groupId, customerId]
  );

  if (memberRows.length) return groupId;

  const [memberInsert] = await conn.execute(
    `INSERT INTO chit_members (
      chit_group_id, customer_id, ticket_no, join_date, has_received
    ) VALUES (?, ?, ?, ?, 0)`,
    [groupId, customerId, 'T-001', '2026-04-01']
  );

  for (let monthNo = 1; monthNo <= 20; monthNo += 1) {
    await conn.execute(
      `INSERT INTO chit_collections (
        chit_group_id, chit_member_id, month_no, due_date, amount_due, amount_paid, status, payment_mode
      ) VALUES (?, ?, ?, DATE_ADD('2026-04-01', INTERVAL ? MONTH), 25000, 0, 'pending', NULL)`,
      [groupId, memberInsert.insertId, monthNo, monthNo - 1]
    );
  }

  return groupId;
};

const run = async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const customerA = await ensureCustomer(conn, {
      customer_code: 'CUS900001',
      name: 'Arun Prakash',
      father_name: 'Prakash',
      phone: '9000001001',
      alt_phone: '9000001002',
      email: 'arun.sample@finance.local',
      address: '12 North Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001',
      occupation: 'Trader',
      nominee_name: 'Kavya',
      nominee_relation: 'Spouse',
      nominee_phone: '9000001999'
    });

    const customerB = await ensureCustomer(conn, {
      customer_code: 'CUS900002',
      name: 'Meena Devi',
      father_name: 'Suresh',
      phone: '9000002001',
      alt_phone: '9000002002',
      email: 'meena.sample@finance.local',
      address: '44 Lake Road',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
      occupation: 'Teacher',
      nominee_name: 'Anu',
      nominee_relation: 'Daughter',
      nominee_phone: '9000002999'
    });

    await ensureLoan(conn, customerA);
    await ensureRD(conn, customerA);
    await ensureFD(conn, customerB);
    await ensureChit(conn, customerB);

    await conn.commit();
    console.log('Sample seed data inserted successfully');
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Sample seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (conn) conn.release();
  }
};

run();
