const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const [partners] = await db.query('SELECT * FROM partners ORDER BY created_at DESC');
    res.json({ success: true, data: partners });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const [partners] = await db.query('SELECT * FROM partners WHERE id = ?', [req.params.id]);
    if (!partners.length) return res.status(404).json({ success: false, error: 'Partner not found' });

    const [stations] = await db.query(
      `SELECT ps.*, s.name as station_name FROM partner_stations ps
       LEFT JOIN cb_stations s ON ps.station_id = s.id
       WHERE ps.partner_id = ?`,
      [req.params.id]
    );

    const [payouts] = await db.query(
      'SELECT * FROM partner_payouts WHERE partner_id = ? ORDER BY period_end DESC LIMIT 10',
      [req.params.id]
    );

    res.json({ success: true, data: { ...partners[0], stations, payouts } });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const id = uuidv4();
    const fields = ['id', 'partner_code', 'name', 'partner_type', 'contact_person', 'contact_phone', 'contact_email', 'contract_start_date'];
    const values = [id, req.body.partner_code, req.body.name, req.body.partner_type, req.body.contact_person, req.body.contact_phone, req.body.contact_email, req.body.contract_start_date];

    const optional = ['tier', 'website', 'registration_number', 'tax_id', 'address', 'city', 'county_id', 'agreement_type', 'revenue_share_percent', 'fixed_monthly_rent', 'contract_end_date', 'location_type', 'location_capacity', 'notes'];
    for (const key of optional) {
      if (req.body[key] !== undefined) { fields.push(key); values.push(req.body[key]); }
    }

    const placeholders = fields.map(() => '?').join(', ');
    await db.query(`INSERT INTO partners (${fields.join(', ')}) VALUES (${placeholders})`, values);
    res.status(201).json({ success: true, data: { id, name: req.body.name } });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = ['name', 'partner_type', 'tier', 'contact_person', 'contact_phone', 'contact_email', 'status', 'revenue_share_percent', 'notes'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    values.push(req.params.id);
    await db.query(`UPDATE partners SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, data: { message: 'Partner updated' } });
  } catch (error) {
    next(error);
  }
};

exports.getPayouts = async (req, res, next) => {
  try {
    const [payouts] = await db.query(
      `SELECT pp.*, p.name as partner_name FROM partner_payouts pp
       LEFT JOIN partners p ON pp.partner_id = p.id
       ORDER BY pp.created_at DESC`
    );
    res.json({ success: true, data: payouts });
  } catch (error) {
    next(error);
  }
};
