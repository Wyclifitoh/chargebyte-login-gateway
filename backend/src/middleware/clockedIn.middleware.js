// Work-gating middleware: requires the user to have an active approved
// clock-in (with no subsequent clock-out) before allowing the wrapped action.
// Used on report/support/operations create endpoints per Phase B spec.

const db = require("../config/database");

// Roles exempt from clock-in gating (admins acting on behalf of staff).
const EXEMPT_ROLES = new Set(["super_admin", "admin"]);

async function requireClockedIn(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }
    if (EXEMPT_ROLES.has(req.user.role)) return next();

    const [rows] = await db.query(
      `SELECT event_type FROM clock_events
       WHERE system_user_id = ? AND status = 'approved'
       ORDER BY event_time DESC LIMIT 1`,
      [req.user.id],
    );
    const last = rows[0];
    if (!last || last.event_type !== "clock_in") {
      return res.status(423).json({
        success: false,
        error: "Please clock in before performing this action.",
        code: "NOT_CLOCKED_IN",
      });
    }
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { requireClockedIn };
