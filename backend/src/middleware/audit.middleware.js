const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const auditLog = (action, tableName) => {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = async function(data) {
      try {
        if (data && data.success && req.user) {
          await db.query(
            'INSERT INTO audit_logs (id, user_id, action, table_name, record_id, ip_address, user_agent, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              uuidv4(),
              req.user.id,
              action,
              tableName,
              req.params.id || (data.data && data.data.id) || null,
              req.ip || req.connection.remoteAddress,
              req.get('User-Agent') || '',
              req._oldValues ? JSON.stringify(req._oldValues) : null,
              req.body ? JSON.stringify(req.body) : null
            ]
          );
        }
      } catch (err) {
        console.error('Audit log error:', err.message);
      }
      return originalJson(data);
    };
    next();
  };
};

module.exports = { auditLog };
