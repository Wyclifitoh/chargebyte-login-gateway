const db = require('../config/database');

exports.getLocations = async (req, res, next) => {
  try {
    const [locations] = await db.query('SELECT * FROM activation_locations ORDER BY visit_date DESC');
    res.json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};

exports.getContacts = async (req, res, next) => {
  try {
    const { activation_id, page = 1, limit = 50 } = req.query;
    let where = [];
    let params = [];
    if (activation_id) { where.push('activation_id = ?'); params.push(parseInt(activation_id)); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const [contacts] = await db.query(
      `SELECT * FROM activation_contacts ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const [stats] = await db.query('SELECT * FROM activation_stats_daily ORDER BY stat_date DESC');
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
