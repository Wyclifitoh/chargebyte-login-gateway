const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.is_active, u.last_login, u.created_at, ur.role 
       FROM users u JOIN user_roles ur ON u.id = ur.user_id 
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.is_active, u.last_login, u.created_at, ur.role 
       FROM users u JOIN user_roles ur ON u.id = ur.user_id 
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);

    await db.query('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [id, name, email, hash]);
    await db.query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [uuidv4(), id, role]);

    res.status(201).json({ success: true, data: { id, name, email, role } });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, email, role, is_active } = req.body;
    const updates = [];
    const values = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (email) { updates.push('email = ?'); values.push(email); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (updates.length) {
      values.push(req.params.id);
      await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    if (role) {
      await db.query('UPDATE user_roles SET role = ? WHERE user_id = ?', [role, req.params.id]);
    }

    res.json({ success: true, data: { id: req.params.id, ...req.body } });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'User deleted' } });
  } catch (error) { next(error); }
};
