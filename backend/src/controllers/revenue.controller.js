const db = require('../config/database');

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

function txDateClause(from, to, alias = 't') {
  const c = []; const v = [];
  if (from) { c.push(`${alias}.created_at >= ?`); v.push(fmt(from)); }
  if (to)   { c.push(`${alias}.created_at <= ?`); v.push(fmt(to)); }
  return { clause: c.length ? c.join(' AND ') : '', values: v };
}

exports.getSummary = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { clause, values } = txDateClause(from, to, 't');

    let sql = `SELECT
      SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END) as total_revenue,
      COUNT(*) as total_transactions,
      SUM(CASE WHEN t.transaction_type = 'rental_charge' AND t.status = 'completed' THEN t.amount ELSE 0 END) as rental_revenue,
      SUM(CASE WHEN t.transaction_type = 'deposit' AND t.status = 'completed' THEN t.amount ELSE 0 END) as deposit_revenue,
      SUM(CASE WHEN t.transaction_type = 'refund' AND t.status = 'completed' THEN t.amount ELSE 0 END) as refund_revenue
      FROM transactions t`;
    const allValues = [...values];

    if (req.user.role === 'location_partner') {
      sql += ` JOIN rentals r ON t.rental_id = r.id
               JOIN cb_stations s ON r.station_id = s.id
               WHERE s.host_partner_id = ?`;
      allValues.unshift(); // keep order
      allValues.push(req.user.id);
      if (clause) sql += ' AND ' + clause;
    } else if (clause) {
      sql += ' WHERE ' + clause;
    }

    // Reorder values for partner case (date conds appear after partner id)
    let finalValues = values.slice();
    if (req.user.role === 'location_partner') {
      finalValues = [req.user.id, ...values];
    }

    const [rows] = await db.query(sql, finalValues);
    res.json({ success: true, data: rows[0] || {} });
  } catch (error) { next(error); }
};

exports.getByStation = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { clause, values } = txDateClause(from, to, 't');

    let sql = `SELECT s.id, s.name, SUM(t.amount) as revenue, COUNT(t.id) as transactions
               FROM transactions t
               JOIN rentals r ON t.rental_id = r.id
               JOIN cb_stations s ON r.station_id = s.id
               WHERE t.status = 'completed'`;
    const finalValues = [];
    if (clause) { sql += ' AND ' + clause; finalValues.push(...values); }
    if (req.user.role === 'location_partner') {
      sql += ' AND s.host_partner_id = ?';
      finalValues.push(req.user.id);
    }
    sql += ' GROUP BY s.id, s.name ORDER BY revenue DESC';

    const [rows] = await db.query(sql, finalValues);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getByMachine = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { clause, values } = txDateClause(from, to, 't');

    let sql = `SELECT m.id, m.name, s.name as station_name, SUM(t.amount) as revenue, COUNT(t.id) as transactions
               FROM transactions t
               JOIN rentals r ON t.rental_id = r.id
               JOIN machines m ON r.machine_id = m.id
               JOIN cb_stations s ON r.station_id = s.id
               WHERE t.status = 'completed'`;
    const finalValues = [];
    if (clause) { sql += ' AND ' + clause; finalValues.push(...values); }
    if (req.user.role === 'location_partner') {
      sql += ' AND s.host_partner_id = ?';
      finalValues.push(req.user.id);
    }
    sql += ' GROUP BY m.id, m.name, s.name ORDER BY revenue DESC';

    const [rows] = await db.query(sql, finalValues);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getOverTime = async (req, res, next) => {
  try {
    const { period: rawPeriod } = req.query;
    const periodFmt = rawPeriod === 'monthly' ? '%Y-%m'
                     : rawPeriod === 'weekly' ? '%Y-%u'
                     : '%Y-%m-%d';
    const { from, to } = resolveRange(req.query);
    const { clause, values } = txDateClause(from, to, 't');

    let sql = `SELECT DATE_FORMAT(t.created_at, ?) as period,
                      SUM(t.amount) as revenue,
                      COUNT(*) as transactions
               FROM transactions t
               WHERE t.status = 'completed'`;
    const finalValues = [periodFmt];
    if (clause) { sql += ' AND ' + clause; finalValues.push(...values); }

    if (req.user.role === 'location_partner') {
      sql = `SELECT DATE_FORMAT(t.created_at, ?) as period,
                    SUM(t.amount) as revenue,
                    COUNT(*) as transactions
             FROM transactions t
             JOIN rentals r ON t.rental_id = r.id
             JOIN cb_stations s ON r.station_id = s.id
             WHERE t.status = 'completed' AND s.host_partner_id = ?`;
      finalValues.length = 0;
      finalValues.push(periodFmt, req.user.id);
      if (clause) { sql += ' AND ' + clause; finalValues.push(...values); }
    }

    sql += ' GROUP BY period ORDER BY period ASC LIMIT 60';
    const [rows] = await db.query(sql, finalValues);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getBreakdown = async (req, res, next) => {
  try {
    const { from, to } = resolveRange(req.query);
    const { clause, values } = txDateClause(from, to, 't');
    let sql = `SELECT t.transaction_type as type, SUM(t.amount) as value, COUNT(*) as count
               FROM transactions t WHERE t.status = 'completed'`;
    const finalValues = [];
    if (clause) { sql += ' AND ' + clause; finalValues.push(...values); }
    sql += ' GROUP BY t.transaction_type';
    const [rows] = await db.query(sql, finalValues);
    res.json({ success: true, data: rows });
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
