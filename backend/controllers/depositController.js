const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const {
  calcRDMaturity,
  generateRDSchedule,
  calcFDMaturity,
  addMonths,
  generateCode
} = require('../utils/finance');

const calculateRD = async (req, res) => {
  try {
    const monthlyAmount = Number(req.body.monthly_amount);
    const rate = Number(req.body.interest_rate);
    const tenure = Number(req.body.tenure_months);
    const maturityAmount = calcRDMaturity(monthlyAmount, rate, tenure);

    return res.json({
      maturityAmount,
      totalDeposited: Number((monthlyAmount * tenure).toFixed(2))
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to calculate RD', error: error.message });
  }
};

const listRD = async (req, res) => {
  try {
    const filters = [];
    const params = [];

    if (req.query.customer_id) {
      filters.push('r.customer_id = ?');
      params.push(req.query.customer_id);
    }

    if (req.query.status) {
      filters.push('r.rd_status = ?');
      params.push(req.query.status);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT r.*, c.name AS customer_name, c.customer_code,
        (SELECT COUNT(*) FROM rd_installments i WHERE i.rd_id = r.id AND i.status = 'overdue') AS overdue_count
      FROM recurring_deposits r
      JOIN customers c ON c.id = r.customer_id
      ${whereClause}
      ORDER BY r.id DESC`,
      params
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch RDs', error: error.message });
  }
};

const getRDById = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      "UPDATE rd_installments SET status = 'overdue' WHERE rd_id = ? AND due_date < CURDATE() AND status IN ('pending','partial')",
      [id]
    );

    const [rdRows] = await pool.execute(
      `SELECT r.*, c.name AS customer_name, c.customer_code
      FROM recurring_deposits r
      JOIN customers c ON c.id = r.customer_id
      WHERE r.id = ? LIMIT 1`,
      [id]
    );

    if (!rdRows.length) {
      return res.status(404).json({ message: 'RD not found' });
    }

    const [schedule] = await pool.execute(
      'SELECT * FROM rd_installments WHERE rd_id = ? ORDER BY installment_no ASC',
      [id]
    );

    return res.json({ rd: rdRows[0], schedule });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch RD', error: error.message });
  }
};

const createRD = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const monthlyAmount = Number(req.body.monthly_amount);
    const interestRate = Number(req.body.interest_rate);
    const tenureMonths = Number(req.body.tenure_months);
    const maturityAmount = calcRDMaturity(monthlyAmount, interestRate, tenureMonths);
    const maturityDate = addMonths(req.body.start_date, tenureMonths - 1);

    const [insertResult] = await conn.execute(
      `INSERT INTO recurring_deposits (
        rd_no, customer_id, monthly_amount, interest_rate, tenure_months,
        start_date, maturity_date, maturity_amount, total_deposited, rd_status
      ) VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, 0, 'active')`,
      [req.body.customer_id, monthlyAmount, interestRate, tenureMonths, req.body.start_date, maturityDate, maturityAmount]
    );

    const rdNo = generateCode('RD', insertResult.insertId);
    await conn.execute('UPDATE recurring_deposits SET rd_no = ? WHERE id = ?', [rdNo, insertResult.insertId]);

    const schedule = generateRDSchedule({
      startDate: req.body.start_date,
      tenureMonths,
      monthlyAmount
    });

    for (const item of schedule) {
      await conn.execute(
        `INSERT INTO rd_installments (
          rd_id, installment_no, due_date, amount_due, amount_paid, status, payment_mode
        ) VALUES (?, ?, ?, ?, 0, 'pending', NULL)`,
        [insertResult.insertId, item.installment_no, item.due_date, item.amount_due]
      );
    }

    await conn.commit();
    return res.status(201).json({ message: 'RD created', id: insertResult.insertId, rd_no: rdNo });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to create RD', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const payRDInstallment = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    const paidDate = req.body.paid_date || moment().format('YYYY-MM-DD');

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rdRows] = await conn.execute('SELECT * FROM recurring_deposits WHERE id = ? LIMIT 1', [id]);
    if (!rdRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'RD not found' });
    }

    let row;
    if (req.body.installment_no) {
      const [rows] = await conn.execute(
        'SELECT * FROM rd_installments WHERE rd_id = ? AND installment_no = ? LIMIT 1',
        [id, req.body.installment_no]
      );
      row = rows[0];
    } else {
      const [rows] = await conn.execute(
        `SELECT * FROM rd_installments
         WHERE rd_id = ? AND status IN ('pending','overdue','partial')
         ORDER BY installment_no ASC LIMIT 1`,
        [id]
      );
      row = rows[0];
    }

    if (!row) {
      await conn.rollback();
      return res.status(400).json({ message: 'No due installment found' });
    }

    const payAmount = Number(req.body.amount || row.amount_due);
    const totalPaid = Number(row.amount_paid) + payAmount;
    const status = totalPaid >= Number(row.amount_due) ? 'paid' : 'partial';

    await conn.execute(
      `UPDATE rd_installments
      SET paid_date = ?, amount_paid = ?, status = ?, payment_mode = ?
      WHERE id = ?`,
      [paidDate, totalPaid, status, req.body.payment_mode || 'cash', row.id]
    );

    await conn.execute(
      'UPDATE recurring_deposits SET total_deposited = total_deposited + ? WHERE id = ?',
      [payAmount, id]
    );

    const txnNo = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
    await conn.execute(
      `INSERT INTO transactions (
        txn_no, txn_type, customer_id, reference_id, amount, direction,
        payment_mode, txn_date, narration, done_by
      ) VALUES (?, 'rd_installment_payment', ?, ?, ?, 'credit', ?, NOW(), ?, ?)`,
      [
        txnNo,
        rdRows[0].customer_id,
        row.id,
        payAmount,
        req.body.payment_mode || 'cash',
        `RD installment ${row.installment_no} paid for ${rdRows[0].rd_no}`,
        req.admin.id
      ]
    );

    const [pendingRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM rd_installments
       WHERE rd_id = ? AND status != 'paid'`,
      [id]
    );

    if (pendingRows[0].cnt === 0) {
      await conn.execute("UPDATE recurring_deposits SET rd_status = 'matured' WHERE id = ?", [id]);
    }

    await conn.commit();
    return res.json({ message: 'RD payment recorded', amountPaid: payAmount });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to record RD payment', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const calculateFD = async (req, res) => {
  try {
    const result = calcFDMaturity({
      principal: Number(req.body.principal_amount),
      rate: Number(req.body.interest_rate),
      tenureMonths: Number(req.body.tenure_months),
      compounding: req.body.compounding
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to calculate FD', error: error.message });
  }
};

const getMaturingFD = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);
    const [rows] = await pool.execute(
      `SELECT fd.*, c.name AS customer_name, c.customer_code,
        DATEDIFF(fd.maturity_date, CURDATE()) AS days_to_maturity
      FROM fixed_deposits fd
      JOIN customers c ON c.id = fd.customer_id
      WHERE fd.fd_status = 'active'
        AND fd.maturity_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY fd.maturity_date ASC`,
      [days]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch maturing FDs', error: error.message });
  }
};

const listFD = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT fd.*, c.name AS customer_name, c.customer_code,
        DATEDIFF(fd.maturity_date, CURDATE()) AS days_to_maturity
      FROM fixed_deposits fd
      JOIN customers c ON c.id = fd.customer_id
      ORDER BY fd.id DESC`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch FDs', error: error.message });
  }
};

const createFD = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const result = calcFDMaturity({
      principal: Number(req.body.principal_amount),
      rate: Number(req.body.interest_rate),
      tenureMonths: Number(req.body.tenure_months),
      compounding: req.body.compounding
    });

    const maturityDate = addMonths(req.body.deposit_date, Number(req.body.tenure_months));

    const [insertResult] = await conn.execute(
      `INSERT INTO fixed_deposits (
        fd_no, customer_id, principal_amount, interest_rate, compounding,
        tenure_months, deposit_date, maturity_date, maturity_amount,
        interest_earned, fd_status, payout_type, auto_renew
      ) VALUES ('TEMP', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        req.body.customer_id,
        req.body.principal_amount,
        req.body.interest_rate,
        req.body.compounding,
        req.body.tenure_months,
        req.body.deposit_date,
        maturityDate,
        result.maturityAmount,
        result.interestEarned,
        req.body.payout_type || 'on_maturity',
        req.body.auto_renew ? 1 : 0
      ]
    );

    const fdNo = generateCode('FD', insertResult.insertId);
    await conn.execute('UPDATE fixed_deposits SET fd_no = ? WHERE id = ?', [fdNo, insertResult.insertId]);

    const txnNo = `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
    await conn.execute(
      `INSERT INTO transactions (
        txn_no, txn_type, customer_id, reference_id, amount, direction,
        payment_mode, txn_date, narration, done_by
      ) VALUES (?, 'fd_deposit', ?, ?, ?, 'credit', ?, NOW(), ?, ?)`,
      [
        txnNo,
        req.body.customer_id,
        insertResult.insertId,
        req.body.principal_amount,
        req.body.payment_mode || 'bank_transfer',
        `FD created ${fdNo}`,
        req.admin.id
      ]
    );

    await conn.commit();
    return res.status(201).json({ message: 'FD created', id: insertResult.insertId, fd_no: fdNo });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to create FD', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  calculateRD,
  listRD,
  getRDById,
  createRD,
  payRDInstallment,
  calculateFD,
  getMaturingFD,
  listFD,
  createFD
};
