const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
  return { accessToken, refreshToken };
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query(
      `SELECT id, email, password_hash, full_name, phone, role, partner_id, partner_type, 
              is_active, is_verified, permissions, preferences 
       FROM system_users WHERE email = ?`,
      [email]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    // Check lock
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(423).json({ success: false, error: 'Account is temporarily locked. Try again later.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Increment login attempts
      await db.query(
        'UPDATE system_users SET login_attempts = login_attempts + 1, lock_until = IF(login_attempts >= 4, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NULL) WHERE id = ?',
        [user.id]
      );
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Reset login attempts and update last login
    await db.query(
      'UPDATE system_users SET login_attempts = 0, lock_until = NULL, last_login = NOW() WHERE id = ?',
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), user.id, refreshToken, expiresAt]
    );

    // Audit log
    await db.query(
      'INSERT INTO audit_logs (user_id, action, table_name, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [user.id, 'LOGIN', 'system_users', req.ip, req.get('User-Agent') || '']
    );

    let permissions = [];
    let preferences = {};
    try { permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || []; } catch(e) { permissions = []; }
    try { preferences = typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences || {}; } catch(e) { preferences = {}; }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          partner_id: user.partner_id,
          partner_type: user.partner_type,
          permissions,
          preferences
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const [tokens] = await db.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW()',
      [refreshToken, decoded.userId]
    );

    if (!tokens.length) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    await db.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);

    const newTokens = generateTokens(decoded.userId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), decoded.userId, newTokens.refreshToken, expiresAt]
    );

    res.json({ success: true, data: newTokens });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: req.user });
};
