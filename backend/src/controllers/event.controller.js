const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

async function logActivity(eventId, actor, action, details) {
  try {
    await db.query(
      `INSERT INTO event_activity_log (id, event_id, actor_id, actor_name, action, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), eventId, actor?.id || null, actor?.name || null, action,
       details ? JSON.stringify(details) : null]);
  } catch (_) { /* non-fatal */ }
}

function nowSql() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }

function eventPerformanceSql() {
  return `FROM event_machines em
        JOIN machines dm ON dm.id = em.machine_id
        JOIN events e ON e.id = em.event_id
        JOIN rentals r
          ON (
            r.machine_id = em.machine_id
            OR NULLIF(r.machine_id, '') = dm.cabinet_device_id
            OR NULLIF(r.machine_id, '') = dm.manufacturer_cabinet_id
            OR NULLIF(r.manufacturer_trade_no, '') = dm.cabinet_device_id
            OR NULLIF(r.manufacturer_trade_no, '') = dm.manufacturer_cabinet_id
            OR (r.machine_model = dm.model AND NOT EXISTS (SELECT 1 FROM machines mx WHERE mx.id = r.machine_id))
          )
         AND COALESCE(r.start_time, r.created_at) >= em.assignment_date
         AND COALESCE(r.start_time, r.created_at) >= e.start_date
         AND COALESCE(r.start_time, r.created_at) < DATE_ADD(e.end_date, INTERVAL 1 DAY)
         AND (em.return_date IS NULL OR COALESCE(r.start_time, r.created_at) < DATE_ADD(em.return_date, INTERVAL 1 DAY))`;
}

exports.getAll = async (req, res, next) => {
  try {
    const { status, type, q, from, to } = req.query;
    const where = ['deleted_at IS NULL'];
    const params = [];
    if (status) { where.push('status = ?'); params.push(status); }
    if (type)   { where.push('type = ?');   params.push(type); }
    if (q)      { where.push('(name LIKE ? OR organizer_name LIKE ? OR location LIKE ?)');
                  params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    if (from)   { where.push('end_date >= ?');   params.push(from); }
    if (to)     { where.push('start_date <= ?'); params.push(to); }

    const [events] = await db.query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM event_machines WHERE event_id = e.id) AS machines_count,
              (SELECT COUNT(*) FROM event_staff    WHERE event_id = e.id) AS staff_count
       FROM events e
       WHERE ${where.join(' AND ')}
       ORDER BY e.start_date DESC LIMIT 500`, params);
    res.json({ success: true, data: events });
  } catch (error) { next(error); }
};

