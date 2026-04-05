const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// Leads
exports.getLeads = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let sql = 'SELECT l.*, s.name as station_name FROM leads l LEFT JOIN cb_stations s ON l.station_id = s.id';
    const conditions = [];
    const values = [];
    if (status) { conditions.push('l.status = ?'); values.push(status); }
    if (search) { conditions.push('(l.name LIKE ? OR l.email LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY l.created_at DESC';
    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.createLead = async (req, res, next) => {
  try {
    const id = uuidv4();
    const { name, email, phone, source, station_id, notes } = req.body;
    await db.query(
      'INSERT INTO leads (id, name, email, phone, source, station_id, assigned_to, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, email || null, phone || null, source || null, station_id || null, req.user.id, notes || null]
    );
    res.status(201).json({ success: true, data: { id, ...req.body } });
  } catch (error) { next(error); }
};

exports.updateLead = async (req, res, next) => {
  try {
    const fields = ['name', 'email', 'phone', 'source', 'station_id', 'status', 'notes', 'follow_up_date'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields' });
    values.push(req.params.id);
    await db.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, data: { id: req.params.id, ...req.body } });
  } catch (error) { next(error); }
};

// Reports
exports.getReports = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    let sql = 'SELECT r.*, s.name as station_name, u.name as submitted_by_name FROM reports r LEFT JOIN cb_stations s ON r.station_id = s.id LEFT JOIN users u ON r.submitted_by = u.id';
    const conditions = [];
    const values = [];
    if (type) { conditions.push('r.type = ?'); values.push(type); }
    if (status) { conditions.push('r.status = ?'); values.push(status); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY r.created_at DESC';
    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.createReport = async (req, res, next) => {
  try {
    const id = uuidv4();
    const { title, type, station_id, summary, activities_completed, challenges, next_steps, status } = req.body;
    await db.query(
      'INSERT INTO reports (id, title, type, station_id, submitted_by, summary, activities_completed, challenges, next_steps, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, type, station_id || null, req.user.id, summary || null, activities_completed || null, challenges || null, next_steps || null, status || 'draft']
    );
    res.status(201).json({ success: true, data: { id, ...req.body } });
  } catch (error) { next(error); }
};

// Daily plans
exports.getDailyPlans = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM daily_plans WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.createDailyPlan = async (req, res, next) => {
  try {
    const id = uuidv4();
    const { title, description, priority, deadline } = req.body;
    await db.query(
      'INSERT INTO daily_plans (id, user_id, title, description, priority, deadline) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, title, description || null, priority || 'medium', deadline || null]
    );
    res.status(201).json({ success: true, data: { id, ...req.body } });
  } catch (error) { next(error); }
};

exports.toggleDailyPlan = async (req, res, next) => {
  try {
    await db.query('UPDATE daily_plans SET is_completed = NOT is_completed WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, data: { message: 'Toggled' } });
  } catch (error) { next(error); }
};
