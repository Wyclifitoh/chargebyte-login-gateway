const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    let where = [];
    let params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (type) { where.push('type = ?'); params.push(type); }
    const whereClause = where.length ? `WHERE deleted_at IS NULL AND ${where.join(' AND ')}` : 'WHERE deleted_at IS NULL';

    const [events] = await db.query(`SELECT * FROM events ${whereClause} ORDER BY start_date DESC`, params);
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const [events] = await db.query('SELECT * FROM events WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!events.length) return res.status(404).json({ success: false, error: 'Event not found' });

    const [financials] = await db.query('SELECT * FROM event_financials WHERE event_id = ?', [req.params.id]);
    const [machines] = await db.query('SELECT * FROM event_machines WHERE event_id = ?', [req.params.id]);
    const [staff] = await db.query('SELECT * FROM event_staff WHERE event_id = ?', [req.params.id]);

    res.json({ success: true, data: { ...events[0], financials: financials[0] || null, machines, staff } });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const id = uuidv4();
    const { event_code, name, type, location, organizer_name, contact_person, contact_phone, start_date, end_date } = req.body;
    await db.query(
      `INSERT INTO events (id, event_code, name, type, location, organizer_name, contact_person, contact_phone, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, event_code, name, type, location, organizer_name, contact_person, contact_phone, start_date, end_date, req.user.id]
    );
    res.status(201).json({ success: true, data: { id, name } });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'type', 'category', 'status', 'description', 'location', 'start_date', 'end_date', 'expected_attendees', 'machines_allocated', 'staff_required'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    values.push(req.params.id);
    await db.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, data: { message: 'Event updated' } });
  } catch (error) {
    next(error);
  }
};
