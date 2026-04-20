/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const apply = process.argv.includes('--apply');

const mergeIds = (...lists) => {
  return [...new Set(lists.flat().filter(Boolean))];
};

const getIds = async (conn, sql, params) => {
  const [rows] = await conn.execute(sql, params);
  return rows.map((row) => row.id);
};

const buildInClause = (column, ids, params) => {
  const placeholders = ids.map(() => '?').join(', ');
  params.push(...ids);
  return `${column} IN (${placeholders})`;
};

const getIdsWhereIn = async (conn, table, column, ids, extraClause, extraParams = []) => {
  if (!ids.length) return [];
  const params = [];
  const clause = buildInClause(column, ids, params);
  const sql = extraClause
    ? `SELECT id FROM ${table} WHERE ${clause} AND ${extraClause}`
    : `SELECT id FROM ${table} WHERE ${clause}`;
  params.push(...extraParams);
  const [rows] = await conn.execute(sql, params);
  return rows.map((row) => row.id);
};

const countWhereIn = async (conn, table, column, ids) => {
  if (!ids.length) return 0;
  const params = [];
  const clause = buildInClause(column, ids, params);
  const [rows] = await conn.execute(`SELECT COUNT(*) AS count FROM ${table} WHERE ${clause}`, params);
  return rows[0].count;
};

const countChitCollections = async (conn, groupIds, memberIds) => {
  if (!groupIds.length && !memberIds.length) return 0;
  const clauses = [];
  const params = [];
  if (groupIds.length) {
    clauses.push(buildInClause('chit_group_id', groupIds, params));
  }
  if (memberIds.length) {
    clauses.push(buildInClause('chit_member_id', memberIds, params));
  }
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS count FROM chit_collections WHERE ${clauses.join(' OR ')}`,
    params
  );
  return rows[0].count;
};

const countChitAuctions = async (conn, groupIds, memberIds) => {
  if (!groupIds.length && !memberIds.length) return 0;
  const clauses = [];
  const params = [];
  if (groupIds.length) {
    clauses.push(buildInClause('chit_group_id', groupIds, params));
  }
  if (memberIds.length) {
    clauses.push(buildInClause('winner_member_id', memberIds, params));
  }
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS count FROM chit_auctions WHERE ${clauses.join(' OR ')}`,
    params
  );
  return rows[0].count;
};

const deleteWhereIn = async (conn, table, column, ids) => {
  if (!ids.length) return 0;
  const params = [];
  const clause = buildInClause(column, ids, params);
  const [result] = await conn.execute(`DELETE FROM ${table} WHERE ${clause}`, params);
  return result.affectedRows || 0;
};

const deleteChitCollections = async (conn, groupIds, memberIds) => {
  if (!groupIds.length && !memberIds.length) return 0;
  const clauses = [];
  const params = [];
  if (groupIds.length) {
    clauses.push(buildInClause('chit_group_id', groupIds, params));
  }
  if (memberIds.length) {
    clauses.push(buildInClause('chit_member_id', memberIds, params));
  }
  const [result] = await conn.execute(
    `DELETE FROM chit_collections WHERE ${clauses.join(' OR ')}`,
    params
  );
  return result.affectedRows || 0;
};

const deleteChitAuctions = async (conn, groupIds, memberIds) => {
  if (!groupIds.length && !memberIds.length) return 0;
  const clauses = [];
  const params = [];
  if (groupIds.length) {
    clauses.push(buildInClause('chit_group_id', groupIds, params));
  }
  if (memberIds.length) {
    clauses.push(buildInClause('winner_member_id', memberIds, params));
  }
  const [result] = await conn.execute(
    `DELETE FROM chit_auctions WHERE ${clauses.join(' OR ')}`,
    params
  );
  return result.affectedRows || 0;
};

