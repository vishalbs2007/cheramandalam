const PDFDocument = require('pdfkit');
const pool = require('../config/db');

const getSummary = async (req, res) => {
  try {
    await pool.execute(
      "UPDATE loan_payments SET status = 'overdue' WHERE due_date < CURDATE() AND status IN ('pending','partial')"
    );
    await pool.execute(
      "UPDATE rd_installments SET status = 'overdue' WHERE due_date < CURDATE() AND status IN ('pending','partial')"
    );
    await pool.execute(
      "UPDATE chit_collections SET status = 'overdue' WHERE due_date < CURDATE() AND status IN ('pending','partial')"
    );

    const [[customerCount]] = await pool.execute('SELECT COUNT(*) AS count FROM customers WHERE is_active = 1');
    const [[activeLoans]] = await pool.execute("SELECT COUNT(*) AS count FROM loans WHERE loan_status = 'active'");
    const [[activeRDs]] = await pool.execute("SELECT COUNT(*) AS count FROM recurring_deposits WHERE rd_status = 'active'");
    const [[activeFDs]] = await pool.execute("SELECT COUNT(*) AS count FROM fixed_deposits WHERE fd_status = 'active'");
    const [[activeChits]] = await pool.execute("SELECT COUNT(*) AS count FROM chit_groups WHERE status = 'active'");

    const [[portfolioLoans]] = await pool.execute("SELECT COALESCE(SUM(principal_amount),0) AS total FROM loans WHERE loan_status='active'");
    const [[portfolioRDs]] = await pool.execute("SELECT COALESCE(SUM(total_deposited),0) AS total FROM recurring_deposits WHERE rd_status='active'");
    const [[portfolioFDs]] = await pool.execute("SELECT COALESCE(SUM(principal_amount),0) AS total FROM fixed_deposits WHERE fd_status='active'");

    const [[overdueEmis]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM loan_payments WHERE due_date < CURDATE() AND status != 'paid'"
    );
    const [[overdueRD]] = await pool.execute(
      "SELECT COUNT(*) AS count FROM rd_installments WHERE due_date < CURDATE() AND status != 'paid'"
    );
    const [[maturingFD]] = await pool.execute(
      `SELECT COUNT(*) AS count
       FROM fixed_deposits
       WHERE fd_status = 'active'
         AND maturity_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
    );

    const [[todayLoan]] = await pool.execute(
      "SELECT COALESCE(SUM(amount_paid),0) AS total FROM loan_payments WHERE DATE(paid_date) = CURDATE()"
    );
    const [[todayRD]] = await pool.execute(
      "SELECT COALESCE(SUM(amount_paid),0) AS total FROM rd_installments WHERE DATE(paid_date) = CURDATE()"
    );
    const [[todayChit]] = await pool.execute(
      "SELECT COALESCE(SUM(amount_paid),0) AS total FROM chit_collections WHERE DATE(paid_date) = CURDATE()"
    );

    const todaysCollection = Number(todayLoan.total) + Number(todayRD.total) + Number(todayChit.total);

    return res.json({
      counts: {
        totalCustomers: customerCount.count,
        activeLoans: activeLoans.count,
        activeRDs: activeRDs.count,
        activeFDs: activeFDs.count,
        activeChitGroups: activeChits.count
      },
      portfolio: {
        activeLoanPrincipal: Number(portfolioLoans.total),
        activeRDDeposited: Number(portfolioRDs.total),
        activeFDPrincipal: Number(portfolioFDs.total)
      },
      alerts: {
        overdueEmis: overdueEmis.count,
        overdueRDInstallments: overdueRD.count,
        maturingFDIn30Days: maturingFD.count
      },
      todaysCollection
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch summary', error: error.message });
  }
};

const getRecentTransactions = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*, c.name AS customer_name, c.customer_code, a.name AS done_by_name
       FROM transactions t
       LEFT JOIN customers c ON c.id = t.customer_id
       LEFT JOIN admins a ON a.id = t.done_by
       ORDER BY t.txn_date DESC
       LIMIT 20`
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch recent transactions', error: error.message });
  }
};

const getDueToday = async (req, res) => {
  try {
    const [loanDue] = await pool.execute(
      `SELECT 'loan' AS type, l.loan_no AS ref_no, c.name AS customer_name,
        lp.emi_amount AS amount_due, lp.status, lp.due_date
      FROM loan_payments lp
      JOIN loans l ON l.id = lp.loan_id
      JOIN customers c ON c.id = l.customer_id
      WHERE lp.due_date = CURDATE() AND lp.status != 'paid'`
    );

    const [rdDue] = await pool.execute(
      `SELECT 'rd' AS type, r.rd_no AS ref_no, c.name AS customer_name,
        ri.amount_due AS amount_due, ri.status, ri.due_date
      FROM rd_installments ri
      JOIN recurring_deposits r ON r.id = ri.rd_id
      JOIN customers c ON c.id = r.customer_id
      WHERE ri.due_date = CURDATE() AND ri.status != 'paid'`
    );

    const [chitDue] = await pool.execute(
      `SELECT 'chit' AS type, CONCAT(cg.group_name, ' / ', cm.ticket_no) AS ref_no,
        c.name AS customer_name,
        cc.amount_due AS amount_due, cc.status, cc.due_date
      FROM chit_collections cc
      JOIN chit_members cm ON cm.id = cc.chit_member_id
      JOIN chit_groups cg ON cg.id = cc.chit_group_id
      JOIN customers c ON c.id = cm.customer_id
      WHERE cc.due_date = CURDATE() AND cc.status != 'paid'`
    );

    return res.json([...loanDue, ...rdDue, ...chitDue]);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch due today data', error: error.message });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    const [rows] = await pool.execute(
      `SELECT DATE(txn_date) AS day,
        COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE 0 END),0) AS credits,
        COALESCE(SUM(CASE WHEN direction='debit' THEN amount ELSE 0 END),0) AS debits
      FROM transactions
      WHERE YEAR(txn_date) = ? AND MONTH(txn_date) = ?
      GROUP BY DATE(txn_date)
      ORDER BY DATE(txn_date) ASC`,
      [year, month]
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch monthly report', error: error.message });
  }
};

const exportMonthlyReportPdf = async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    const [rows] = await pool.execute(
      `SELECT DATE(txn_date) AS day,
        COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE 0 END),0) AS credits,
        COALESCE(SUM(CASE WHEN direction='debit' THEN amount ELSE 0 END),0) AS debits
      FROM transactions
      WHERE YEAR(txn_date) = ? AND MONTH(txn_date) = ?
      GROUP BY DATE(txn_date)
      ORDER BY DATE(txn_date) ASC`,
      [year, month]
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="monthly-report-${year}-${month}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).text(`${process.env.BUSINESS_NAME || 'Finance & Chit Report'}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Monthly Collection Report: ${month}/${year}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text('Date', 40, doc.y, { continued: true });
    doc.text('Credits', 200, doc.y, { continued: true });
    doc.text('Debits', 320, doc.y, { continued: true });
    doc.text('Net', 440, doc.y);
    doc.moveDown(0.4);

    let totalCredits = 0;
    let totalDebits = 0;

    rows.forEach((row) => {
      const credits = Number(row.credits);
      const debits = Number(row.debits);
      totalCredits += credits;
      totalDebits += debits;

      doc.text(String(row.day).slice(0, 10), 40, doc.y, { continued: true });
      doc.text(credits.toFixed(2), 200, doc.y, { continued: true });
      doc.text(debits.toFixed(2), 320, doc.y, { continued: true });
      doc.text((credits - debits).toFixed(2), 440, doc.y);
    });

    doc.moveDown();
    doc.fontSize(11).text(`Total Credits: ${totalCredits.toFixed(2)}`);
    doc.text(`Total Debits: ${totalDebits.toFixed(2)}`);
    doc.text(`Net: ${(totalCredits - totalDebits).toFixed(2)}`);

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to export PDF', error: error.message });
  }
};

module.exports = {
  getSummary,
  getRecentTransactions,
  getDueToday,
  getMonthlyReport,
  exportMonthlyReportPdf
};
