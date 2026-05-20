// backend/src/controllers/partner.controller.js
// Partners are surfaced as system_users with a partner role,
// joined to the partners table (one-to-one via partners.user_id).
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const PARTNER_ROLES = ['location_partner', 'funding_partner'];

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.full_name AS name, u.email, u.phone, u.role, u.is_active, u.created_at,
              p.id AS partner_id, p.partner_code, p.partner_type, p.tier, p.status AS partner_status,
              p.revenue_share_percent, p.contact_person, p.contact_phone, p.contact_email,
              (SELECT COUNT(*) FROM cb_stations s WHERE s.host_partner_id = u.id) AS stations_count,
              (SELECT COUNT(*) FROM partner_machines pm WHERE pm.partner_id = p.id) AS machines_count
       FROM system_users u
       LEFT JOIN partners p ON p.user_id = u.id
       WHERE u.role IN (?, ?)
       ORDER BY u.created_at DESC`,
      PARTNER_ROLES
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.full_name AS name, u.email, u.phone, u.role,
              p.id AS partner_id, p.partner_code, p.partner_type, p.tier,
              p.contact_person, p.contact_phone, p.contact_email, p.revenue_share_percent
       FROM system_users u LEFT JOIN partners p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (!users.length) return res.status(404).json({ success: false, error: 'Partner not found' });

    const user = users[0];
    const [stations] = await db.query(
      'SELECT id, name, address, county_name FROM cb_stations WHERE host_partner_id = ?',
      [user.id]
    );
    let machines = [];
    if (user.partner_id) {
      const [m] = await db.query(
        `SELECT m.id, m.name, m.station_id, s.name AS station_name, m.status
         FROM partner_machines pm
         JOIN machines m ON m.id = pm.machine_id
         LEFT JOIN cb_stations s ON s.id = m.station_id
         WHERE pm.partner_id = ?`,
        [user.partner_id]
      );
      machines = m;
    }
    res.json({ success: true, data: { ...user, stations, machines } });
  } catch (e) { next(e); }
};

// Create a partner: creates a system_users login (role=location_partner|funding_partner)
// AND a partners record linked via user_id.
exports.create = async (req, res, next) => {
  try {
    const {
      name, email, password, phone, role = 'location_partner',
      partner_code, partner_type = 'location', tier = 'standard',
      contact_person, contact_phone, contact_email, revenue_share_percent = 0,
    } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'name, email, password required' });
    }
    if (!PARTNER_ROLES.includes(role)) {
      return res.status(400).json({ success: false, error: 'role must be location_partner or funding_partner' });
    }
    const userId = uuidv4();
    const partnerId = uuidv4();
    const hash = await bcrypt.hash(password, 12);
    await db.query(
      `INSERT INTO system_users (id, email, password_hash, full_name, phone, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      [userId, email, hash, name, phone || null, role]
    );
    await db.query(
      `INSERT INTO partners
        (id, partner_code, name, partner_type, tier, contact_person, contact_phone, contact_email,
         revenue_share_percent, user_id, contract_start_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [partnerId, partner_code || `P-${userId.slice(0, 6).toUpperCase()}`, name, partner_type, tier,
       contact_person || name, contact_phone || phone || null, contact_email || email,
       revenue_share_percent, userId]
    );
    res.status(201).json({ success: true, data: { id: userId, partner_id: partnerId, name, email, role } });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const userFields = []; const userVals = [];
    if (req.body.name !== undefined)      { userFields.push('full_name = ?'); userVals.push(req.body.name); }
    if (req.body.email !== undefined)     { userFields.push('email = ?');     userVals.push(req.body.email); }
    if (req.body.phone !== undefined)     { userFields.push('phone = ?');     userVals.push(req.body.phone); }
    if (req.body.is_active !== undefined) { userFields.push('is_active = ?'); userVals.push(req.body.is_active ? 1 : 0); }
    if (userFields.length) {
      userVals.push(req.params.id);
      await db.query(`UPDATE system_users SET ${userFields.join(', ')} WHERE id = ?`, userVals);
    }
    const partnerFields = []; const partnerVals = [];
    for (const k of ['partner_type', 'tier', 'contact_person', 'contact_phone', 'contact_email', 'revenue_share_percent']) {
      if (req.body[k] !== undefined) { partnerFields.push(`${k} = ?`); partnerVals.push(req.body[k]); }
    }
    if (partnerFields.length) {
      partnerVals.push(req.params.id);
      await db.query(`UPDATE partners SET ${partnerFields.join(', ')} WHERE user_id = ?`, partnerVals);
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
};

// ---- Map a partner to stations / machines ----
exports.assignStation = async (req, res, next) => {
  try {
    const { user_id, station_id, revenue_share_percent } = req.body;
    if (!user_id || !station_id) return res.status(400).json({ success: false, error: 'user_id & station_id required' });
    await db.query('UPDATE cb_stations SET host_partner_id = ?, revenue_share_percent = COALESCE(?, revenue_share_percent) WHERE id = ?',
      [user_id, revenue_share_percent ?? null, station_id]);
    res.json({ success: true, data: { message: 'Station assigned' } });
  } catch (e) { next(e); }
};

exports.unassignStation = async (req, res, next) => {
  try {
    await db.query('UPDATE cb_stations SET host_partner_id = NULL WHERE id = ?', [req.params.station_id]);
    res.json({ success: true, data: { message: 'Station unassigned' } });
  } catch (e) { next(e); }
};

exports.assignMachine = async (req, res, next) => {
  try {
    const { partner_id, machine_id } = req.body;
    if (!partner_id || !machine_id) return res.status(400).json({ success: false, error: 'partner_id & machine_id required' });
    await db.query(
      'INSERT IGNORE INTO partner_machines (id, partner_id, machine_id) VALUES (?, ?, ?)',
      [uuidv4(), partner_id, machine_id]
    );
    res.json({ success: true, data: { message: 'Machine assigned' } });
  } catch (e) { next(e); }
};

exports.unassignMachine = async (req, res, next) => {
  try {
    await db.query('DELETE FROM partner_machines WHERE partner_id = ? AND machine_id = ?',
      [req.params.partner_id, req.params.machine_id]);
    res.json({ success: true, data: { message: 'Machine unassigned' } });
  } catch (e) { next(e); }
};

exports.getPayouts = async (req, res, next) => {
  try {
    const [payouts] = await db.query(
      `SELECT pp.*, p.name as partner_name FROM partner_payouts pp
       LEFT JOIN partners p ON pp.partner_id = p.id
       ORDER BY pp.created_at DESC`
    );
    res.json({ success: true, data: payouts });
  } catch (e) { next(e); }
};
