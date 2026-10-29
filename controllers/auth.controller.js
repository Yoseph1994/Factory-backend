const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { ROLE_PERMISSIONS } = require('../middleware/auth');

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-()]/g, '');
}

async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Phone number and password are required.' });
    }

    const cleanPhone = normalizePhone(phone);
    const userRes = await db.query(
      `SELECT * FROM users 
       WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', '') = $1 
          OR phone = $2`,
      [cleanPhone, phone]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password.' });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'User account has been deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid phone number or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const sanitizedUser = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      department: user.department,
      permissions: ROLE_PERMISSIONS[user.role] || []
    };

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}.`,
      user: sanitizedUser,
      token
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
}

function getMe(req, res) {
  return res.json({ success: true, user: req.user });
}

async function getActors(req, res, next) {
  try {
    const users = await db.query('SELECT id, phone, name, role, department FROM users ORDER BY id ASC');
    return res.json({ success: true, actors: users.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  getActors
};