const run = async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME
    });

    const testCustomerIds = await getIds(
      conn,
      "SELECT id FROM customers WHERE name LIKE 'Test Customer %' AND email LIKE 'test.%@example.com'",
      []
    );

    const sampleCustomerIds = await getIds(
      conn,
      "SELECT id FROM customers WHERE customer_code IN ('CUS900001','CUS900002') OR email LIKE '%.sample@finance.local'",
      []
    );

    const customerIds = mergeIds(testCustomerIds, sampleCustomerIds);

    const testLoanIds = await getIdsWhereIn(
      conn,
      'loans',
      'customer_id',
      testCustomerIds,
      'purpose = ?',
      ['Business logic test']
    );

    const sampleLoanIds = await getIds(
      conn,
      "SELECT id FROM loans WHERE loan_no IN ('LON900001')",
      []
    );

    const loanIds = mergeIds(testLoanIds, sampleLoanIds);

    const customerRdIds = await getIdsWhereIn(conn, 'recurring_deposits', 'customer_id', customerIds);
    const sampleRdIds = await getIds(
      conn,
      "SELECT id FROM recurring_deposits WHERE rd_no IN ('RD900001')",
      []
    );
    const rdIds = mergeIds(customerRdIds, sampleRdIds);

    const customerFdIds = await getIdsWhereIn(conn, 'fixed_deposits', 'customer_id', customerIds);
    const sampleFdIds = await getIds(
      conn,
      "SELECT id FROM fixed_deposits WHERE fd_no IN ('FD900001')",
      []
    );
    const fdIds = mergeIds(customerFdIds, sampleFdIds);

    const testChitGroupIds = await getIds(
      conn,
      "SELECT id FROM chit_groups WHERE group_name LIKE 'Test Chit %'",
      []
    );

    const sampleChitGroupIds = await getIds(
      conn,
      "SELECT id FROM chit_groups WHERE group_name = 'Sample Chit A'",
      []
    );

    const chitGroupIds = mergeIds(testChitGroupIds, sampleChitGroupIds);

    const chitMemberIdsFromGroups = await getIdsWhereIn(conn, 'chit_members', 'chit_group_id', chitGroupIds);
    const chitMemberIdsFromCustomers = await getIdsWhereIn(conn, 'chit_members', 'customer_id', customerIds);
    const chitMemberIds = mergeIds(chitMemberIdsFromGroups, chitMemberIdsFromCustomers);

    const counts = {
      customers: customerIds.length,
      loans: loanIds.length,
      loanPayments: await countWhereIn(conn, 'loan_payments', 'loan_id', loanIds),
      rds: rdIds.length,
      rdInstallments: await countWhereIn(conn, 'rd_installments', 'rd_id', rdIds),
      fds: fdIds.length,
      chitGroups: chitGroupIds.length,
      chitMembers: chitMemberIds.length,
      chitCollections: await countChitCollections(conn, chitGroupIds, chitMemberIds),
      chitAuctions: await countChitAuctions(conn, chitGroupIds, chitMemberIds),
      transactions: await countWhereIn(conn, 'transactions', 'customer_id', customerIds)
    };

    console.log('=== Cleanup Test Data ===');
    console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
    Object.entries(counts).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });

    if (!apply) {
      console.log('Dry-run only. Re-run with --apply to delete.');
      return;
    }

    await conn.beginTransaction();

    const deleted = {
      transactions: await deleteWhereIn(conn, 'transactions', 'customer_id', customerIds),
      loanPayments: await deleteWhereIn(conn, 'loan_payments', 'loan_id', loanIds),
      loans: await deleteWhereIn(conn, 'loans', 'id', loanIds),
      rdInstallments: await deleteWhereIn(conn, 'rd_installments', 'rd_id', rdIds),
      rds: await deleteWhereIn(conn, 'recurring_deposits', 'id', rdIds),
      fds: await deleteWhereIn(conn, 'fixed_deposits', 'id', fdIds),
      chitCollections: await deleteChitCollections(conn, chitGroupIds, chitMemberIds),
      chitAuctions: await deleteChitAuctions(conn, chitGroupIds, chitMemberIds),
      chitMembers: await deleteWhereIn(conn, 'chit_members', 'id', chitMemberIds),
      chitGroups: await deleteWhereIn(conn, 'chit_groups', 'id', chitGroupIds),
      customers: await deleteWhereIn(conn, 'customers', 'id', customerIds)
    };

    await conn.commit();

    console.log('Deleted rows:');
    Object.entries(deleted).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('Cleanup failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
};

run();
