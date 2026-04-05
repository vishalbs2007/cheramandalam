const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const {
  calcFlatLoanEMI,
  calcReducingLoanEMI,
  generateEMISchedule,
  calcPenalty,
  generateCode
} = require('../utils/finance');

const getLoanCalc = (payload) => {
  const principal = Number(payload.principal_amount);
  const rate = Number(payload.interest_rate);
  const months = Number(payload.tenure_months);
  const type = payload.interest_type;

  if (type === 'flat') return calcFlatLoanEMI(principal, rate, months);
  return calcReducingLoanEMI(principal, rate, months);
};

const calculateLoan = async (req, res) => {
  try {
    const calc = getLoanCalc(req.body);
    const schedule = generateEMISchedule({
      principal: Number(req.body.principal_amount),
      rate: Number(req.body.interest_rate),
      months: Number(req.body.tenure_months),
      interestType: req.body.interest_type,
      firstEmiDate: req.body.first_emi_date || moment().format('YYYY-MM-DD')
    });

    return res.json({ ...calc, schedule });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to calculate loan', error: error.message });
  }
};

const getOverdueLoans = async (req, res) => {
  try {
    await pool.execute(
      "UPDATE loan_payments SET status = 'overdue' WHERE due_date < CURDATE() AND status IN ('pending','partial')"
    );

    const [rows] = await pool.execute(
      `SELECT lp.*, l.loan_no, c.name AS customer_name, c.customer_code
       FROM loan_payments lp
       JOIN loans l ON l.id = lp.loan_id
       JOIN customers c ON c.id = l.customer_id
       WHERE lp.status = 'overdue'
       ORDER BY lp.due_date ASC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch overdue EMIs', error: error.message });
  }
};

const listLoans = async (req, res) => {
  try {
    await pool.execute(
      "UPDATE loan_payments SET status = 'overdue' WHERE due_date < CURDATE() AND status IN ('pending','partial')"
    );

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];

    if (req.query.customer_id) {
      filters.push('l.customer_id = ?');
      params.push(req.query.customer_id);
    }

    if (req.query.status && req.query.status !== 'overdue') {
      filters.push('l.loan_status = ?');
      params.push(req.query.status);
    }

    if (req.query.status === 'overdue') {
      filters.push(`EXISTS (
        SELECT 1 FROM loan_payments x
        WHERE x.loan_id = l.id AND x.status = 'overdue'
      )`);
    }

    if (req.query.search) {
      filters.push('(l.loan_no LIKE ? OR c.name LIKE ? OR c.customer_code LIKE ?)');
      const search = `%${req.query.search}%`;
      params.push(search, search, search);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT l.*, c.name AS customer_name, c.customer_code,
        (SELECT COUNT(*) FROM loan_payments lp WHERE lp.loan_id = l.id AND lp.status = 'overdue') AS overdue_count
      FROM loans l
      JOIN customers c ON c.id = l.customer_id
      ${whereClause}
      ORDER BY l.id DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
      FROM loans l
      JOIN customers c ON c.id = l.customer_id
      ${whereClause}`,
      params
    );

    return res.json({
      data: rows,
      page,
      limit,
      total: countRows[0].total
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch loans', error: error.message });
  }
};

const getLoanById = async (req, res) => {
  try {
    const { id } = req.params;

    const [loanRows] = await pool.execute(
      `SELECT l.*, c.name AS customer_name, c.customer_code, c.phone
       FROM loans l
       JOIN customers c ON c.id = l.customer_id
       WHERE l.id = ? LIMIT 1`,
      [id]
    );

    if (!loanRows.length) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    await pool.execute(
      "UPDATE loan_payments SET status = 'overdue' WHERE loan_id = ? AND due_date < CURDATE() AND status IN ('pending','partial')",
      [id]
    );

    const [schedule] = await pool.execute(
      'SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY emi_no ASC',
      [id]
    );

    return res.json({ loan: loanRows[0], schedule });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch loan', error: error.message });
  }
};

const createLoan = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const calc = getLoanCalc(req.body);

    const [insertResult] = await conn.execute(
      `INSERT INTO loans (
        loan_no, customer_id, loan_type, principal_amount, interest_rate,
        interest_type, tenure_months, emi_amount, total_payable, total_interest,
        disbursed_date, first_emi_date, loan_status, purpose, guarantor_name, collateral
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        'TEMP',
        req.body.customer_id,
        req.body.loan_type,
        req.body.principal_amount,
        req.body.interest_rate,
        req.body.interest_type,
        req.body.tenure_months,
        calc.emi,
        calc.totalPayable,
        calc.totalInterest,
        req.body.disbursed_date,
        req.body.first_emi_date,
        req.body.purpose || null,
        req.body.guarantor_name || null,
        req.body.collateral || null
      ]
    );

    const loanNo = generateCode('LON', insertResult.insertId);
    await conn.execute('UPDATE loans SET loan_no = ? WHERE id = ?', [loanNo, insertResult.insertId]);

    const schedule = generateEMISchedule({
      principal: Number(req.body.principal_amount),
      rate: Number(req.body.interest_rate),
      months: Number(req.body.tenure_months),
      interestType: req.body.interest_type,
      firstEmiDate: req.body.first_emi_date
    });

    for (const item of schedule) {
      await conn.execute(
        `INSERT INTO loan_payments (
          loan_id, emi_no, due_date, principal_due, interest_due, emi_amount,
          amount_paid, penalty, balance, payment_mode, status
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, NULL, 'pending')`,
        [
          insertResult.insertId,
          item.emi_no,
          item.due_date,
          item.principal_due,
          item.interest_due,
          item.emi_amount,
          item.balance
        ]
      );
    }

    const txnNo = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
    await conn.execute(
      `INSERT INTO transactions (
        txn_no, txn_type, customer_id, reference_id, amount, direction,
        payment_mode, txn_date, narration, done_by
      ) VALUES (?, 'loan_disbursement', ?, ?, ?, 'debit', ?, NOW(), ?, ?)`,
      [
        txnNo,
        req.body.customer_id,
        insertResult.insertId,
        req.body.principal_amount,
        req.body.payment_mode || 'bank_transfer',
        `Loan disbursed ${loanNo}`,
        req.admin.id
      ]
    );

    await conn.commit();
    return res.status(201).json({ message: 'Loan created', id: insertResult.insertId, loan_no: loanNo });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to create loan', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const payLoanEmi = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const paidDate = req.body.paid_date || moment().format('YYYY-MM-DD');

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [loanRows] = await conn.execute('SELECT * FROM loans WHERE id = ? LIMIT 1', [id]);
    if (!loanRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Loan not found' });
    }

    let paymentRow;
    if (req.body.emi_no) {
      const [rows] = await conn.execute(
        `SELECT * FROM loan_payments
         WHERE loan_id = ? AND emi_no = ?
         LIMIT 1`,
        [id, req.body.emi_no]
      );
      paymentRow = rows[0];
    } else {
      const [rows] = await conn.execute(
        `SELECT * FROM loan_payments
         WHERE loan_id = ? AND status IN ('pending','overdue','partial')
         ORDER BY emi_no ASC LIMIT 1`,
        [id]
      );
      paymentRow = rows[0];
    }

    if (!paymentRow) {
      await conn.rollback();
      return res.status(400).json({ message: 'No due EMI found' });
    }

    const dueDate = moment(paymentRow.due_date);
    const payDate = moment(paidDate);
    const daysLate = Math.max(payDate.diff(dueDate, 'days'), 0);
    const outstanding = Number(paymentRow.emi_amount) - Number(paymentRow.amount_paid);
    const penalty = daysLate > 0
      ? calcPenalty({ overdueAmount: outstanding, daysLate, penaltyRatePerMonth: 2 })
      : 0;

    const expectedNow = outstanding + penalty;
    const amountPaidNow = Number(req.body.amount || expectedNow);
    const totalPaid = Number(paymentRow.amount_paid) + amountPaidNow;
    const status = totalPaid >= Number(paymentRow.emi_amount) + penalty ? 'paid' : 'partial';

    await conn.execute(
      `UPDATE loan_payments SET
        paid_date = ?,
        amount_paid = ?,
        penalty = ?,
        payment_mode = ?,
        status = ?
      WHERE id = ?`,
      [
        paidDate,
        totalPaid,
        penalty,
        req.body.payment_mode || 'cash',
        status,
        paymentRow.id
      ]
    );

    const txnNo = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
    await conn.execute(
      `INSERT INTO transactions (
        txn_no, txn_type, customer_id, reference_id, amount, direction,
        payment_mode, txn_date, narration, done_by
      ) VALUES (?, 'loan_emi_payment', ?, ?, ?, 'credit', ?, NOW(), ?, ?)`,
      [
        txnNo,
        loanRows[0].customer_id,
        paymentRow.id,
        amountPaidNow,
        req.body.payment_mode || 'cash',
        `EMI ${paymentRow.emi_no} paid for ${loanRows[0].loan_no}`,
        req.admin.id
      ]
    );

    const [pendingRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM loan_payments
       WHERE loan_id = ? AND status != 'paid'`,
      [id]
    );

    if (pendingRows[0].cnt === 0) {
      await conn.execute("UPDATE loans SET loan_status = 'closed' WHERE id = ?", [id]);
    }

    await conn.commit();

    return res.json({
      message: 'EMI payment recorded',
      penalty,
      daysLate,
      amountPaid: amountPaidNow
    });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to record EMI payment', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  calculateLoan,
  getOverdueLoans,
  listLoans,
  getLoanById,
  createLoan,
  payLoanEmi
};
