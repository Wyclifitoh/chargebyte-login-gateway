const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { search, is_active } = req.query;
    let sql = `SELECT s.*, COUNT(m.id) as machine_count 
               FROM cb_stations s LEFT JOIN machines m ON s.id = m.station_id`;
    const conditions = [];
    const values = [];

    if (search) { conditions.push('(s.name LIKE ? OR s.address LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }
    if (is_active !== undefined) { conditions.push('s.is_active = ?'); values.push(is_active); }

    // Location partner sees only their stations
    if (req.user.role === 'location_partner') {
      conditions.push('s.host_partner_id = ?');
      values.push(req.user.id);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' GROUP BY s.id ORDER BY s.created_at DESC';

    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM cb_stations WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Station not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const id = uuidv4();
    const { name, address, latitude, longitude, county_name, open_hours, host_partner_id, revenue_share_percent, features } = req.body;
    await db.query(
      'INSERT INTO cb_stations (id, name, address, latitude, longitude, county_name, open_hours, host_partner_id, revenue_share_percent, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, address, latitude || null, longitude || null, county_name || null, open_hours || null, host_partner_id || null, revenue_share_percent || 0, features ? JSON.stringify(features) : null]
    );
    res.status(201).json({ success: true, data: { id, ...req.body } });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const fields = ['name', 'address', 'latitude', 'longitude', 'county_name', 'open_hours', 'host_partner_id', 'revenue_share_percent', 'features'];
    const updates = [];
    const values = [];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(f === 'features' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }

    if (!updates.length) return res.status(400).json({ success: false, error: 'No fields to update' });

    values.push(req.params.id);
    await db.query(`UPDATE cb_stations SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, data: { id: req.params.id, ...req.body } });
  } catch (error) { next(error); }
};

exports.toggleActive = async (req, res, next) => {
  try {
    await db.query('UPDATE cb_stations SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'Station toggled' } });
  } catch (error) { next(error); }
};