exports.summary = async (_req, res, next) => {
  try {
    const [[s]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status IN ('confirmed','upcoming','ongoing')) AS active,
         SUM(status='completed') AS completed,
         SUM(status IN ('planning','not_contacted','contacted','follow_up','proposal_sent','negotiating')) AS pipeline,
         SUM(status='cancelled') AS cancelled,
         SUM(status='lost') AS lost
       FROM events WHERE deleted_at IS NULL`);
    res.json({ success: true, data: s });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [events] = await db.query('SELECT * FROM events WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!events.length) return res.status(404).json({ success: false, error: 'Event not found' });
    const event = events[0];

    const [financials] = await db.query('SELECT * FROM event_financials WHERE event_id = ?', [req.params.id]);
    const [machines] = await db.query(
      `SELECT em.*, m.name AS machine_name, m.model, m.status AS machine_status
       FROM event_machines em
       LEFT JOIN machines m ON m.id = em.machine_id
       WHERE em.event_id = ? ORDER BY em.assignment_date DESC`, [req.params.id]);
    const [staff] = await db.query(
      `SELECT es.*, u.full_name AS staff_name, u.email AS staff_email
       FROM event_staff es
       LEFT JOIN system_users u ON u.id = es.staff_id
       WHERE es.event_id = ?`, [req.params.id]);
    let activity = [];
    try {
      const [rows] = await db.query(
        `SELECT * FROM event_activity_log WHERE event_id = ? ORDER BY created_at DESC LIMIT 200`, [req.params.id]);
      activity = rows;
    } catch (_) { /* table may not exist pre-migration */ }

    let performance = { total_rentals: 0, total_revenue: 0, per_machine: [], per_day: [] };
    if (machines.length) {
      const [[perf]] = await db.query(
        `SELECT COUNT(DISTINCT r.id) AS total_rentals,
                COALESCE(SUM(r.total_amount), 0) AS total_revenue
         ${eventPerformanceSql()}
         WHERE em.event_id = ? AND r.status = 'completed'`, [req.params.id]);
      const [perMachine] = await db.query(
        `SELECT em.machine_id, dm.name AS machine_name, COUNT(DISTINCT r.id) AS rentals_count,
                COALESCE(SUM(r.total_amount), 0) AS revenue
         ${eventPerformanceSql()}
         WHERE em.event_id = ? AND r.status = 'completed'
         GROUP BY em.machine_id, dm.name
         ORDER BY revenue DESC`, [req.params.id]);
      const [perDay] = await db.query(
        `SELECT DATE(COALESCE(r.start_time, r.created_at)) AS day, COUNT(DISTINCT r.id) AS rentals_count,
                COALESCE(SUM(r.total_amount), 0) AS revenue
         ${eventPerformanceSql()}
         WHERE em.event_id = ? AND r.status = 'completed'
         GROUP BY day
         ORDER BY day ASC`, [req.params.id]);
      performance = {
        total_rentals: Number(perf.total_rentals),
        total_revenue: Number(perf.total_revenue),
        per_machine: perMachine,
        per_day: perDay,
      };
    }

    res.json({ success: true, data: {
      ...event, financials: financials[0] || null, machines, staff, activity, performance
    }});
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const id = uuidv4();
    const b = req.body || {};
    const event_code = b.event_code || `EVT-${Date.now().toString(36).toUpperCase()}`;
    await db.query(
      `INSERT INTO events
        (id, event_code, name, type, category, status, description, location, venue_name,
         organizer_name, contact_person, contact_phone, contact_email,
         start_date, end_date, expected_attendees, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, event_code, b.name, b.type || 'organizer_paid', b.category || 'community',
       b.status || 'planning', b.description || null, b.location, b.venue_name || null,
       b.organizer_name, b.contact_person, b.contact_phone, b.contact_email || null,
       b.start_date, b.end_date, b.expected_attendees || 0, b.notes || null, req.user.id]);
    await logActivity(id, req.user, 'CREATED', { name: b.name });
    res.status(201).json({ success: true, data: { id, event_code, name: b.name } });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const allowed = [
      'name','type','category','status','description','location','venue_name',
      'organizer_name','contact_person','contact_phone','contact_email',
      'start_date','end_date','start_time','end_time',
      'expected_attendees','actual_attendees','machines_allocated','staff_required',
      'pricing_model','daily_rate','revenue_share_percent','setup_fee','transport_cost',
      'outcome','notes','next_follow_up_date'
    ];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = ?`); values.push(req.body[key]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, error: 'No fields to update' });
    values.push(req.params.id);
    await db.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, values);
    if (req.body.status) await logActivity(req.params.id, req.user, 'STATUS_CHANGED', { status: req.body.status });
    else await logActivity(req.params.id, req.user, 'UPDATED', Object.keys(req.body));
    res.json({ success: true, data: { message: 'Event updated' } });
  } catch (error) { next(error); }
};

exports.logCommunication = async (req, res, next) => {
  try {
    const { channel, note } = req.body;
    const now = nowSql();
    const updates = ['contacted = 1', 'last_contacted_at = ?'];
    const params = [now];
    if (channel === 'email')     { updates.push('email_sent = 1', 'email_sent_at = ?');    params.push(now); }
    if (channel === 'proposal')  { updates.push('proposal_sent = 1', 'proposal_sent_at = ?'); params.push(now); }
    if (channel === 'follow_up') { updates.push('follow_up_count = follow_up_count + 1'); }
    updates.push('first_contacted_at = COALESCE(first_contacted_at, ?)');
    params.push(now, req.params.id);
    await db.query(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, params);
    await logActivity(req.params.id, req.user, `COMM_${(channel || 'contact').toUpperCase()}`, { note: note || null });
    res.json({ success: true, data: { message: 'Communication logged' } });
  } catch (error) { next(error); }
};

exports.assignStaff = async (req, res, next) => {
  try {
    const { staff_id, staff_type, role, daily_rate, working_days } = req.body;
    if (!staff_id) return res.status(400).json({ success: false, error: 'staff_id required' });
    const id = uuidv4();
    try {
      await db.query(
        `INSERT INTO event_staff (id, event_id, staff_id, staff_type, role, daily_rate, working_days)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, req.params.id, staff_id, staff_type || 'sales_agent', role || null,
         daily_rate || 0, working_days || 1]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Staff already assigned' });
      throw e;
    }
    await logActivity(req.params.id, req.user, 'STAFF_ASSIGNED', { staff_id });
    res.status(201).json({ success: true, data: { id } });
  } catch (error) { next(error); }
};

