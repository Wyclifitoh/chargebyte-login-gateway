const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status, transaction_type, date_from, date_to } = req.query;
    let sql = 'SELECT * FROM transactions';
    const conditions = [];
    const values = [];

    if (status) { conditions.push('status = ?'); values.push(status); }
    if (transaction_type) { conditions.push('transaction_type = ?'); values.push(transaction_type); }
    if (date_from) { conditions.push('created_at >= ?'); values.push(date_from); }
    if (date_to) { conditions.push('created_at <= ?'); values.push(date_to); }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT 500';

    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getCallbacks = async (req, res, next) => {
  try {
    const { processed, result_code } = req.query;
    let sql = 'SELECT * FROM mpesa_callbacks';
    const conditions = [];
    const values = [];

    if (processed !== undefined) { conditions.push('processed = ?'); values.push(processed); }
    if (result_code !== undefined) { conditions.push('result_code = ?'); values.push(result_code); }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC LIMIT 500';

    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) { next(error); }
};
