const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { type, severity, is_read } = req.query;
    let sql = 'SELECT * FROM notifications WHERE dismissed = 0 AND JSON_CONTAINS(target_roles, ?)';
    const values = [JSON.stringify(req.user.role)];

    if (type) { sql += ' AND type = ?'; values.push(type); }
    if (severity) { sql += ' AND severity = ?'; values.push(severity); }
    if (is_read !== undefined) { sql += ' AND is_read = ?'; values.push(is_read); }

    sql += ' ORDER BY created_at DESC LIMIT 200';
    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) { next(error); }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND dismissed = 0 AND JSON_CONTAINS(target_roles, ?)',
      [JSON.stringify(req.user.role)]
    );
    res.json({ success: true, data: { count: rows[0].count } });
  } catch (error) { next(error); }
};

exports.markRead = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (error) { next(error); }
};

exports.dismiss = async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET dismissed = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { message: 'Dismissed' } });
  } catch (error) { next(error); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE JSON_CONTAINS(target_roles, ?) AND is_read = 0',
      [JSON.stringify(req.user.role)]
    );
    res.json({ success: true, data: { message: 'All marked as read' } });
  } catch (error) { next(error); }
};
