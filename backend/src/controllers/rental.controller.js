const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status, station_id, date_from, date_to, search } = req.query;
    let sql = `SELECT r.*, s.name as station_name, m.name as machine_name 
               FROM rentals r 
               JOIN cb_stations s ON r.station_id = s.id 
               JOIN machines m ON r.machine_id = m.id`;
    const conditions = [];
    const values = [];

    if (status) { conditions.push('r.status = ?'); values.push(status); }
    if (station_id) { conditions.push('r.station_id = ?'); values.push(station_id); }
    if (date_from) { conditions.push('r.start_time >= ?'); values.push(date_from); }
    if (date_to) { conditions.push('r.start_time <= ?'); values.push(date_to); }
    if (search) { conditions.push('(r.customer_name LIKE ? OR r.powerbank_id LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY r.created_at DESC LIMIT 500';

    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, s.name as station_name, m.name as machine_name 
       FROM rentals r JOIN cb_stations s ON r.station_id = s.id JOIN machines m ON r.machine_id = m.id 
       WHERE r.id = ?`,
      [req.params.id]
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
