const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { user_id, action, table_name, date_from, date_to } = req.query;
    let sql = `SELECT al.*, u.name as user_name, u.email as user_email 
               FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id`;
    const conditions = [];
    const values = [];

    if (user_id) { conditions.push('al.user_id = ?'); values.push(user_id); }
    if (action) { conditions.push('al.action = ?'); values.push(action); }
    if (table_name) { conditions.push('al.table_name = ?'); values.push(table_name); }
    if (date_from) { conditions.push('al.created_at >= ?'); values.push(date_from); }
    if (date_to) { conditions.push('al.created_at <= ?'); values.push(date_to); }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY al.created_at DESC LIMIT 500';

    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};
