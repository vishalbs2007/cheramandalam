const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

dotenv.config();

const saltRounds = 12;

const createTableQueries = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    father_name VARCHAR(120),
    phone VARCHAR(20) NOT NULL,
    alt_phone VARCHAR(20),
    email VARCHAR(120),
    address TEXT,
    city VARCHAR(80),
    state VARCHAR(80),
    pincode VARCHAR(10),
    aadhar_no VARCHAR(20),
    pan_no VARCHAR(20),
    date_of_birth DATE,
    occupation VARCHAR(120),
    nominee_name VARCHAR(120),
    nominee_relation VARCHAR(80),
    nominee_phone VARCHAR(20),
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_no VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    principal_amount DECIMAL(14,2) NOT NULL,
    interest_rate DECIMAL(6,2) NOT NULL,
    interest_type ENUM('flat', 'reducing') NOT NULL,
    tenure_months INT NOT NULL,
    emi_amount DECIMAL(14,2) NOT NULL,
    total_payable DECIMAL(14,2) NOT NULL,
    total_interest DECIMAL(14,2) NOT NULL,
    disbursed_date DATE NOT NULL,
    first_emi_date DATE NOT NULL,
    loan_status ENUM('active', 'closed', 'defaulted') NOT NULL DEFAULT 'active',
    purpose VARCHAR(255),
    guarantor_name VARCHAR(120),
    collateral VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loans_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS loan_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    emi_no INT NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE NULL,
    principal_due DECIMAL(14,2) NOT NULL,
    interest_due DECIMAL(14,2) NOT NULL,
    emi_amount DECIMAL(14,2) NOT NULL,
    amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
    penalty DECIMAL(14,2) NOT NULL DEFAULT 0,
    balance DECIMAL(14,2) NOT NULL DEFAULT 0,
    payment_mode VARCHAR(30) NULL,
    status ENUM('pending', 'paid', 'overdue', 'partial') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loan_payments_loan FOREIGN KEY (loan_id) REFERENCES loans(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS recurring_deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rd_no VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    monthly_amount DECIMAL(14,2) NOT NULL,
    interest_rate DECIMAL(6,2) NOT NULL,
    tenure_months INT NOT NULL,
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    maturity_amount DECIMAL(14,2) NOT NULL,
    total_deposited DECIMAL(14,2) NOT NULL DEFAULT 0,
    rd_status ENUM('active', 'matured', 'premature_closed') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rd_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS rd_installments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rd_id INT NOT NULL,
    installment_no INT NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE NULL,
    amount_due DECIMAL(14,2) NOT NULL,
    amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
    status ENUM('pending', 'paid', 'overdue', 'partial') NOT NULL DEFAULT 'pending',
    payment_mode VARCHAR(30) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rd_installment_rd FOREIGN KEY (rd_id) REFERENCES recurring_deposits(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS fixed_deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fd_no VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    principal_amount DECIMAL(14,2) NOT NULL,
    interest_rate DECIMAL(6,2) NOT NULL,
    compounding ENUM('simple', 'quarterly', 'half_yearly', 'yearly') NOT NULL,
    tenure_months INT NOT NULL,
    deposit_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    maturity_amount DECIMAL(14,2) NOT NULL,
    interest_earned DECIMAL(14,2) NOT NULL,
    fd_status ENUM('active', 'matured', 'closed') NOT NULL DEFAULT 'active',
    payout_type VARCHAR(30) NOT NULL DEFAULT 'on_maturity',
    auto_renew TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fd_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS chit_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(120) NOT NULL,
    chit_value DECIMAL(14,2) NOT NULL,
    monthly_contribution DECIMAL(14,2) NOT NULL,
    total_members INT NOT NULL,
    duration_months INT NOT NULL,
    commission_pct DECIMAL(6,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('upcoming', 'active', 'completed') NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS chit_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chit_group_id INT NOT NULL,
    customer_id INT NOT NULL,
    ticket_no VARCHAR(30) NOT NULL,
    join_date DATE NOT NULL,
    has_received TINYINT(1) NOT NULL DEFAULT 0,
    received_month INT NULL,
    received_amount DECIMAL(14,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_chit_ticket (chit_group_id, ticket_no),
    CONSTRAINT fk_chit_members_group FOREIGN KEY (chit_group_id) REFERENCES chit_groups(id),
    CONSTRAINT fk_chit_members_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS chit_collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chit_group_id INT NOT NULL,
    chit_member_id INT NOT NULL,
    month_no INT NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE NULL,
    amount_due DECIMAL(14,2) NOT NULL,
    amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
    status ENUM('pending', 'paid', 'overdue', 'partial') NOT NULL DEFAULT 'pending',
    payment_mode VARCHAR(30) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chit_collection_group FOREIGN KEY (chit_group_id) REFERENCES chit_groups(id),
    CONSTRAINT fk_chit_collection_member FOREIGN KEY (chit_member_id) REFERENCES chit_members(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS chit_auctions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chit_group_id INT NOT NULL,
    month_no INT NOT NULL,
    auction_date DATE NOT NULL,
    winner_member_id INT NOT NULL,
    bid_amount DECIMAL(14,2) NOT NULL,
    commission DECIMAL(14,2) NOT NULL,
    net_paid_to_winner DECIMAL(14,2) NOT NULL,
    dividend_per_member DECIMAL(14,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_chit_auction (chit_group_id, month_no),
    CONSTRAINT fk_chit_auction_group FOREIGN KEY (chit_group_id) REFERENCES chit_groups(id),
    CONSTRAINT fk_chit_auction_member FOREIGN KEY (winner_member_id) REFERENCES chit_members(id)
  ) ENGINE=InnoDB;`,

  `CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    txn_no VARCHAR(30) NOT NULL UNIQUE,
    txn_type VARCHAR(40) NOT NULL,
    customer_id INT NULL,
    reference_id INT NULL,
    amount DECIMAL(14,2) NOT NULL,
    direction ENUM('credit', 'debit') NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    txn_date DATETIME NOT NULL,
    narration VARCHAR(255),
    done_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_txn_admin FOREIGN KEY (done_by) REFERENCES admins(id)
  ) ENGINE=InnoDB;`
];

const createIndexes = [
  'CREATE INDEX idx_customers_name_phone ON customers(name, phone);',
  'CREATE INDEX idx_loans_customer_status ON loans(customer_id, loan_status);',
  'CREATE INDEX idx_loan_payments_due_status ON loan_payments(due_date, status);',
  'CREATE INDEX idx_rd_status ON recurring_deposits(rd_status);',
  'CREATE INDEX idx_rd_installments_due_status ON rd_installments(due_date, status);',
  'CREATE INDEX idx_fd_maturity_status ON fixed_deposits(maturity_date, fd_status);',
  'CREATE INDEX idx_chit_collection_due_status ON chit_collections(due_date, status);',
  'CREATE INDEX idx_transactions_date ON transactions(txn_date);'
];

const run = async () => {
  let db;

  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    try {
      await db.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
    } catch (error) {
      const permissionErrors = ['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'];
      if (permissionErrors.includes(error.code)) {
        console.log('CREATE DATABASE skipped due to restricted DB permissions; continuing with existing database');
      } else {
        throw error;
      }
    }
    await db.query(`USE \`${process.env.DB_NAME}\`;`);

    for (const query of createTableQueries) {
      await db.query(query);
    }

    for (const query of createIndexes) {
      try {
        await db.query(query);
      } catch (error) {
        if (!String(error.message).includes('Duplicate key name')) {
          throw error;
        }
      }
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.BUSINESS_NAME || 'Finance Admin';

    const [existing] = await db.execute('SELECT id, password FROM admins WHERE email = ? LIMIT 1', [adminEmail]);
    if (!existing.length) {
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      await db.execute(
        'INSERT INTO admins (name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?)',
        [adminName, adminEmail, passwordHash, 'super_admin', 1]
      );
      console.log('Admin user created');
    } else {
      const admin = existing[0];
      const matchesConfiguredPassword = adminPassword
        ? await bcrypt.compare(adminPassword, admin.password)
        : false;

      if (!matchesConfiguredPassword && adminPassword) {
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
        await db.execute(
          'UPDATE admins SET name = ?, password = ?, is_active = 1 WHERE id = ?',
          [adminName, passwordHash, admin.id]
        );
        console.log('Admin credentials synchronized from environment');
      } else {
        await db.execute('UPDATE admins SET name = ?, is_active = 1 WHERE id = ?', [adminName, admin.id]);
        console.log('Admin user already exists');
      }
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('DB init failed:', error.message || error.code || 'Unknown error');
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.errno) {
      console.error('MySQL errno:', error.errno);
    }
    if (error.sqlMessage) {
      console.error('SQL message:', error.sqlMessage);
    }
    if (error.stack) {
      console.error(error.stack);
    }
    process.exitCode = 1;
  } finally {
    if (db) await db.end();
  }
};

run();
