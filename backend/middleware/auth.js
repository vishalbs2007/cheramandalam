const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getFirebaseAuth, isFirebaseAuthEnabled } = require('../config/firebaseAdmin');

const buildAuthError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const allowedAdminEmails = () => {
  const configured = process.env.ALLOWED_ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  return String(configured)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
};

const findActiveAdmin = async (whereClause, params) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, role, is_active FROM admins WHERE ${whereClause} LIMIT 1`,
    params
  );

  if (!rows.length || !rows[0].is_active) {
    throw buildAuthError(401, 'Admin not found or inactive');
  }

  return rows[0];
};

const verifyJwtToken = async (token) => {
  if (!process.env.JWT_SECRET) {
    throw buildAuthError(500, 'JWT auth is not configured');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw buildAuthError(401, 'Invalid token');
  }

  return findActiveAdmin('id = ?', [decoded.id]);
};

const verifyFirebaseToken = async (token) => {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw buildAuthError(500, 'Firebase auth is not configured');
  }

  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(token, true);
  } catch (error) {
    throw buildAuthError(401, 'Invalid Firebase token');
  }

  const email = String(decoded.email || '').trim().toLowerCase();
  if (!email) {
    throw buildAuthError(401, 'Firebase token missing email');
  }

  const allowedEmails = allowedAdminEmails();
  if (allowedEmails.length && !allowedEmails.includes(email)) {
    throw buildAuthError(403, 'Admin email is not allowed');
  }

  return findActiveAdmin('LOWER(email) = LOWER(?)', [email]);
};

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    req.admin = isFirebaseAuthEnabled()
      ? await verifyFirebaseToken(token)
      : await verifyJwtToken(token);

    next();
  } catch (error) {
    const status = error.status || 401;
    const message = status === 401 ? 'Invalid token' : (error.message || 'Unauthorized');
    return res.status(status).json({ message });
  }
};

module.exports = { protect };
