// Phase 6 — Agent Performance
// Aggregates KPIs per field agent from clock_events, daily_reports, rentals, and support_tickets.
const db = require('../config/database');

function dateRangeParams(q) {
  const to = q.to || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  const days = parseInt(q.days || '30', 10);
  const from = q.from || new Date(Date.now() - days * 86400000)
    .toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
  return { from, to };
}

// GET /api/performance/leaderboard?from=&to=&agent_id=
exports.leaderboard = async (req, res, next) => {
  try {
    const { from, to } = dateRangeParams(req.query);

    // 1) all agents: staff/admins that have any clock event or daily report in range,
    //    OR are in team_members with system_user_id.
    const [agents] = await db.query(
      `SELECT DISTINCT u.id, u.full_name, u.email, u.role, tm.category, tm.id AS team_member_id
         FROM system_users u
         LEFT JOIN team_members tm ON tm.system_user_id = u.id
        WHERE u.is_active = 1
          AND (u.role IN ('staff','admin','super_admin') OR tm.id IS NOT NULL)`
    );

    if (agents.length === 0) return res.json({ success: true, data: [] });

    const ids = agents.map(a => a.id);
    const placeholders = ids.map(() => '?').join(',');

    // 2) shift metrics
    const [shifts] = await db.query(
      `SELECT system_user_id,
              DATE(CONVERT_TZ(event_time,'+00:00','+03:00')) AS d,
              MIN(CASE WHEN event_type='clock_in'  THEN event_time END) AS first_in,
              MAX(CASE WHEN event_type='clock_out' THEN event_time END) AS last_out
         FROM clock_events
        WHERE status='approved' AND system_user_id IN (${placeholders})
          AND DATE(CONVERT_TZ(event_time,'+00:00','+03:00')) BETWEEN ? AND ?
        GROUP BY system_user_id, d`,
      [...ids, from, to]
    );

    // 3) reports
    const [reports] = await db.query(
      `SELECT agent_user_id, COUNT(*) AS cnt
         FROM daily_reports
        WHERE agent_user_id IN (${placeholders})
          AND report_date BETWEEN ? AND ?
        GROUP BY agent_user_id`,
      [...ids, from, to]
    );

    // 4) rentals & returns for stations tied to each agent's clock-ins
    //    (attribute a rental to whoever was clocked in at that station that day)
    const [rentalRows] = await db.query(
      `SELECT ce.system_user_id, COUNT(DISTINCT r.id) AS rentals,
              SUM(CASE WHEN r.end_time IS NOT NULL THEN 1 ELSE 0 END) AS returns,
              COALESCE(SUM(r.total_amount),0) AS revenue
         FROM clock_events ce
         JOIN rentals r
           ON r.station_id = ce.station_id
          AND DATE(CONVERT_TZ(r.start_time,'+00:00','+03:00')) = DATE(CONVERT_TZ(ce.event_time,'+00:00','+03:00'))
        WHERE ce.status='approved' AND ce.event_type='clock_in'
          AND ce.system_user_id IN (${placeholders})
          AND DATE(CONVERT_TZ(ce.event_time,'+00:00','+03:00')) BETWEEN ? AND ?
        GROUP BY ce.system_user_id`,
      [...ids, from, to]
    );

    // 5) support tickets resolved (assigned_to)
    let tickets = [];
    try {
      const [t] = await db.query(
        `SELECT assigned_to AS uid,
                SUM(status IN ('resolved','closed')) AS resolved,
                COUNT(*) AS total
           FROM support_tickets
          WHERE assigned_to IN (${placeholders})
            AND DATE(CONVERT_TZ(created_at,'+00:00','+03:00')) BETWEEN ? AND ?
          GROUP BY assigned_to`,
        [...ids, from, to]
      );
      tickets = t;
    } catch { /* support_tickets may not exist */ }

    // aggregate per agent
    const totalDays = Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1);
    const byId = new Map(agents.map(a => [a.id, {
      id: a.id, name: a.full_name, email: a.email, role: a.role,
      category: a.category || null,
      days_worked: 0, hours_worked: 0, on_time_days: 0, late_days: 0,
      rentals: 0, returns: 0, revenue: 0, reports: 0,
      tickets_total: 0, tickets_resolved: 0,
      attendance_rate: 0, punctuality_rate: 0, avg_hours: 0, score: 0,
    }]));

    for (const s of shifts) {
      const a = byId.get(s.system_user_id); if (!a) continue;
      a.days_worked += 1;
      if (s.first_in && s.last_out) {
        a.hours_worked += Math.max(0, (new Date(s.last_out) - new Date(s.first_in)) / 3600000);
      }
      if (s.first_in) {
        // Nairobi hour of first_in
        const h = new Date(s.first_in).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', hour12: false });
        const m = h.match(/(\d{2}):(\d{2})/);
        const hr = m ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60 : 8;
        if (hr <= 15.25) a.on_time_days += 1; else a.late_days += 1; // shift starts 15:00
      }
    }
    for (const r of reports) { const a = byId.get(r.agent_user_id); if (a) a.reports = Number(r.cnt); }
    for (const r of rentalRows) {
      const a = byId.get(r.system_user_id); if (!a) continue;
      a.rentals = Number(r.rentals || 0);
      a.returns = Number(r.returns || 0);
      a.revenue = Number(r.revenue || 0);
    }
    for (const t of tickets) {
      const a = byId.get(t.uid); if (!a) continue;
      a.tickets_total = Number(t.total || 0);
      a.tickets_resolved = Number(t.resolved || 0);
    }

    const rows = Array.from(byId.values()).map(a => {
      a.attendance_rate = Math.round((a.days_worked / totalDays) * 100);
      const shiftsWithIn = a.on_time_days + a.late_days;
      a.punctuality_rate = shiftsWithIn ? Math.round((a.on_time_days / shiftsWithIn) * 100) : 0;
      a.avg_hours = a.days_worked ? Math.round((a.hours_worked / a.days_worked) * 100) / 100 : 0;
      a.hours_worked = Math.round(a.hours_worked * 100) / 100;
      // composite score (0-100)
      const rentalScore = Math.min(100, a.rentals * 2);
      const reportScore = Math.min(100, (a.reports / Math.max(1, a.days_worked)) * 100);
      a.score = Math.round(
        a.attendance_rate * 0.30 +
        a.punctuality_rate * 0.20 +
        rentalScore * 0.25 +
        reportScore * 0.15 +
        (a.tickets_total ? (a.tickets_resolved / a.tickets_total) * 100 : 0) * 0.10
      );
      return a;
    }).filter(a => a.days_worked > 0 || a.rentals > 0 || a.reports > 0)
      .sort((x, y) => y.score - x.score);

    res.json({ success: true, data: rows, meta: { from, to, total_days: totalDays } });
  } catch (e) { next(e); }
};

