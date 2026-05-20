const db = require("../config/database");

/**
 * GET /api/overview/dashboard
 * Query: period=today|yesterday|week|month|all|custom
 *        date_from=YYYY-MM-DD (when period=custom)
 *        date_to=YYYY-MM-DD   (when period=custom)
 *
 * Returns a FLAT shape that matches the frontend OverviewData hook:
 * {
 *   period, date_from, date_to,
 *   totalRevenue, activeRentals, onlineMachines, totalMachines,
 *   totalSessions, recentTransactions, revenueByMonth, sessionsByStation
 * }
 */
function resolveRange(query) {
  const period = (query.period || "today").toLowerCase();
  const now = new Date();
  let from = null;
  let to = null;

  switch (period) {
    case "today": {
      from = new Date(now);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case "yesterday": {
      from = new Date(now);
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case "week": {
      from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case "month": {
      from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      to = new Date(now);
      to.setHours(23, 59, 59, 999);
      break;
    }
    case "custom": {
      if (query.date_from) {
        from = new Date(query.date_from);
        from.setHours(0, 0, 0, 0);
      }
      if (query.date_to) {
        to = new Date(query.date_to);
        to.setHours(23, 59, 59, 999);
      }
      break;
    }
    case "all":
    default:
      // no filter
      break;
  }
  return { period, from, to };
}

function fmt(d) {
  return d ? d.toISOString().slice(0, 19).replace("T", " ") : null;
}

exports.getDashboardV1 = async (req, res, next) => {
  try {
    const { period, from, to } = resolveRange(req.query);

    // Build date conditions as objects instead of strings
    const dateConds = [];
    const dateVals = [];
    const dateCondsWithPrefix = []; // For queries with table prefixes

    if (from) {
      dateConds.push("created_at >= ?");
      dateCondsWithPrefix.push("r.created_at >= ?");
      dateVals.push(fmt(from));
    }
    if (to) {
      dateConds.push("created_at <= ?");
      dateCondsWithPrefix.push("r.created_at <= ?");
      dateVals.push(fmt(to));
    }

    const whereClause = dateConds.length
      ? "WHERE " + dateConds.join(" AND ")
      : "";
    const whereClauseWithPrefix = dateCondsWithPrefix.length
      ? "WHERE " + dateCondsWithPrefix.join(" AND ")
      : "";

    // Rentals stats (date-filtered)
    const [rentalStats] = await db.query(
      `SELECT COUNT(*) as total_rentals,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_rentals,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_rentals
       FROM rentals ${whereClause}`,
      dateVals,
    );

    // Machines (always current state)
    const [machineStats] = await db.query(
      `SELECT COUNT(*) as total_machines,
              SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online
       FROM machines`,
    );

    // Transactions stats (date-filtered)
    const [txStats] = await db.query(
      `SELECT SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
              COUNT(*) as total_transactions
       FROM transactions ${whereClause}`,
      dateVals,
    );

    // Recent transactions (date-filtered)
    const [recentTransactions] = await db.query(
      `SELECT * FROM transactions ${whereClause}
       ORDER BY created_at DESC LIMIT 10`,
      dateVals,
    );

    // Revenue by day (last 30 days, regardless of period — for the trend chart)
    const [revenueByDay] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as month,
              SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as revenue
       FROM transactions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY month ORDER BY month ASC`,
    );

    // Sessions by station (date-filtered) - FIXED
    let sessionsSql = `
      SELECT s.name as name, COUNT(r.id) as sessions
      FROM rentals r
      JOIN cb_stations s ON r.station_id = s.id
      ${whereClauseWithPrefix}
      GROUP BY s.id, s.name
      ORDER BY sessions DESC LIMIT 10
    `;

    const [sessionsByStation] = await db.query(sessionsSql, dateVals);

    res.json({
      success: true,
      data: {
        period,
        date_from: fmt(from),
        date_to: fmt(to),
        totalRevenue: Number(txStats[0]?.total_revenue || 0),
        activeRentals: Number(rentalStats[0]?.active_rentals || 0),
        onlineMachines: Number(machineStats[0]?.online || 0),
        totalMachines: Number(machineStats[0]?.total_machines || 0),
        totalSessions: Number(rentalStats[0]?.total_rentals || 0),
        recentTransactions: recentTransactions || [],
        revenueByMonth: (revenueByDay || []).map((r) => ({
          month: r.month,
          revenue: Number(r.revenue || 0),
        })),
        sessionsByStation: (sessionsByStation || []).map((r) => ({
          name: r.name,
          sessions: Number(r.sessions || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    next(error);
  }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const { period, from, to } = resolveRange(req.query);

    // Build date conditions
    const dateConds = [];
    const dateVals = [];
    const dateCondsWithPrefix = []; // For queries with table prefixes

    if (from) {
      dateConds.push("created_at >= ?");
      dateCondsWithPrefix.push("r.created_at >= ?");
      dateVals.push(fmt(from));
    }
    if (to) {
      dateConds.push("created_at <= ?");
      dateCondsWithPrefix.push("r.created_at <= ?");
      dateVals.push(fmt(to));
    }

    const whereClause = dateConds.length
      ? "WHERE " + dateConds.join(" AND ")
      : "";
    const whereClauseWithPrefix = dateCondsWithPrefix.length
      ? "WHERE " + dateCondsWithPrefix.join(" AND ")
      : "";

    // Rentals stats (date-filtered) - THIS IS THE MAIN SOURCE FOR REVENUE
    const [rentalStats] = await db.query(
      `SELECT COUNT(*) as total_rentals,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_rentals,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_rentals,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
          SUM(deposit_amount) as total_deposits
   FROM rentals ${whereClause}`,
      dateVals,
    );

    // Machines (always current state)
    const [machineStats] = await db.query(
      `SELECT COUNT(*) as total_machines,
              SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) as online
       FROM machines`,
    );

    // Transactions stats (date-filtered) - Only for transaction count, NOT for revenue
    const [txStats] = await db.query(
      `SELECT COUNT(*) as total_transactions
       FROM transactions ${whereClause}`,
      dateVals,
    );

    // Recent rentals (date-filtered) - Show completed rentals with their revenue
    const [recentRentals] = await db.query(
      `SELECT * FROM rentals ${whereClause}
       ORDER BY created_at DESC LIMIT 10`,
      dateVals,
    );

    // Revenue by day (last 30 days from rentals table)
    const [revenueByDay] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as month,
              SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as revenue
       FROM rentals
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY month ORDER BY month ASC`,
    );

    // Sessions by station (date-filtered)
    let sessionsSql = `
      SELECT s.name as name, COUNT(r.id) as sessions
      FROM rentals r
      JOIN cb_stations s ON r.station_id = s.id
      ${whereClauseWithPrefix}
      GROUP BY s.id, s.name
      ORDER BY sessions DESC LIMIT 10
    `;

    const [sessionsByStation] = await db.query(sessionsSql, dateVals);

    // Recent transactions (from transactions table for payment history)
    const [recentTransactions] = await db.query(
      `SELECT * FROM transactions ${whereClause}
       ORDER BY created_at DESC LIMIT 10`,
      dateVals,
    );

    res.json({
      success: true,
      data: {
        period,
        date_from: fmt(from),
        date_to: fmt(to),
        totalRevenue: Number(rentalStats[0]?.total_revenue || 0),
        activeRentals: Number(rentalStats[0]?.active_rentals || 0),
        onlineMachines: Number(machineStats[0]?.online || 0),
        totalMachines: Number(machineStats[0]?.total_machines || 0),
        totalSessions: Number(rentalStats[0]?.total_rentals || 0),
        totalTransactions: Number(txStats[0]?.total_transactions || 0),
        recentRentals: recentRentals || [],
        recentTransactions: recentTransactions || [],
        revenueByMonth: (revenueByDay || []).map((r) => ({
          month: r.month,
          revenue: Number(r.revenue || 0),
        })),
        sessionsByStation: (sessionsByStation || []).map((r) => ({
          name: r.name,
          sessions: Number(r.sessions || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    next(error);
  }
};
