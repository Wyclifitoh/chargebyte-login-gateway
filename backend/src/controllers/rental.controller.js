const db = require('../config/database');
const ExcelJS = require('exceljs');

function resolveRange(query) {
  const period = (query.period || '').toLowerCase();
  const now = new Date();
  let from = null;
  let to = null;

  switch (period) {
    case 'today':
      from = new Date(now); from.setHours(0, 0, 0, 0);
      to = new Date(now); to.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      from = new Date(now); from.setDate(from.getDate() - 1); from.setHours(0, 0, 0, 0);
      to = new Date(from); to.setHours(23, 59, 59, 999);
      break;
    case 'week':
      from = new Date(now); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
      to = new Date(now); to.setHours(23, 59, 59, 999);
      break;
    case 'month':
      from = new Date(now); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0);
      to = new Date(now); to.setHours(23, 59, 59, 999);
      break;
    case 'custom':
      if (query.date_from) { from = new Date(query.date_from); from.setHours(0, 0, 0, 0); }
      if (query.date_to)   { to = new Date(query.date_to);   to.setHours(23, 59, 59, 999); }
      break;
    default:
      // honor explicit date_from/date_to without a period
      if (query.date_from) { from = new Date(query.date_from); from.setHours(0, 0, 0, 0); }
      if (query.date_to)   { to = new Date(query.date_to);   to.setHours(23, 59, 59, 999); }
  }
  return { from, to };
}

const fmt = (d) => (d ? d.toISOString().slice(0, 19).replace('T', ' ') : null);

