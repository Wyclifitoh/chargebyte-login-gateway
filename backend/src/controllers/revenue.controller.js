const db = require('../config/database');

/**
 * REVENUE MODEL (single source of truth = `rentals` table)
 * --------------------------------------------------------
 * Customer pays a deposit (e.g. 1000), hourly rate is e.g. 100/hr.
 * On return we refund (deposit − charges). Our REVENUE is the rental
 * charge only — stored as `rentals.total_amount`.
 *
 *   Net Revenue        = SUM(r.total_amount)                  [earned]
 *   Deposits Collected = SUM(r.deposit_amount)                [liability in]
 *   Refunds Issued     = SUM(r.deposit_amount WHERE refunded) [liability out]
 *   Deposits Held      = Deposits Collected − Refunds Issued  [outstanding liability,
 *                                                              NOT revenue]
 *
 * Transactions table is used only for the line-item transactions list and
 * informational "transaction volume" (gross M-Pesa movements).
 */

function resolveRange(query) {
  const period = (query.period || '').toLowerCase();
  const now = new Date();
  let from = null;
  let to = null;
  switch (period) {
    case 'today':
      from = new Date(now); from.setHours(0,0,0,0);
      to = new Date(now); to.setHours(23,59,59,999);
      break;
    case 'yesterday':
      from = new Date(now); from.setDate(from.getDate()-1); from.setHours(0,0,0,0);
      to = new Date(from); to.setHours(23,59,59,999);
      break;
    case 'week':
      from = new Date(now); from.setDate(from.getDate()-6); from.setHours(0,0,0,0);
      to = new Date(now); to.setHours(23,59,59,999);
      break;
    case 'month':
      from = new Date(now); from.setDate(from.getDate()-29); from.setHours(0,0,0,0);
      to = new Date(now); to.setHours(23,59,59,999);
      break;
    case 'custom':
    default:
      if (query.date_from) { from = new Date(query.date_from); from.setHours(0,0,0,0); }
      if (query.date_to)   { to = new Date(query.date_to);   to.setHours(23,59,59,999); }
  }
  return { from, to };
}
const fmt = (d) => (d ? d.toISOString().slice(0,19).replace('T',' ') : null);

/** Build a WHERE for the `rentals r` table (joined as needed with cb_stations s). */
function rentalWhere(req, from, to) {
  const conds = [];
  const vals = [];
  if (from) { conds.push('r.created_at >= ?'); vals.push(fmt(from)); }
  if (to)   { conds.push('r.created_at <= ?'); vals.push(fmt(to)); }
  if (req.query.station_id) { conds.push('r.station_id = ?'); vals.push(req.query.station_id); }
  if (req.user.role === 'location_partner') {
    conds.push('s.host_partner_id = ?');
    vals.push(req.user.id);
  }
  return {
    where: conds.length ? ' WHERE ' + conds.join(' AND ') : '',
    values: vals,
  };
}

exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { where, values } = rentalWhere(req, from, to);

    const [rentalRows] = await db.query(
      `SELECT
         COUNT(*)                                AS rentals_count,
         COALESCE(SUM(r.total_amount), 0)        AS rental_charges,
         COALESCE(SUM(r.deposit_amount), 0)      AS deposits_collected,
         COALESCE(SUM(r.deposit_refunded), 0) AS refunds_issued,
         SUM(CASE WHEN r.status = 'active'    THEN 1 ELSE 0 END) AS active_count,
         SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
         SUM(CASE WHEN r.status = 'overdue'   THEN 1 ELSE 0 END) AS overdue_count
       FROM rentals r
       LEFT JOIN cb_stations s ON r.station_id = s.id
       ${where}`,
      values,
    );
    const r = rentalRows[0] || {};

    // Informational gross M-Pesa volume (NOT revenue)
    const tConds = ["t.status = 'completed'"];
    const tVals = [];
    if (from) { tConds.push('t.created_at >= ?'); tVals.push(fmt(from)); }
    if (to)   { tConds.push('t.created_at <= ?'); tVals.push(fmt(to)); }
    let tJoin = '';
    if (req.user.role === 'location_partner') {
      tJoin = ' LEFT JOIN rentals r ON t.rental_id = r.id LEFT JOIN cb_stations s ON r.station_id = s.id';
      tConds.push('s.host_partner_id = ?');
      tVals.push(req.user.id);
    }
    const [txRows] = await db.query(
      `SELECT COUNT(*) AS total_transactions, COALESCE(SUM(t.amount), 0) AS transaction_volume
       FROM transactions t ${tJoin}
       WHERE ${tConds.join(' AND ')}`,
      tVals,
    );
    const tx = txRows[0] || {};

    const rental_charges     = Number(r.rental_charges || 0);
    const deposits_collected = Number(r.deposits_collected || 0);
    const refunds_issued     = Number(r.refunds_issued || 0);
    const deposits_held      = Math.max(deposits_collected - refunds_issued, 0);
    const net_revenue        = rental_charges; // earned only

    res.json({
      success: true,
      data: {
        net_revenue,
        rental_charges,
        deposits_collected,
        refunds_issued,
        deposits_held,
        forfeited_deposits: 0, // model has no forfeiture
        rentals_count: Number(r.rentals_count || 0),
        active_rentals:    Number(r.active_count    || 0),
        completed_rentals: Number(r.completed_count || 0),
        overdue_rentals:   Number(r.overdue_count   || 0),

        // Informational only
        transaction_volume: Number(tx.transaction_volume || 0),
        total_transactions: Number(tx.total_transactions || 0),

        // Legacy aliases
        total_revenue:   net_revenue,
        rental_revenue:  rental_charges,
        deposit_revenue: deposits_collected,
        refund_revenue:  refunds_issued,
      },
    });
  } catch (error) { next(error); }
};

