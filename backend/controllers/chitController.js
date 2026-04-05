const moment = require('moment');
const pool = require('../config/db');
const { calcChitAuction, addMonths } = require('../utils/finance');

const listChits = async (req, res) => {
  try {
    const where = req.query.status ? 'WHERE cg.status = ?' : '';
    const params = req.query.status ? [req.query.status] : [];

    const [rows] = await pool.execute(
      `SELECT cg.*,
        (SELECT COUNT(*) FROM chit_members cm WHERE cm.chit_group_id = cg.id) AS joined_members
      FROM chit_groups cg
      ${where}
      ORDER BY cg.id DESC`,
      params
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch chit groups', error: error.message });
  }
};

const getChitById = async (req, res) => {
  try {
    const { id } = req.params;

    const [groupRows] = await pool.execute('SELECT * FROM chit_groups WHERE id = ? LIMIT 1', [id]);
    if (!groupRows.length) {
      return res.status(404).json({ message: 'Chit group not found' });
    }

    const [members] = await pool.execute(
      `SELECT cm.*, c.name AS customer_name, c.customer_code
      FROM chit_members cm
      JOIN customers c ON c.id = cm.customer_id
      WHERE cm.chit_group_id = ?
      ORDER BY cm.ticket_no ASC`,
      [id]
    );

    const [auctions] = await pool.execute(
      `SELECT ca.*, cm.ticket_no, c.name AS winner_name
      FROM chit_auctions ca
      JOIN chit_members cm ON cm.id = ca.winner_member_id
      JOIN customers c ON c.id = cm.customer_id
      WHERE ca.chit_group_id = ?
      ORDER BY ca.month_no ASC`,
      [id]
    );

    const [collections] = await pool.execute(
      `SELECT cc.*, cm.ticket_no, c.name AS customer_name
      FROM chit_collections cc
      JOIN chit_members cm ON cm.id = cc.chit_member_id
      JOIN customers c ON c.id = cm.customer_id
      WHERE cc.chit_group_id = ?
      ORDER BY cc.month_no ASC, cm.ticket_no ASC`,
      [id]
    );

    return res.json({
      group: groupRows[0],
      members,
      auctions,
      collections
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch chit details', error: error.message });
  }
};

const createChit = async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const endDate = addMonths(req.body.start_date, Number(req.body.duration_months) - 1);

    const [insertResult] = await conn.execute(
      `INSERT INTO chit_groups (
        group_name, chit_value, monthly_contribution, total_members,
        duration_months, commission_pct, start_date, end_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.body.group_name,
        req.body.chit_value,
        req.body.monthly_contribution,
        req.body.total_members,
        req.body.duration_months,
        req.body.commission_pct,
        req.body.start_date,
        endDate,
        req.body.status || 'upcoming'
      ]
    );

    await conn.commit();
    return res.status(201).json({ message: 'Chit group created', id: insertResult.insertId });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to create chit group', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const addChitMember = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [groupRows] = await conn.execute('SELECT * FROM chit_groups WHERE id = ? LIMIT 1', [id]);
    if (!groupRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Chit group not found' });
    }

    const group = groupRows[0];

    const [memberInsert] = await conn.execute(
      `INSERT INTO chit_members (
        chit_group_id, customer_id, ticket_no, join_date, has_received
      ) VALUES (?, ?, ?, ?, 0)`,
      [id, req.body.customer_id, req.body.ticket_no, req.body.join_date || moment().format('YYYY-MM-DD')]
    );

    for (let monthNo = 1; monthNo <= group.duration_months; monthNo += 1) {
      const dueDate = addMonths(group.start_date, monthNo - 1);
      await conn.execute(
        `INSERT INTO chit_collections (
          chit_group_id, chit_member_id, month_no, due_date,
          amount_due, amount_paid, status, payment_mode
        ) VALUES (?, ?, ?, ?, ?, 0, 'pending', NULL)`,
        [id, memberInsert.insertId, monthNo, dueDate, group.monthly_contribution]
      );
    }

    await conn.commit();
    return res.status(201).json({ message: 'Member added and collection schedule generated', member_id: memberInsert.insertId });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to add chit member', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const recordChitCollection = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT cc.*, cm.customer_id
      FROM chit_collections cc
      JOIN chit_members cm ON cm.id = cc.chit_member_id
      WHERE cc.chit_group_id = ? AND cc.chit_member_id = ? AND cc.month_no = ?
      LIMIT 1`,
      [id, req.body.chit_member_id, req.body.month_no]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Collection row not found' });
    }

    const row = rows[0];
    const amountPaidNow = Number(req.body.amount || row.amount_due);
    const totalPaid = Number(row.amount_paid) + amountPaidNow;
    const status = totalPaid >= Number(row.amount_due) ? 'paid' : 'partial';

    await conn.execute(
      `UPDATE chit_collections
      SET paid_date = ?, amount_paid = ?, status = ?, payment_mode = ?
      WHERE id = ?`,
      [
        req.body.paid_date || moment().format('YYYY-MM-DD'),
        totalPaid,
        status,
        req.body.payment_mode || 'cash',
        row.id
      ]
    );

    await conn.commit();
    return res.json({ message: 'Chit collection recorded', amountPaid: amountPaidNow });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to record collection', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const recordChitAuction = async (req, res) => {
  let conn;
  try {
    const { id } = req.params;
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [groupRows] = await conn.execute('SELECT * FROM chit_groups WHERE id = ? LIMIT 1', [id]);
    if (!groupRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Chit group not found' });
    }

    const group = groupRows[0];

    const auctionCalc = calcChitAuction({
      chitValue: Number(group.chit_value),
      commissionPct: Number(group.commission_pct),
      bidAmount: Number(req.body.bid_amount),
      totalMembers: Number(group.total_members)
    });

    const [insertResult] = await conn.execute(
      `INSERT INTO chit_auctions (
        chit_group_id, month_no, auction_date, winner_member_id,
        bid_amount, commission, net_paid_to_winner, dividend_per_member
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.body.month_no,
        req.body.auction_date || moment().format('YYYY-MM-DD'),
        req.body.winner_member_id,
        req.body.bid_amount,
        auctionCalc.commission,
        auctionCalc.netToWinner,
        auctionCalc.dividendPerMember
      ]
    );

    await conn.execute(
      `UPDATE chit_members
      SET has_received = 1, received_month = ?, received_amount = ?
      WHERE id = ?`,
      [req.body.month_no, auctionCalc.netToWinner, req.body.winner_member_id]
    );

    await conn.commit();
    return res.status(201).json({
      message: 'Auction recorded',
      id: insertResult.insertId,
      ...auctionCalc
    });
  } catch (error) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: 'Failed to record auction', error: error.message });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  listChits,
  getChitById,
  createChit,
  addChitMember,
  recordChitCollection,
  recordChitAuction
};
