const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const required = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'FRONTEND_ORIGIN'
];

const run = async () => {
  const missing = required.filter((key) => !process.env[key]);

  console.log('=== Backend Preflight ===');
  if (missing.length) {
    console.log('Missing env keys:', missing.join(', '));
    process.exitCode = 1;
    return;
  }

  console.log('Env check: OK');

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    await conn.query('SELECT 1 AS ok');
    console.log(`DB connectivity: OK (${process.env.DB_HOST}:${process.env.DB_PORT})`);
  } catch (error) {
    console.log('DB connectivity: FAILED');
    console.log('Reason:', error.message || error.code || 'Unknown error');
    if (error.code) console.log('Code:', error.code);
    process.exitCode = 1;
    return;
  } finally {
    if (conn) await conn.end();
  }

  console.log('Preflight passed. Next steps:');
  console.log('1) npm run init-db');
  console.log('2) npm start');
};

run();