exports.removeStaff = async (req, res, next) => {
  try {
    await db.query('DELETE FROM event_staff WHERE id = ? AND event_id = ?', [req.params.staff_id, req.params.id]);
    await logActivity(req.params.id, req.user, 'STAFF_REMOVED', { staff_row: req.params.staff_id });
    res.json({ success: true });
  } catch (error) { next(error); }
};

exports.deployMachine = async (req, res, next) => {
  try {
    const { machine_id, assignment_date, deployment_notes } = req.body;
    if (!machine_id) return res.status(400).json({ success: false, error: 'machine_id required' });
    const [[event]] = await db.query('SELECT id, name FROM events WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    const [[partnerDeployment]] = await db.query(
      `SELECT id FROM partner_machine_deployments WHERE machine_id = ? AND undeployed_at IS NULL LIMIT 1`, [machine_id]);
    if (partnerDeployment) return res.status(409).json({ success: false, error: 'Machine is actively deployed to a location partner' });
    const [[eventDeployment]] = await db.query(
      `SELECT id FROM event_machines WHERE machine_id = ? AND status IN ('assigned','deployed') AND return_date IS NULL LIMIT 1`, [machine_id]);
    if (eventDeployment) return res.status(409).json({ success: false, error: 'Machine is actively deployed to another event' });
    const id = uuidv4();
    try {
      await db.query(
        `INSERT INTO event_machines
          (id, event_id, machine_id, assignment_date, status, deployed_by, deployment_notes)
         VALUES (?, ?, ?, ?, 'deployed', ?, ?)`,
        [id, req.params.id, machine_id, assignment_date || new Date().toISOString().slice(0, 10),
         req.user?.id || null, deployment_notes || null]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Machine already assigned to this event' });
      throw e;
    }
    await logActivity(req.params.id, req.user, 'MACHINE_DEPLOYED', { machine_id });
    res.status(201).json({ success: true, data: { id } });
  } catch (error) { next(error); }
};

exports.returnMachine = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE event_machines SET status = 'returned', return_date = COALESCE(return_date, CURDATE())
       WHERE id = ? AND event_id = ?`, [req.params.deployment_id, req.params.id]);
    await logActivity(req.params.id, req.user, 'MACHINE_RETURNED', { deployment_id: req.params.deployment_id });
    res.json({ success: true });
  } catch (error) { next(error); }
};

exports.performance = async (req, res, next) => {
  try {
    const [[totals]] = await db.query(
      `SELECT COUNT(DISTINCT r.id) AS total_rentals, COALESCE(SUM(r.total_amount), 0) AS total_revenue
       ${eventPerformanceSql()}
       WHERE em.event_id = ? AND r.status = 'completed'`, [req.params.id]);
    const [perMachine] = await db.query(
      `SELECT em.machine_id, dm.name AS machine_name, COUNT(DISTINCT r.id) AS rentals_count,
              COALESCE(SUM(r.total_amount), 0) AS revenue
       ${eventPerformanceSql()}
       WHERE em.event_id = ? AND r.status = 'completed'
       GROUP BY em.machine_id, dm.name
       ORDER BY revenue DESC`, [req.params.id]);
    const [perDay] = await db.query(
      `SELECT DATE(COALESCE(r.start_time, r.created_at)) AS day, COUNT(DISTINCT r.id) AS rentals_count,
              COALESCE(SUM(r.total_amount), 0) AS revenue
       ${eventPerformanceSql()}
       WHERE em.event_id = ? AND r.status = 'completed'
       GROUP BY day
       ORDER BY day ASC`, [req.params.id]);
    res.json({ success: true, data: {
      total_rentals: Number(totals.total_rentals || 0),
      total_revenue: Number(totals.total_revenue || 0),
      per_machine: perMachine,
      per_day: perDay,
    }});
  } catch (error) { next(error); }
};

exports.delete = async (req, res, next) => {
  try {
    await db.query('UPDATE events SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) { next(error); }
};