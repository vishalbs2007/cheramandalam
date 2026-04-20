const pool = require('../config/db');
const { generateCode } = require('../utils/finance');

const listCustomers = async (req, res) => {
  try {
    const parsedPage = Number.parseInt(req.query.page, 10);
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 10;
    const offset = (page - 1) * limit;
    const searchText = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const search = `%${searchText}%`;

    const [rows] = await pool.execute(
      `SELECT
        c.*,
        (SELECT COUNT(*) FROM loans l WHERE l.customer_id = c.id AND l.loan_status = 'active') AS active_loans,
        (SELECT COUNT(*) FROM recurring_deposits r WHERE r.customer_id = c.id AND r.rd_status = 'active') AS active_rds,
        (SELECT COUNT(*) FROM fixed_deposits f WHERE f.customer_id = c.id AND f.fd_status = 'active') AS active_fds
      FROM customers c
      WHERE c.is_active = 1
        AND (c.name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ?)
      ORDER BY c.id DESC
      LIMIT ${limit} OFFSET ${offset}`,
      [search, search, search]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
      FROM customers c
      WHERE c.is_active = 1
        AND (c.name LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ?)`,
      [search, search, search]
    );

    return res.json({
      data: rows,
      page,
      limit,
      total: countRows[0].total
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const [customerRows] = await pool.execute('SELECT * FROM customers WHERE id = ? LIMIT 1', [id]);
    if (!customerRows.length) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const [loans] = await pool.execute('SELECT * FROM loans WHERE customer_id = ? ORDER BY id DESC', [id]);
    const [rds] = await pool.execute('SELECT * FROM recurring_deposits WHERE customer_id = ? ORDER BY id DESC', [id]);
    const [fds] = await pool.execute('SELECT * FROM fixed_deposits WHERE customer_id = ? ORDER BY id DESC', [id]);
    const [chits] = await pool.execute(
      `SELECT cg.*, cm.ticket_no, cm.has_received, cm.received_month, cm.received_amount
      FROM chit_members cm
      JOIN chit_groups cg ON cg.id = cm.chit_group_id
      WHERE cm.customer_id = ?
      ORDER BY cm.id DESC`,
      [id]
    );
    const [transactions] = await pool.execute(
      'SELECT * FROM transactions WHERE customer_id = ? ORDER BY txn_date DESC LIMIT 100',
      [id]
    );

    return res.json({
      customer: customerRows[0],
      loans,
      recurringDeposits: rds,
      fixedDeposits: fds,
      chits,
      transactions
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch customer', error: error.message });
  }
};

const createCustomer = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [insertResult] = await conn.execute(
      `INSERT INTO customers (
        customer_code, name, father_name, phone, alt_phone, email, address,
        city, state, pincode, aadhar_no, pan_no, date_of_birth, occupation,
        nominee_name, nominee_relation, nominee_phone, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        'TEMP',
        req.body.name,
        req.body.father_name || null,
        req.body.phone,
        req.body.alt_phone || null,
        req.body.email || null,
        req.body.address || null,
        req.body.city || null,
        req.body.state || null,
        req.body.pincode || null,
        req.body.aadhar_no || null,
        req.body.pan_no || null,
        req.body.date_of_birth || null,
        req.body.occupation || null,
        req.body.nominee_name || null,
        req.body.nominee_relation || null,
        req.body.nominee_phone || null
      ]
    );

    const customerCode = generateCode('CUS', insertResult.insertId);
    await conn.execute('UPDATE customers SET customer_code = ? WHERE id = ?', [customerCode, insertResult.insertId]);

    await conn.commit();
    return res.status(201).json({ message: 'Customer created', id: insertResult.insertId, customer_code: customerCode });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to create customer', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute(
      `UPDATE customers SET
        name = ?, father_name = ?, phone = ?, alt_phone = ?, email = ?,
        address = ?, city = ?, state = ?, pincode = ?, aadhar_no = ?, pan_no = ?,
        date_of_birth = ?, occupation = ?, nominee_name = ?, nominee_relation = ?, nominee_phone = ?
      WHERE id = ?`,
      [
        req.body.name,
        req.body.father_name || null,
        req.body.phone,
        req.body.alt_phone || null,
        req.body.email || null,
        req.body.address || null,
        req.body.city || null,
        req.body.state || null,
        req.body.pincode || null,
        req.body.aadhar_no || null,
        req.body.pan_no || null,
        req.body.date_of_birth || null,
        req.body.occupation || null,
        req.body.nominee_name || null,
        req.body.nominee_relation || null,
        req.body.nominee_phone || null,
        id
      ]
    );

    return res.json({ message: 'Customer updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update customer', error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE customers SET is_active = 0 WHERE id = ?', [id]);
    return res.json({ message: 'Customer deactivated' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete customer', error: error.message });
  }
};

module.exports = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