exports.getByStation = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { where, values } = rentalWhere(req, from, to);

    const [rows] = await db.query(
      `SELECT s.id, s.name,
              COALESCE(SUM(r.total_amount), 0)   AS revenue,
              COALESCE(SUM(r.deposit_amount), 0) AS deposits,
              COUNT(r.id)                        AS transactions
       FROM rentals r
       JOIN cb_stations s ON r.station_id = s.id
       ${where}
       GROUP BY s.id, s.name
       ORDER BY revenue DESC`,
      values,
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getByMachine = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { where, values } = rentalWhere(req, from, to);

    const [rows] = await db.query(
      `SELECT m.id, m.name, s.name AS station_name,
              COALESCE(SUM(r.total_amount), 0) AS revenue,
              COUNT(r.id)                      AS transactions
       FROM rentals r
       JOIN machines m     ON r.machine_id = m.id
       JOIN cb_stations s  ON r.station_id = s.id
       ${where}
       GROUP BY m.id, m.name, s.name
       ORDER BY revenue DESC`,
      values,
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getOverTime = async (req, res, next) => {
  try {
    const grain = req.query.period === 'monthly' ? '%Y-%m'
                : req.query.period === 'weekly'  ? '%Y-%u'
                : '%Y-%m-%d';
    const { from, to } = resolveRange(req.query);
    const { where, values } = rentalWhere(req, from, to);

    const [rows] = await db.query(
      `SELECT DATE_FORMAT(r.created_at, ?) AS period,
              COALESCE(SUM(r.total_amount), 0) AS revenue,
              COUNT(*) AS transactions
       FROM rentals r
       LEFT JOIN cb_stations s ON r.station_id = s.id
       ${where}
       GROUP BY period
       ORDER BY period ASC
       LIMIT 60`,
      [grain, ...values],
    );
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getBreakdown = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { where, values } = rentalWhere(req, from, to);

    // Show the actual revenue composition from the rentals table.
    const [rows] = await db.query(
      `SELECT
         COALESCE(SUM(r.total_amount), 0)   AS rental_charges,
         COALESCE(SUM(r.deposit_amount), 0) AS deposits_collected,
         COALESCE(SUM(CASE WHEN r.deposit_refunded = 1 THEN r.deposit_amount ELSE 0 END), 0) AS refunds_issued
       FROM rentals r
       LEFT JOIN cb_stations s ON r.station_id = s.id
       ${where}`,
      values,
    );
    const a = rows[0] || {};
    const data = [
      { type: 'rental_charge', value: Number(a.rental_charges     || 0), count: 0 },
      { type: 'deposit',       value: Number(a.deposits_collected || 0), count: 0 },
      { type: 'refund',        value: Number(a.refunds_issued     || 0), count: 0 },
    ].filter((x) => x.value > 0);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const { status, transaction_type, search, station_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { from, to } = resolveRange(req.query);

    const conditions = [];
    const values = [];

    if (status)           { conditions.push('t.status = ?');           values.push(status); }
    if (transaction_type) { conditions.push('t.transaction_type = ?'); values.push(transaction_type); }
    if (from)             { conditions.push('t.created_at >= ?');      values.push(fmt(from)); }
    if (to)               { conditions.push('t.created_at <= ?');      values.push(fmt(to)); }
    if (station_id)       { conditions.push('r.station_id = ?');       values.push(station_id); }
    if (search) {
      conditions.push('(t.mpesa_receipt LIKE ? OR t.phone_number LIKE ? OR r.rental_code LIKE ?)');
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (req.user.role === 'location_partner') {
      conditions.push('s.host_partner_id = ?');
      values.push(req.user.id);
    }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `FROM transactions t
                     LEFT JOIN rentals r     ON t.rental_id = r.id
                     LEFT JOIN cb_stations s ON r.station_id = s.id
                     LEFT JOIN machines m    ON r.machine_id = m.id
                     ${where}`;

    const [countRows] = await db.query(`SELECT COUNT(*) AS total ${baseSql}`, values);
    const total = Number(countRows[0]?.total || 0);

    const [rows] = await db.query(
      `SELECT t.*, r.rental_code, s.name AS station_name, m.name AS machine_name
       ${baseSql}
       ORDER BY t.created_at DESC
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
