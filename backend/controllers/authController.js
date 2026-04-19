const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { isFirebaseAuthEnabled } = require('../config/firebaseAdmin');

const signToken = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const login = async (req, res) => {
  try {
    if (isFirebaseAuthEnabled()) {
      return res.status(400).json({ message: 'Use Firebase sign-in from frontend when AUTH_PROVIDER=firebase' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, password, role, is_active FROM admins WHERE email = ? LIMIT 1',
      [email]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(admin);
    return res.json({
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login', error: error.message });
  }
};

const me = async (req, res) => {
  try {
    return res.json({ admin: req.admin });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    if (isFirebaseAuthEnabled()) {
      return res.status(400).json({ message: 'Password changes are managed in Firebase Auth' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const [rows] = await pool.execute('SELECT password FROM admins WHERE id = ? LIMIT 1', [req.admin.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.execute('UPDATE admins SET password = ? WHERE id = ?', [hash, req.admin.id]);

    return res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to change password', error: error.message });
  }
};

module.exports = {
  login,
  me,
  changePassword
};
