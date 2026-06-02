const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const { category, active, search } = req.query;
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    const conds = []; const vals = [];
    if (!isAdmin) {
      conds.push('(system_user_id = ? OR email = ?)');
      vals.push(req.user.id, req.user.email);
    }
    if (category) { conds.push('category = ?'); vals.push(category); }
    if (active !== undefined) { conds.push('is_active = ?'); vals.push(active === 'true' || active === '1' ? 1 : 0); }
    if (search) { conds.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)'); vals.push(`%${search}%`,`%${search}%`,`%${search}%`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT id, system_user_id, full_name, email, phone, category, title, is_active, created_at
       FROM team_members ${where} ORDER BY category, full_name`,
      vals
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { full_name, email, phone, category, title, system_user_id } = req.body;
    if (!full_name || !category) return res.status(400).json({ success: false, error: 'full_name and category required' });
    const id = uuidv4();
    await db.query(
      `INSERT INTO team_members (id, system_user_id, full_name, email, phone, category, title, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, system_user_id || null, full_name, email || null, phone || null, category, title || null]
    );
    res.status(201).json({ success: true, data: { id, full_name, email, phone, category, title } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const { full_name, email, phone, category, title, is_active, system_user_id } = req.body;
    const upd = []; const vals = [];
    if (full_name !== undefined) { upd.push('full_name = ?'); vals.push(full_name); }
    if (email !== undefined) { upd.push('email = ?'); vals.push(email || null); }
    if (phone !== undefined) { upd.push('phone = ?'); vals.push(phone || null); }
    if (category !== undefined) { upd.push('category = ?'); vals.push(category); }
    if (title !== undefined) { upd.push('title = ?'); vals.push(title || null); }
    if (is_active !== undefined) { upd.push('is_active = ?'); vals.push(is_active ? 1 : 0); }
    if (system_user_id !== undefined) { upd.push('system_user_id = ?'); vals.push(system_user_id || null); }
    if (upd.length) {
      vals.push(req.params.id);
      await db.query(`UPDATE team_members SET ${upd.join(', ')} WHERE id = ?`, vals);
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await db.query('DELETE FROM team_members WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'Team member removed' } });
  } catch (e) { next(e); }
};
