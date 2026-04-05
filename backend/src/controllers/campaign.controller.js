const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM campaigns';
    const values = [];

    // Ad clients only see their own campaigns
    if (req.user.role === 'advertising_client') {
      sql += ' WHERE client_id = ?';
      values.push(req.user.id);
      if (status) { sql += ' AND status = ?'; values.push(status); }
    } else if (status) {
      sql += ' WHERE status = ?';
      values.push(status);
    }

    sql += ' ORDER BY created_at DESC';
    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Campaign not found' });
    if (req.user.role === 'advertising_client' && rows[0].client_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const id = uuidv4();
    const { name, client_id, client_name, start_date, end_date, locations, spend, status } = req.body;
    await db.query(
      'INSERT INTO campaigns (id, name, client_id, client_name, start_date, end_date, locations, spend, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, client_id || null, client_name || null, start_date || null, end_date || null, locations ? JSON.stringify(locations) : null, spend || 0, status || 'scheduled']
    );
    res.status(201).json({ success: true, data: { id, ...req.body } });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const fields = ['name', 'client_id', 'client_name', 'start_date', 'end_date', 'locations', 'spend', 'status', 'impressions', 'interactions', 'ctr'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(f === 'locations' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }
    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    values.push(req.params.id);
    await db.query(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, data: { id: req.params.id, ...req.body } });
  } catch (error) { next(error); }
};