// GET /api/performance/agent/:id
exports.agentDetail = async (req, res, next) => {
  try {
    const { from, to } = dateRangeParams(req.query);
    const id = req.params.id;

    const [[user]] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.role, tm.category, tm.phone_number
         FROM system_users u LEFT JOIN team_members tm ON tm.system_user_id = u.id
        WHERE u.id = ? LIMIT 1`, [id]
    );
    if (!user) return res.status(404).json({ success: false, error: 'Agent not found' });

    const [daily] = await db.query(
      `SELECT DATE(CONVERT_TZ(event_time,'+00:00','+03:00')) AS d,
              MIN(CASE WHEN event_type='clock_in'  THEN event_time END) AS first_in,
              MAX(CASE WHEN event_type='clock_out' THEN event_time END) AS last_out,
              MAX(location_name) AS location
         FROM clock_events
        WHERE system_user_id = ? AND status='approved'
          AND DATE(CONVERT_TZ(event_time,'+00:00','+03:00')) BETWEEN ? AND ?
        GROUP BY d ORDER BY d ASC`,
      [id, from, to]
    );

    const days = daily.map(d => ({
      date: d.d,
      first_in: d.first_in,
      last_out: d.last_out,
      location: d.location,
      hours: d.first_in && d.last_out
        ? Math.round(((new Date(d.last_out) - new Date(d.first_in)) / 3600000) * 100) / 100
        : null,
    }));

    const [reports] = await db.query(
      `SELECT id, report_date, location, rentals_auto, returns_auto, pending_auto,
              machine_cleanliness, submitted_at, created_at
         FROM daily_reports
        WHERE agent_user_id = ? AND report_date BETWEEN ? AND ?
        ORDER BY report_date DESC`,
      [id, from, to]
    );

    res.json({ success: true, data: { user, days, reports, range: { from, to } } });
  } catch (e) { next(e); }
};
