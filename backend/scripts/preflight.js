const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const parseOrigins = (value) => {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
};

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

  const weakSecrets = ['your_secret_key', 'changeme', 'change_me'];
  const jwtSecret = String(process.env.JWT_SECRET || '');
  if (weakSecrets.includes(jwtSecret.toLowerCase()) || jwtSecret.length < 32) {
    console.log('JWT secret check: FAILED');
    console.log('Reason: JWT_SECRET must be at least 32 characters and not a default placeholder');
    process.exitCode = 1;
    return;
  }

  const origins = parseOrigins(process.env.FRONTEND_ORIGIN);
  if (!origins.length || origins.some((origin) => !isValidHttpUrl(origin))) {
    console.log('CORS origin check: FAILED');
    console.log('Reason: FRONTEND_ORIGIN must contain one or more valid http/https origins (comma-separated)');
    process.exitCode = 1;
    return;
  }

  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProduction && !process.env.DB_PASSWORD) {
    console.log('DB password check: FAILED');
    console.log('Reason: DB_PASSWORD must be set in production');
    process.exitCode = 1;
    return;
  }

  if (isProduction && origins.some((origin) => origin.includes('localhost'))) {
    console.log('CORS production check: FAILED');
    console.log('Reason: FRONTEND_ORIGIN cannot point to localhost in production');
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
