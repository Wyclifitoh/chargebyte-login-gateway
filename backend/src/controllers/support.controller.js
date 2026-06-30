const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

// SLA targets (hours from creation) by priority
const SLA_HOURS = { critical: 2, high: 8, medium: 24, low: 72 };

function nextTicketNo() {
  // CB-YYMMDD-XXXX (random suffix; uniqueness enforced by retry on duplicate)
  const d = new Date();
  const y = String(d.getFullYear()).slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CB-${y}${m}${day}-${rand}`;
}

function slaDueDate(priority) {
  const h = SLA_HOURS[priority] || SLA_HOURS.medium;
  return new Date(Date.now() + h * 3600 * 1000);
}

// ---------------- List ----------------
exports.list = async (req, res, next) => {
  try {
    const { status, priority, category, assigned_to, q, station_id, limit = 200 } = req.query;
    const where = [];
    const vals = [];

    if (status)      { where.push('t.status = ?');       vals.push(status); }
    if (priority)    { where.push('t.priority = ?');     vals.push(priority); }
    if (category)    { where.push('t.category = ?');     vals.push(category); }
    if (assigned_to) { where.push('t.assigned_to = ?');  vals.push(assigned_to); }
    if (station_id)  { where.push('t.station_id = ?');   vals.push(station_id); }
    if (q) {
      where.push('(t.ticket_no LIKE ? OR t.subject LIKE ? OR t.customer_phone LIKE ? OR t.customer_name LIKE ?)');
      const like = `%${q}%`;
      vals.push(like, like, like, like);
    }

    const sql = `
      SELECT t.*,
             u1.full_name AS assigned_to_name,
             u2.full_name AS created_by_name,
             s.name       AS station_name
      FROM support_tickets t
      LEFT JOIN system_users u1 ON u1.id = t.assigned_to
      LEFT JOIN system_users u2 ON u2.id = t.created_by
      LEFT JOIN cb_stations s    ON s.id = t.station_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY
        CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        t.created_at DESC
      LIMIT ?`;
    vals.push(Number(limit) || 200);

    const [rows] = await db.query(sql, vals);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ---------------- Summary (kanban counts) ----------------
exports.summary = async (_req, res, next) => {
  try {
    const [byStatus] = await db.query(
      `SELECT status, COUNT(*) AS count FROM support_tickets GROUP BY status`
    );
    const [byPriority] = await db.query(
      `SELECT priority, COUNT(*) AS count FROM support_tickets
       WHERE status NOT IN ('resolved','closed') GROUP BY priority`
    );
    const [sla] = await db.query(
      `SELECT
         SUM(CASE WHEN sla_due_at < NOW() AND status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS overdue,
         SUM(CASE WHEN status IN ('open','assigned','in_progress','escalated') THEN 1 ELSE 0 END) AS open_total
       FROM support_tickets`
    );
    res.json({ success: true, data: { byStatus, byPriority, ...sla[0] } });
  } catch (err) { next(err); }
};

// ---------------- Detail ----------------
exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u1.full_name AS assigned_to_name, u2.full_name AS created_by_name,
              s.name AS station_name, m.qr_code AS machine_qr
       FROM support_tickets t
       LEFT JOIN system_users u1 ON u1.id = t.assigned_to
       LEFT JOIN system_users u2 ON u2.id = t.created_by
       LEFT JOIN cb_stations s    ON s.id = t.station_id
       LEFT JOIN machines m       ON m.id = t.machine_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Ticket not found' });
    const ticket = rows[0];
    const [comments] = await db.query(
      `SELECT c.*, u.full_name AS author_name
       FROM support_ticket_comments c
       LEFT JOIN system_users u ON u.id = c.author_id
       WHERE c.ticket_id = ?
       ORDER BY c.created_at ASC`,
      [ticket.id]
    );
    res.json({ success: true, data: { ...ticket, comments } });
  } catch (err) { next(err); }
};

// ---------------- Create ----------------
exports.create = async (req, res, next) => {
  try {
    const {
      subject, description, category = 'other', priority = 'medium',
      customer_name, customer_phone, customer_email,
      rental_id, machine_id, station_id,
      latitude, longitude, photos = [],
    } = req.body || {};

    if (!subject || subject.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Subject is required' });
    }

    const id = uuidv4();
    let ticketNo = nextTicketNo();
    const sla = slaDueDate(priority);

    // simple retry-on-duplicate ticket_no
    for (let i = 0; i < 3; i++) {
      try {
        await db.query(
          `INSERT INTO support_tickets
           (id, ticket_no, subject, description, category, priority, status,
            customer_name, customer_phone, customer_email,
            rental_id, machine_id, station_id, latitude, longitude,
            photos_json, sla_due_at, created_by)
           VALUES (?,?,?,?,?,?, 'open', ?,?,?, ?,?,?, ?,?, ?, ?, ?)`,
          [
            id, ticketNo, subject.trim(), description || null, category, priority,
            customer_name || null, customer_phone || null, customer_email || null,
            rental_id || null, machine_id || null, station_id || null,
            latitude ?? null, longitude ?? null,
            photos && photos.length ? JSON.stringify(photos) : null,
            sla, req.user.id,
          ]
        );
        break;
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY' && i < 2) { ticketNo = nextTicketNo(); continue; }
        throw e;
      }
    }

    const [rows] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ---------------- Update ----------------
exports.update = async (req, res, next) => {
  try {
    const fields = [
      'subject', 'description', 'category', 'priority', 'status',
      'customer_name', 'customer_phone', 'customer_email',
      'rental_id', 'machine_id', 'station_id',
      'assigned_to', 'resolution_note',
    ];
    const sets = [];
    const vals = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(req.body[f]); }
    }
    if (req.body.priority) {
      sets.push('sla_due_at = ?');
      vals.push(slaDueDate(req.body.priority));
    }
    if (req.body.status === 'resolved' || req.body.status === 'closed') {
      sets.push('resolved_at = NOW()');
    }
    if (!sets.length) return res.status(400).json({ success: false, error: 'No fields to update' });

    vals.push(req.params.id);
    await db.query(`UPDATE support_tickets SET ${sets.join(', ')} WHERE id = ?`, vals);

    const [rows] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ---------------- Assign ----------------
exports.assign = async (req, res, next) => {
  try {
    const { assigned_to } = req.body || {};
    if (!assigned_to) return res.status(400).json({ success: false, error: 'assigned_to required' });
    await db.query(
      `UPDATE support_tickets
       SET assigned_to = ?,
           status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END
       WHERE id = ?`,
      [assigned_to, req.params.id]
    );
    const [rows] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ---------------- Comments ----------------
exports.addComment = async (req, res, next) => {
  try {
    const { body, is_internal = true } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ success: false, error: 'Comment body required' });

    const id = uuidv4();
    await db.query(
      `INSERT INTO support_ticket_comments (id, ticket_id, author_id, author_name, body, is_internal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.params.id, req.user.id, req.user.name, body.trim(), is_internal ? 1 : 0]
    );
    // bump ticket updated_at
    await db.query('UPDATE support_tickets SET updated_at = NOW() WHERE id = ?', [req.params.id]);

    const [rows] = await db.query(
      `SELECT c.*, u.full_name AS author_name
       FROM support_ticket_comments c
       LEFT JOIN system_users u ON u.id = c.author_id
       WHERE c.id = ?`,
      [id]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

// ---------------- Delete ----------------
exports.remove = async (req, res, next) => {
  try {
    await db.query('DELETE FROM support_tickets WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err) { next(err); }
};
