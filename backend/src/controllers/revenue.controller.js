const db = require('../config/database');

exports.getSummary = async (req, res, next) => {
  try {
    let sql = `SELECT 
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
      COUNT(*) as total_transactions,
      SUM(CASE WHEN transaction_type = 'rental_payment' AND status = 'completed' THEN amount ELSE 0 END) as rental_revenue,
      SUM(CASE WHEN transaction_type = 'deposit' AND status = 'completed' THEN amount ELSE 0 END) as deposit_revenue
      FROM transactions`;

    if (req.user.role === 'location_partner') {
      sql = `SELECT 
        SUM(CASE WHEN t.status = 'completed' THEN t.amount ELSE 0 END) as total_revenue,
        COUNT(*) as total_transactions
        FROM transactions t
        JOIN rentals r ON t.rental_id = r.id
        JOIN cb_stations s ON r.station_id = s.id
        WHERE s.host_partner_id = ?`;
      const [rows] = await db.query(sql, [req.user.id]);
      return res.json({ success: true, data: rows[0] });
    }

    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};

exports.getByStation = async (req, res, next) => {
  try {
    let sql = `SELECT s.id, s.name, SUM(t.amount) as revenue, COUNT(t.id) as transactions
               FROM transactions t 
               JOIN rentals r ON t.rental_id = r.id 
               JOIN cb_stations s ON r.station_id = s.id 
               WHERE t.status = 'completed'`;
    const values = [];

    if (req.user.role === 'location_partner') {
      sql += ' AND s.host_partner_id = ?';
      values.push(req.user.id);
    }

    sql += ' GROUP BY s.id, s.name ORDER BY revenue DESC';
    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getByMachine = async (req, res, next) => {
  try {
    let sql = `SELECT m.id, m.name, s.name as station_name, SUM(t.amount) as revenue, COUNT(t.id) as transactions
               FROM transactions t 
               JOIN rentals r ON t.rental_id = r.id 
               JOIN machines m ON r.machine_id = m.id 
               JOIN cb_stations s ON r.station_id = s.id 
               WHERE t.status = 'completed'`;
    const values = [];

    if (req.user.role === 'location_partner') {
      sql += ' AND s.host_partner_id = ?';
      values.push(req.user.id);
    }

    sql += ' GROUP BY m.id, m.name, s.name ORDER BY revenue DESC';
    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getOverTime = async (req, res, next) => {
  try {
    const { period } = req.query; // daily, weekly, monthly
    let dateFormat = '%Y-%m-%d';
    if (period === 'weekly') dateFormat = '%Y-%u';
    if (period === 'monthly') dateFormat = '%Y-%m';

    let sql = `SELECT DATE_FORMAT(t.created_at, ?) as period, SUM(t.amount) as revenue, COUNT(*) as transactions
               FROM transactions t WHERE t.status = 'completed'`;
    const values = [dateFormat];

    if (req.user.role === 'location_partner') {
      sql = `SELECT DATE_FORMAT(t.created_at, ?) as period, SUM(t.amount) as revenue, COUNT(*) as transactions
             FROM transactions t 
             JOIN rentals r ON t.rental_id = r.id 
             JOIN cb_stations s ON r.station_id = s.id 
             WHERE t.status = 'completed' AND s.host_partner_id = ?`;
      values.push(req.user.id);
    }

    sql += ' GROUP BY period ORDER BY period DESC LIMIT 30';
    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};
