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

    // ---- SINGLE SOURCE OF TRUTH: the `rentals` table.
    // This is exactly what the Rentals Management page reads, so the two
    // dashboards are guaranteed to show identical figures.
    const rConds = [];
    const rVals = [];
    if (from) { rConds.push('r.created_at >= ?'); rVals.push(fmt(from)); }
    if (to)   { rConds.push('r.created_at <= ?'); rVals.push(fmt(to)); }
    if (req.user.role === 'location_partner') {
      rConds.push('s.host_partner_id = ?');
      rVals.push(req.user.id);
    }
    const rWhere = rConds.length ? ' WHERE ' + rConds.join(' AND ') : '';
    const [rentalRows] = await db.query(
      `SELECT
         COUNT(*)                                AS rentals_count,
         COALESCE(SUM(r.total_amount), 0)        AS rental_charges,
         COALESCE(SUM(r.deposit_amount), 0)      AS deposits_collected,
         COALESCE(SUM(CASE WHEN r.deposit_refunded = 1 THEN r.deposit_amount ELSE 0 END), 0) AS refunds_issued
       FROM rentals r
       LEFT JOIN cb_stations s ON r.station_id = s.id
       ${rWhere}`,
      rVals,
    );
    const rentalAgg = rentalRows[0] || {};

    // Transaction volume is shown only as an informational figure (gross M-Pesa
    // movements). It is NOT used to compute revenue.
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
      `SELECT
         COUNT(*) AS total_transactions,
         COALESCE(SUM(t.amount), 0) AS transaction_volume
       FROM transactions t ${tJoin}
       WHERE ${tConds.join(' AND ')}`,
      tVals,
    );
    const txAgg = txRows[0] || {};

    const rental_charges     = Number(rentalAgg.rental_charges || 0);
    const deposits_collected = Number(rentalAgg.deposits_collected || 0);
    const refunds_issued     = Number(rentalAgg.refunds_issued || 0);

    // Accountant's formula:
    //   Net Revenue = Rental Charges + (Deposits Collected − Refunds Issued)
    const forfeited_deposits = Math.max(deposits_collected - refunds_issued, 0);
    const net_revenue        = rental_charges + forfeited_deposits;

    res.json({
      success: true,
      data: {
        net_revenue,
        rental_charges,
        deposits_collected,
        refunds_issued,
        forfeited_deposits,
        rentals_count: Number(rentalAgg.rentals_count || 0),

        // Informational only
        transaction_volume: Number(txAgg.transaction_volume || 0),
        total_transactions: Number(txAgg.total_transactions || 0),

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
