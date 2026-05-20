const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const conds = []; const vals = [];
    if (role)   { conds.push('role = ?'); vals.push(role); }
    if (search) { conds.push('(full_name LIKE ? OR email LIKE ?)'); vals.push(`%${search}%`, `%${search}%`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT id, full_name AS name, email, phone, role, is_active, is_verified,
              last_login, created_at,
              (transaction_pin_hash IS NOT NULL) AS has_transaction_pin
       FROM system_users ${where} ORDER BY created_at DESC`,
      vals
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name AS name, email, phone, role, is_active, is_verified,
              last_login, created_at,
              (transaction_pin_hash IS NOT NULL) AS has_transaction_pin
       FROM system_users WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ success: false, error: 'Missing fields' });
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `INSERT INTO system_users (id, email, password_hash, full_name, phone, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      [id, email, hash, name, phone || null, role]
    );
    res.status(201).json({ success: true, data: { id, name, email, role, phone } });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, email, role, phone, is_active, password } = req.body;
    const updates = []; const values = [];
    if (name !== undefined)      { updates.push('full_name = ?'); values.push(name); }
    if (email !== undefined)     { updates.push('email = ?');     values.push(email); }
    if (phone !== undefined)     { updates.push('phone = ?');     values.push(phone); }
    if (role !== undefined)      { updates.push('role = ?');      values.push(role); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
    if (password)                { updates.push('password_hash = ?'); values.push(await bcrypt.hash(password, 12)); }
    if (updates.length) {
      values.push(req.params.id);
      await db.query(`UPDATE system_users SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    res.json({ success: true, data: { id: req.params.id, ...req.body, password: undefined } });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    await db.query('DELETE FROM system_users WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (error) { next(error); }
};

// ---- Transaction PIN management (each user manages their own) ----
exports.setPin = async (req, res, next) => {
  try {
    const { current_password, new_pin } = req.body;
    if (!/^\d{4}$/.test(String(new_pin || ''))) return res.status(400).json({ success: false, error: 'PIN must be 4 digits' });
    if (!current_password) return res.status(400).json({ success: false, error: 'current_password required' });
    const [rows] = await db.query('SELECT password_hash FROM system_users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    const ok = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!ok) return res.status(403).json({ success: false, error: 'Invalid password' });
    const hash = await bcrypt.hash(String(new_pin), 12);
    await db.query('UPDATE system_users SET transaction_pin_hash = ?, transaction_pin_set_at = NOW() WHERE id = ?',
      [hash, req.user.id]);
    res.json({ success: true, data: { message: 'PIN set' } });
  } catch (e) { next(e); }
};

exports.getPinStatus = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT (transaction_pin_hash IS NOT NULL) AS has_pin, transaction_pin_set_at FROM system_users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, data: rows[0] || { has_pin: false } });
  } catch (e) { next(e); }
};
