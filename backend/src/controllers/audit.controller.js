const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { user_id, action, table_name, date_from, date_to, search, page = 1, limit = 100 } = req.query;
    const conds = []; const vals = [];
    if (user_id)    { conds.push('al.user_id = ?');     vals.push(user_id); }
    if (action)     { conds.push('al.action = ?');      vals.push(action); }
    if (table_name) { conds.push('al.table_name = ?');  vals.push(table_name); }
    if (date_from)  { conds.push('al.created_at >= ?'); vals.push(date_from); }
    if (date_to)    { conds.push('al.created_at <= ?'); vals.push(date_to); }
    if (search)     { conds.push('(al.record_id LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)'); vals.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const lim = Math.min(Number(limit) || 100, 500);
    const off = (Math.max(Number(page) || 1, 1) - 1) * lim;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) total FROM audit_logs al LEFT JOIN system_users u ON al.user_id = u.id ${where}`,
      vals
    );
    const [rows] = await db.query(
      `SELECT al.*, u.full_name AS user_name, u.email AS user_email, u.role AS user_role
       FROM audit_logs al LEFT JOIN system_users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [...vals, lim, off]
    );
    res.json({ success: true, data: rows, meta: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) } });
  } catch (error) { next(error); }
};

exports.getFilters = async (req, res, next) => {
  try {
    const [actions] = await db.query('SELECT DISTINCT action FROM audit_logs ORDER BY action');
    const [tables] = await db.query('SELECT DISTINCT table_name FROM audit_logs ORDER BY table_name');
    res.json({ success: true, data: { actions: actions.map(r => r.action), tables: tables.map(r => r.table_name) } });
  } catch (e) { next(e); }
};