exports.getAll = async (req, res, next) => {
  try {
    const { status, station_id, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { from, to } = resolveRange(req.query);

    const conditions = [];
    const values = [];

    if (status)     { conditions.push('r.status = ?');     values.push(status); }
    if (station_id) { conditions.push('r.station_id = ?'); values.push(station_id); }
    if (from)       { conditions.push('r.created_at >= ?'); values.push(fmt(from)); }
    if (to)         { conditions.push('r.created_at <= ?'); values.push(fmt(to)); }
    if (search) {
      conditions.push('(r.rental_code LIKE ? OR r.phone_number LIKE ? OR r.powerbank_id LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

    const baseSql = `FROM rentals r
                     LEFT JOIN cb_stations s ON r.station_id = s.id
                     LEFT JOIN machines m   ON r.machine_id = m.id
                     ${where}`;

    const [countRows] = await db.query(`SELECT COUNT(*) AS total ${baseSql}`, values);
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await db.query(
      `SELECT r.*,
              DATE_FORMAT(r.start_time, '%Y-%m-%dT%H:%i:%s') AS start_time,
              DATE_FORMAT(r.end_time,   '%Y-%m-%dT%H:%i:%s') AS end_time,
              DATE_FORMAT(r.deposit_refund_time, '%Y-%m-%dT%H:%i:%s') AS deposit_refund_time,
              DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
              DATE_FORMAT(r.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at,
              s.name AS station_name, m.name AS machine_name
       ${baseSql}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );

    res.json({
      success: true,
      data: rows,
      meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*,
              DATE_FORMAT(r.start_time, '%Y-%m-%dT%H:%i:%s') AS start_time,
              DATE_FORMAT(r.end_time,   '%Y-%m-%dT%H:%i:%s') AS end_time,
              DATE_FORMAT(r.deposit_refund_time, '%Y-%m-%dT%H:%i:%s') AS deposit_refund_time,
              DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
              DATE_FORMAT(r.updated_at, '%Y-%m-%dT%H:%i:%s') AS updated_at,
              s.name AS station_name, m.name AS machine_name
       FROM rentals r
       LEFT JOIN cb_stations s ON r.station_id = s.id
       LEFT JOIN machines m   ON r.machine_id = m.id
       WHERE r.id = ?`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Rental not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

exports.cancel = async (req, res, next) => {
  try {
    await db.query("UPDATE rentals SET status = 'cancelled' WHERE id = ? AND status = 'active'", [req.params.id]);
    res.json({ success: true, data: { message: 'Rental cancelled' } });
  } catch (error) { next(error); }
};

// Aggregate totals across the entire filtered period (not just current page)
exports.getSummary = async (req, res, next) => {
  try {
    const { status, station_id, search } = req.query;
    const { from, to } = resolveRange(req.query);

    const conditions = [];
    const values = [];
    if (status)     { conditions.push('r.status = ?');     values.push(status); }
    if (station_id) { conditions.push('r.station_id = ?'); values.push(station_id); }
    if (from)       { conditions.push('r.created_at >= ?'); values.push(fmt(from)); }
    if (to)         { conditions.push('r.created_at <= ?'); values.push(fmt(to)); }
    if (search) {
      conditions.push('(r.rental_code LIKE ? OR r.phone_number LIKE ? OR r.powerbank_id LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                AS total_rentals,
         COALESCE(SUM(r.total_amount), 0)        AS total_amount,
         COALESCE(SUM(r.deposit_amount), 0)      AS total_deposits,
         COALESCE(SUM(r.deposit_refunded), 0) AS total_refunded,
         COALESCE(SUM(r.duration_minutes), 0)    AS total_duration_minutes,
         SUM(CASE WHEN r.status = 'active'    THEN 1 ELSE 0 END) AS active_count,
         SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
         SUM(CASE WHEN r.status = 'overdue'   THEN 1 ELSE 0 END) AS overdue_count,
         SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
       FROM rentals r ${where}`,
      values,
    );

    const r = rows[0] || {};
    res.json({
      success: true,
      data: {
        total_rentals: Number(r.total_rentals || 0),
        total_amount: Number(r.total_amount || 0),
        total_deposits: Number(r.total_deposits || 0),
        total_refunded: Number(r.total_refunded || 0),
        total_duration_minutes: Number(r.total_duration_minutes || 0),
        active_count: Number(r.active_count || 0),
        completed_count: Number(r.completed_count || 0),
        overdue_count: Number(r.overdue_count || 0),
        cancelled_count: Number(r.cancelled_count || 0),
      },
    });
  } catch (error) { next(error); }
};

// Send SMS to a rental's phone number. Logs to notifications table; integrate
// a real provider (e.g. Twilio/Africa's Talking) where indicated.
exports.sendSms = async (req, res, next) => {
  try {
    const { phone_number, message, rental_id } = req.body || {};
    if (!phone_number || !message) {
      return res.status(400).json({ success: false, error: 'phone_number and message are required' });
    }

    // TODO: integrate real SMS provider here. For now, log + persist.
    console.log(`[SMS] to=${phone_number} rental=${rental_id || '-'} msg=${message}`);

    try {
      await db.query(
        `INSERT INTO notifications (type, title, message, priority, metadata, created_at)
         VALUES ('sms_sent', ?, ?, 'low', ?, NOW())`,
        [`SMS to ${phone_number}`, message, JSON.stringify({ phone_number, rental_id, sent_by: req.user?.id })],
      );
    } catch (e) {
      // Non-fatal — notifications table shape may differ; ignore
      console.warn('[SMS] notification insert failed:', e.message);
    }

    res.json({ success: true, data: { sent: true, phone_number } });
  } catch (error) { next(error); }
};

// Stream the full filtered rental set as an .xlsx file (server-side export)
exports.exportXlsx = async (req, res, next) => {
  try {
    const { status, station_id, search } = req.query;
    const { from, to } = resolveRange(req.query);

    const conditions = [];
    const values = [];
    if (status)     { conditions.push('r.status = ?');     values.push(status); }
    if (station_id) { conditions.push('r.station_id = ?'); values.push(station_id); }
    if (from)       { conditions.push('r.created_at >= ?'); values.push(fmt(from)); }
    if (to)         { conditions.push('r.created_at <= ?'); values.push(fmt(to)); }
    if (search) {
      conditions.push('(r.rental_code LIKE ? OR r.phone_number LIKE ? OR r.powerbank_id LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT r.rental_code, r.phone_number,
              s.name AS station_name, m.name AS machine_name,
              r.powerbank_id,
              DATE_FORMAT(r.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
              DATE_FORMAT(r.end_time,   '%Y-%m-%d %H:%i:%s') AS end_time,
              r.duration_minutes, r.total_amount, r.deposit_amount,
              r.deposit_refunded, r.status,
              DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM rentals r
         LEFT JOIN cb_stations s ON r.station_id = s.id
         LEFT JOIN machines m   ON r.machine_id = m.id
         ${where}
         ORDER BY r.created_at DESC`,
      values,
    );

    const [sumRows] = await db.query(
      `SELECT COUNT(*) AS total_rentals,
              COALESCE(SUM(r.total_amount), 0)     AS total_amount,
              COALESCE(SUM(r.deposit_amount), 0)   AS total_deposits,
              COALESCE(SUM(r.duration_minutes), 0) AS total_duration_minutes
         FROM rentals r ${where}`,
      values,
    );
    const sum = sumRows[0] || {};

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ChargeByte';
    wb.created = new Date();
    const ws = wb.addWorksheet('Rentals');

    ws.columns = [
      { header: 'Rental Code',      key: 'rental_code',      width: 18 },
      { header: 'Phone',            key: 'phone_number',     width: 15 },
      { header: 'Station',          key: 'station_name',     width: 22 },
      { header: 'Machine',          key: 'machine_name',     width: 18 },
      { header: 'Powerbank',        key: 'powerbank_id',     width: 16 },
      { header: 'Start',            key: 'start_time',       width: 20 },
      { header: 'End',              key: 'end_time',         width: 20 },
      { header: 'Duration (min)',   key: 'duration_minutes', width: 14 },
      { header: 'Amount (Ksh)',     key: 'total_amount',     width: 14 },
      { header: 'Deposit (Ksh)',    key: 'deposit_amount',   width: 14 },
      { header: 'Deposit Refunded', key: 'deposit_refunded', width: 16 },
      { header: 'Status',           key: 'status',           width: 12 },
      { header: 'Created',          key: 'created_at',       width: 20 },
    ];
    ws.getRow(1).font = { bold: true };

    rows.forEach((r) => {
      ws.addRow({
        rental_code: r.rental_code,
        phone_number: r.phone_number,
        station_name: r.station_name || '',
        machine_name: r.machine_name || '',
        powerbank_id: r.powerbank_id || '',
        start_time: r.start_time || '',
        end_time: r.end_time || '',
        duration_minutes: Number(r.duration_minutes) || 0,
        total_amount: Number(r.total_amount) || 0,
        deposit_amount: Number(r.deposit_amount) || 0,
        deposit_refunded: r.deposit_refunded ? 'Yes' : 'No',
        status: r.status,
        created_at: r.created_at || '',
      });
    });

    // Totals row
    const totalRow = ws.addRow({
      rental_code: 'TOTAL',
      duration_minutes: Number(sum.total_duration_minutes) || 0,
      total_amount: Number(sum.total_amount) || 0,
      deposit_amount: Number(sum.total_deposits) || 0,
    });
    totalRow.font = { bold: true };

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const period = (req.query.period || 'all').toLowerCase();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="rentals_${period}_${stamp}.xlsx"`,
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};
