/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const force = process.argv.includes('--force');
const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const restoreDb = process.env.RESTORE_DB_NAME || `${process.env.DB_NAME}_restore`;

const findTool = (candidates) => {
  for (const cmd of candidates) {
    const result = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) return cmd;
  }
  return null;
};

const run = async () => {
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Missing env values: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const dumpTool = findTool(['mysqldump', 'mariadb-dump']);
  const mysqlTool = findTool(['mysql', 'mariadb']);

  if (!dumpTool || !mysqlTool) {
    console.error('MySQL/MariaDB client tools not found on PATH.');
    console.error('Install MySQL or MariaDB client tools and re-run this script.');
    process.exitCode = 1;
    return;
  }

  const host = process.env.DB_HOST;
  const port = String(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME;

  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const backupFile = path.join(backupDir, `${dbName}_${stamp}.sql`);

  const env = { ...process.env };
  if (password) env.MYSQL_PWD = password;

  const dumpOut = fs.openSync(backupFile, 'w');
  const dumpArgs = ['-h', host, '-P', port, '-u', user, '--column-statistics=0', dbName];
  const dump = spawnSync(dumpTool, dumpArgs, { env, stdio: ['ignore', dumpOut, 'inherit'] });
  fs.closeSync(dumpOut);

  if (dump.status !== 0) {
    console.error('Backup failed.');
    process.exitCode = 1;
    return;
  }

  console.log(`Backup created: ${backupFile}`);

  const adminConn = await mysql.createConnection({
    host,
    port: Number(port),
    user,
    password
  });

  const [existingRows] = await adminConn.execute(
    'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1',
    [restoreDb]
  );

  if (existingRows.length && !force) {
    console.error(`Restore database already exists: ${restoreDb}`);
    console.error('Re-run with --force to drop and recreate it.');
    await adminConn.end();
    process.exitCode = 1;
    return;
  }

  if (existingRows.length && force) {
    await adminConn.execute(`DROP DATABASE \`${restoreDb}\``);
  }

  await adminConn.execute(`CREATE DATABASE \`${restoreDb}\``);
  await adminConn.end();

  const restoreInput = fs.readFileSync(backupFile);
  const restore = spawnSync(
    mysqlTool,
    ['-h', host, '-P', port, '-u', user, restoreDb],
    { env, input: restoreInput, stdio: ['pipe', 'inherit', 'inherit'] }
  );

  if (restore.status !== 0) {
    console.error('Restore failed.');
    process.exitCode = 1;
    return;
  }

  const verifyConn = await mysql.createConnection({
    host,
    port: Number(port),
    user,
    password,
    database: restoreDb
  });

  const tables = [
    'admins',
    'customers',
    'loans',
    'recurring_deposits',
    'fixed_deposits',
    'chit_groups',
    'transactions'
  ];

  for (const table of tables) {
    const [rows] = await verifyConn.execute(`SELECT COUNT(*) AS count FROM ${table}`);
    console.log(`restore.${table}: ${rows[0].count}`);
  }

  await verifyConn.end();
  console.log('Restore test completed successfully');
};

run().catch((error) => {
  console.error('Restore test failed:', error.message || error);
  process.exitCode = 1;
});
