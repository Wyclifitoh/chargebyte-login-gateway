// backend/src/controllers/adclient.controller.js
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const conds = []; const vals = [];
    if (status) { conds.push('ac.status = ?'); vals.push(status); }
    if (search) { conds.push('(ac.name LIKE ? OR ac.contact_email LIKE ? OR ac.contact_person LIKE ?)'); vals.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT ac.*, u.full_name AS user_name, u.email AS user_email
       FROM advertising_clients ac
       LEFT JOIN system_users u ON ac.user_id = u.id
       ${where}
       ORDER BY ac.created_at DESC`,
      vals
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM advertising_clients WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const id = uuidv4();
    const { name, industry, contact_person, contact_phone, contact_email, website, notes, status, user_id } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });
    await db.query(
      `INSERT INTO advertising_clients
       (id, name, industry, contact_person, contact_phone, contact_email, website, notes, status, user_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, industry || null, contact_person || null, contact_phone || null, contact_email || null,
       website || null, notes || null, status || 'active', user_id || null, req.user.id]
    );
    res.status(201).json({ success: true, data: { id, ...req.body } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'industry', 'contact_person', 'contact_phone', 'contact_email', 'website', 'notes', 'status', 'user_id'];
    const updates = []; const vals = [];
    for (const k of allowed) if (req.body[k] !== undefined) { updates.push(`${k} = ?`); vals.push(req.body[k]); }
    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    vals.push(req.params.id);
    await db.query(`UPDATE advertising_clients SET ${updates.join(', ')} WHERE id = ?`, vals);
    res.json({ success: true, data: { id: req.params.id, ...req.body } });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await db.query('DELETE FROM advertising_clients WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (e) { next(e); }
};
