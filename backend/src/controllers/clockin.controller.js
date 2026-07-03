const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");

// ---------- config ----------
// Allowed clock-in/out window in Africa/Nairobi local time (24h).
// Wide enough for the 1500–2300 shifts plus early arrivals / late returns.
const ALLOWED_START_HOUR = 4; // 04:00
const ALLOWED_END_HOUR = 24; // up to 23:59:59
const MIN_GAP_SECONDS = 30; // anti double-tap

// ---------- helpers ----------
function getClientIp(req) {
  const fwd = (req.headers["x-forwarded-for"] || "")
    .toString()
    .split(",")[0]
    .trim();
  let ip = fwd || req.ip || req.connection?.remoteAddress || "";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

function ipv4ToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)
  )
    return null;
  return (
    ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  );
}

function ipInCidr(ip, cidr) {
  if (!ip || !cidr) return false;
  if (!cidr.includes("/")) return ip === cidr;
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return ip.startsWith(range);
  if (bits <= 0) return true;
  if (bits > 32) return false;
  const mask = bits === 32 ? 0xffffffff : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Hour-of-day in Africa/Nairobi without DST headaches
function nairobiHour(date = new Date()) {
  const s = date.toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    hour12: false,
  });
  // dd/mm/yyyy, HH:MM:SS
  const m = s.match(/(\d{2}):(\d{2}):(\d{2})/);
  return m
    ? parseInt(m[1], 10) + parseInt(m[2], 10) / 60
    : new Date().getHours();
}

async function findTeamMember(user) {
  const [rows] = await db.query(
    `SELECT id, full_name FROM team_members
     WHERE system_user_id = ? OR (email IS NOT NULL AND email = ?) LIMIT 1`,
    [user.id, user.email || ""],
  );
  return rows[0] || null;
}

async function getLastEvent(userId) {
  const [rows] = await db.query(
    `SELECT id, event_type, event_time, status FROM clock_events
     WHERE system_user_id = ? AND status = 'approved'
     ORDER BY event_time DESC LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function getLastAnyEvent(userId) {
  const [rows] = await db.query(
    `SELECT id, event_type, event_time, status FROM clock_events
     WHERE system_user_id = ? ORDER BY event_time DESC LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

// ---------- whitelist CRUD ----------
exports.listWhitelist = async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM clockin_whitelist ORDER BY is_active DESC, created_at DESC`,
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.createWhitelist = async (req, res, next) => {
  try {
    const { name, type, ip_cidr, latitude, longitude, radius_meters, notes } =
      req.body;
    if (!name || !type)
      return res
        .status(400)
        .json({ success: false, error: "name and type required" });
    if ((type === "ip" || type === "cidr") && !ip_cidr)
      return res
        .status(400)
        .json({ success: false, error: "ip_cidr required" });
    if (type === "geo" && (latitude == null || longitude == null))
      return res
        .status(400)
        .json({ success: false, error: "latitude/longitude required" });
    const id = uuidv4();
    await db.query(
      `INSERT INTO clockin_whitelist (id, name, type, ip_cidr, latitude, longitude, radius_meters, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        name,
        type,
        ip_cidr || null,
        latitude ?? null,
        longitude ?? null,
        radius_meters || 150,
        notes || null,
      ],
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

exports.updateWhitelist = async (req, res, next) => {
  try {
    const fields = [
      "name",
      "type",
      "ip_cidr",
      "latitude",
      "longitude",
      "radius_meters",
      "notes",
      "is_active",
    ];
    const upd = [];
    const vals = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        upd.push(`${f} = ?`);
        vals.push(f === "is_active" ? (req.body[f] ? 1 : 0) : req.body[f]);
      }
    }
    if (upd.length) {
      vals.push(req.params.id);
      await db.query(
        `UPDATE clockin_whitelist SET ${upd.join(", ")} WHERE id = ?`,
        vals,
      );
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) {
    next(e);
  }
};

exports.removeWhitelist = async (req, res, next) => {
  try {
    await db.query("DELETE FROM clockin_whitelist WHERE id = ?", [
      req.params.id,
    ]);
    res.json({ success: true, data: { message: "Whitelist entry removed" } });
  } catch (e) {
    next(e);
  }
};

// ---------- clock in/out ----------
exports.clock = async (req, res, next) => {
  try {
    const {
      event_type,
      latitude,
      longitude,
      accuracy,
      station_id,
      location_name,
    } = req.body;
    if (!["clock_in", "clock_out"].includes(event_type)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid event_type" });
    }

    // ---- timing rule: allowed Nairobi hours ----
    const hr = nairobiHour();
    if (hr < ALLOWED_START_HOUR || hr >= ALLOWED_END_HOUR) {
      return res.status(403).json({
        success: false,
        error: `Clock ${event_type === "clock_in" ? "in" : "out"} is only allowed between ${ALLOWED_START_HOUR}:00 and ${ALLOWED_END_HOUR}:00 (EAT).`,
      });
    }

    // ---- dedupe & sequence rules ----
    const last = await getLastAnyEvent(req.user.id);
    if (last) {
      const sec = (Date.now() - new Date(last.event_time).getTime()) / 1000;
      if (sec < MIN_GAP_SECONDS) {
        return res.status(429).json({
          success: false,
          error: `Please wait ${Math.ceil(MIN_GAP_SECONDS - sec)}s before another clock action.`,
        });
      }
      // Only check approved sequence — rejected events don't count toward state
      const lastApproved = await getLastEvent(req.user.id);
      if (lastApproved) {
        if (
          event_type === "clock_in" &&
          lastApproved.event_type === "clock_in"
        ) {
          return res
            .status(409)
            .json({
              success: false,
              error: "You are already clocked in. Clock out first.",
            });
        }
        if (
          event_type === "clock_out" &&
          lastApproved.event_type !== "clock_in"
        ) {
          return res
            .status(409)
            .json({ success: false, error: "You are not clocked in." });
        }
      } else if (event_type === "clock_out") {
        return res
          .status(409)
          .json({
            success: false,
            error: "You have no active clock-in to close.",
          });
      }
    } else if (event_type === "clock_out") {
      return res
        .status(409)
        .json({
          success: false,
          error: "You have no active clock-in to close.",
        });
    }

    const ip = getClientIp(req);
    const ua = (req.get("User-Agent") || "").slice(0, 255);
    const member = await findTeamMember(req.user);

    // Resolve location_name (station name if station_id provided)
    let resolvedLocation = location_name || null;
    if (station_id && !resolvedLocation) {
      const [s] = await db.query(
        "SELECT name FROM cb_stations WHERE id = ? LIMIT 1",
        [station_id],
      );
      if (s.length) resolvedLocation = s[0].name;
    }

    // Evaluate whitelist
    const [wl] = await db.query(
      `SELECT * FROM clockin_whitelist WHERE is_active = 1`,
    );
    let matched = null;
    let reason = "";
    if (wl.length === 0) {
      // No whitelist → allow but mark approved (open mode for first-time setup)
      matched = { id: null, name: "No whitelist (open mode)" };
    } else {
      for (const w of wl) {
        if ((w.type === "ip" || w.type === "cidr") && w.ip_cidr) {
          if (ipInCidr(ip, w.ip_cidr)) {
            matched = w;
            break;
          }
        } else if (
          w.type === "geo" &&
          w.latitude != null &&
          w.longitude != null
        ) {
          if (latitude == null || longitude == null) continue;
          const dist = haversineMeters(
            Number(latitude),
            Number(longitude),
            Number(w.latitude),
            Number(w.longitude),
          );
          if (dist <= (w.radius_meters || 150)) {
            matched = w;
            break;
          }
        }
      }
      if (!matched)
        reason = `Location not whitelisted (IP: ${ip || "unknown"})`;
    }

    const id = uuidv4();
    const status = matched ? "approved" : "rejected";
    await db.query(
      `INSERT INTO clock_events
       (id, team_member_id, system_user_id, event_type, ip_address, latitude, longitude,
        accuracy_meters, matched_whitelist_id, station_id, location_name, status, reject_reason, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        member?.id || null,
        req.user.id,
        event_type,
        ip,
        latitude ?? null,
        longitude ?? null,
        accuracy ? Math.round(accuracy) : null,
        matched?.id || null,
        station_id || null,
        resolvedLocation,
        status,
        matched ? null : reason,
        ua,
      ],
    );

    if (!matched) {
      return res
        .status(403)
        .json({ success: false, error: reason, data: { id, status } });
    }
    res.json({
      success: true,
      data: {
        id,
        status,
        event_type,
        matched_whitelist: matched.name,
        location: resolvedLocation,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.myEvents = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, event_type, event_time, ip_address, status, reject_reason, location_name, station_id
       FROM clock_events WHERE system_user_id = ?
       ORDER BY event_time DESC LIMIT 100`,
      [req.user.id],
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.events = async (req, res, next) => {
  try {
    const { member_id, status, from, to, limit = 200 } = req.query;
    const conds = [];
    const vals = [];
    if (member_id) {
      conds.push("ce.team_member_id = ?");
      vals.push(member_id);
    }
    if (status) {
      conds.push("ce.status = ?");
      vals.push(status);
    }
    if (from) {
      conds.push("ce.event_time >= ?");
      vals.push(from);
    }
    if (to) {
      conds.push("ce.event_time <= ?");
      vals.push(to);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT ce.*, tm.full_name AS member_name, tm.category AS member_category,
              su.full_name AS user_name, su.email AS user_email,
              w.name AS whitelist_name
       FROM clock_events ce
       LEFT JOIN team_members tm ON tm.id = ce.team_member_id
       LEFT JOIN system_users su ON su.id = ce.system_user_id
       LEFT JOIN clockin_whitelist w ON w.id = ce.matched_whitelist_id
       ${where}
       ORDER BY ce.event_time DESC LIMIT ?`,
      [...vals, parseInt(limit, 10) || 200],
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.summary = async (_req, res, next) => {
  try {
    const [latest] = await db.query(
      `SELECT ce.id, ce.system_user_id, ce.team_member_id, ce.event_type, ce.event_time,
              ce.location_name, ce.station_id,
              tm.full_name AS member_name, tm.category, su.full_name AS user_name
       FROM clock_events ce
       INNER JOIN (
         SELECT system_user_id, MAX(event_time) AS mx
         FROM clock_events WHERE status = 'approved' GROUP BY system_user_id
       ) last ON last.system_user_id = ce.system_user_id AND last.mx = ce.event_time
       LEFT JOIN team_members tm ON tm.id = ce.team_member_id
       LEFT JOIN system_users su ON su.id = ce.system_user_id
       WHERE ce.status = 'approved'
       ORDER BY ce.event_time DESC`,
    );
    const clockedIn = latest.filter((r) => r.event_type === "clock_in");

    const [today] = await db.query(
      `SELECT COUNT(*) AS total_events,
              SUM(event_type = 'clock_in') AS clock_ins,
              SUM(event_type = 'clock_out') AS clock_outs,
              SUM(status = 'rejected') AS rejected
       FROM clock_events WHERE DATE(CONVERT_TZ(event_time, '+00:00', '+03:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+03:00'))`,
    );

    res.json({
      success: true,
      data: {
        clocked_in: clockedIn,
        today: today[0],
        server_time: new Date().toISOString(),
      },
    });
  } catch (e) {
    next(e);
  }
};

// ---------- shift summary (auto-pre-fill for daily report) ----------
exports.shiftSummary = async (req, res, next) => {
  try {
    const date =
      (req.query.date && String(req.query.date)) ||
      new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" }); // YYYY-MM-DD in Nairobi

    // Today's clock events for this agent
    const [ev] = await db.query(
      `SELECT event_type, event_time, station_id, location_name
       FROM clock_events
       WHERE system_user_id = ? AND status = 'approved'
         AND DATE(CONVERT_TZ(event_time, '+00:00', '+03:00')) = ?
       ORDER BY event_time ASC`,
      [req.user.id, date],
    );
    const firstIn = ev.find((e) => e.event_type === "clock_in") || null;
    const lastOut =
      [...ev].reverse().find((e) => e.event_type === "clock_out") || null;
    const station_id = firstIn?.station_id || null;
    const location = firstIn?.location_name || null;

    let hours_worked = 0;
    if (firstIn && lastOut) {
      hours_worked = Math.max(
        0,
        (new Date(lastOut.event_time) - new Date(firstIn.event_time)) /
          3_600_000,
      );
    } else if (firstIn) {
      hours_worked = Math.max(
        0,
        (Date.now() - new Date(firstIn.event_time).getTime()) / 3_600_000,
      );
    }

    // Auto rental metrics for this station/date
    let rentals_auto = 0,
      returns_auto = 0,
      pending_auto = 0;
    if (station_id) {
      const [[r]] = await db.query(
        `SELECT
           SUM(DATE(CONVERT_TZ(start_time, '+00:00', '+03:00')) = ?) AS rentals,
           SUM(end_time IS NOT NULL AND DATE(CONVERT_TZ(end_time, '+00:00', '+03:00')) = ?) AS returns,
           SUM(end_time IS NULL AND DATE(CONVERT_TZ(start_time, '+00:00', '+03:00')) = ?) AS pending
         FROM rentals WHERE station_id = ?`,
        [date, date, date, station_id],
      );
      rentals_auto = Number(r?.rentals || 0);
      returns_auto = Number(r?.returns || 0);
      pending_auto = Number(r?.pending || 0);
    }

    // Existing report for this date (if any)
    const [existing] = await db.query(
      `SELECT * FROM daily_reports
       WHERE agent_user_id = ? AND report_date = ?
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, date],
    );

    res.json({
      success: true,
      data: {
        report_date: date,
        station_id,
        location,
        time_in: firstIn?.event_time || null,
        time_out: lastOut?.event_time || null,
        hours_worked: Math.round(hours_worked * 100) / 100,
        rentals_auto,
        returns_auto,
        pending_auto,
        is_clocked_out: !!lastOut,
        existing_report: existing[0] || null,
      },
    });
  } catch (e) {
    next(e);
  }
};

// ---------- daily reports ----------
exports.listReports = async (req, res, next) => {
  try {
    const { from, to, agent_id, limit = 500 } = req.query;
    const isAdmin = ["super_admin", "admin"].includes(req.user.role);
    const conds = [];
    const vals = [];
    if (!isAdmin) {
      conds.push("agent_user_id = ?");
      vals.push(req.user.id);
    } else if (agent_id) {
      conds.push("agent_user_id = ?");
      vals.push(agent_id);
    }
    if (from) {
      conds.push("report_date >= ?");
      vals.push(from);
    }
    if (to) {
      conds.push("report_date <= ?");
      vals.push(to);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT * FROM daily_reports ${where} ORDER BY report_date DESC, created_at DESC LIMIT ?`,
      [...vals, parseInt(limit, 10) || 500],
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.upsertReport = async (req, res, next) => {
  try {
    const {
      report_date,
      location,
      station_id,
      rentals = 0,
      returns = 0,
      pending_returns = 0,
      powerbanks_arrival = 0,
      powerbanks_departure = 0,
      time_in,
      time_out,
      notes,
      // observation fields (Phase 4)
      machine_cleanliness = null,
      customer_feedback = null,
      issues_observed = null,
      competitor_activity = null,
      marketing_activities = null,
      suggestions = null,
      photos = null,
    } = req.body;
    if (!location)
      return res
        .status(400)
        .json({ success: false, error: "location required" });
    const date =
      report_date ||
      new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });

    // Auto-pull rentals/returns/pending for this agent's station/date
    let rentalsAuto = 0,
      returnsAuto = 0,
      pendingAuto = 0;
    if (station_id) {
      const [[r]] = await db.query(
        `SELECT
           SUM(DATE(CONVERT_TZ(start_time, '+00:00', '+03:00')) = ?) AS r,
           SUM(end_time IS NOT NULL AND DATE(CONVERT_TZ(end_time, '+00:00', '+03:00')) = ?) AS rt,
           SUM(end_time IS NULL AND DATE(CONVERT_TZ(start_time, '+00:00', '+03:00')) = ?) AS p
         FROM rentals WHERE station_id = ?`,
        [date, date, date, station_id],
      );
      rentalsAuto = Number(r?.r || 0);
      returnsAuto = Number(r?.rt || 0);
      pendingAuto = Number(r?.p || 0);
    }

    // Pull time_in/time_out from clock_events if not provided
    let ti = time_in || null,
      to_ = time_out || null;
    if (!ti || !to_) {
      const [ev] = await db.query(
        `SELECT event_type, event_time FROM clock_events
         WHERE system_user_id = ? AND status = 'approved'
           AND DATE(CONVERT_TZ(event_time, '+00:00', '+03:00')) = ?
         ORDER BY event_time ASC`,
        [req.user.id, date],
      );
      const ins = ev.filter((e) => e.event_type === "clock_in");
      const outs = ev.filter((e) => e.event_type === "clock_out");
      if (!ti && ins[0]) ti = ins[0].event_time;
      if (!to_ && outs.length) to_ = outs[outs.length - 1].event_time;
    }

    const photosJson = photos ? JSON.stringify(photos) : null;
    const subAt = new Date();

    const [existing] = await db.query(
      `SELECT id FROM daily_reports WHERE agent_user_id = ? AND report_date = ? AND location = ? LIMIT 1`,
      [req.user.id, date, location],
    );

    if (existing.length) {
      await db.query(
        `UPDATE daily_reports SET station_id = ?, rentals = ?, returns = ?, pending_returns = ?,
           powerbanks_arrival = ?, powerbanks_departure = ?, time_in = ?, time_out = ?,
           rentals_auto = ?, returns_auto = ?, pending_auto = ?, notes = ?,
           machine_cleanliness = ?, customer_feedback = ?, issues_observed = ?,
           competitor_activity = ?, marketing_activities = ?, suggestions = ?,
           photos_json = ?, submitted_at = ?
         WHERE id = ?`,
        [
          station_id || null,
          rentals,
          returns,
          pending_returns,
          powerbanks_arrival,
          powerbanks_departure,
          ti,
          to_,
          rentalsAuto,
          returnsAuto,
          pendingAuto,
          notes || null,
          machine_cleanliness,
          customer_feedback,
          issues_observed,
          competitor_activity,
          marketing_activities,
          suggestions,
          photosJson,
          subAt,
          existing[0].id,
        ],
      );
      return res.json({
        success: true,
        data: { id: existing[0].id, updated: true },
      });
    }

    const id = uuidv4();
    await db.query(
      `INSERT INTO daily_reports
       (id, report_date, agent_user_id, agent_name, station_id, location,
        rentals, returns, pending_returns, powerbanks_arrival, powerbanks_departure,
        time_in, time_out, rentals_auto, returns_auto, pending_auto, notes,
        machine_cleanliness, customer_feedback, issues_observed,
        competitor_activity, marketing_activities, suggestions,
        photos_json, submitted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        date,
        req.user.id,
        req.user.full_name || req.user.name || req.user.email,
        station_id || null,
        location,
        rentals,
        returns,
        pending_returns,
        powerbanks_arrival,
        powerbanks_departure,
        ti,
        to_,
        rentalsAuto,
        returnsAuto,
        pendingAuto,
        notes || null,
        machine_cleanliness,
        customer_feedback,
        issues_observed,
        competitor_activity,
        marketing_activities,
        suggestions,
        photosJson,
        subAt,
      ],
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

exports.deleteReport = async (req, res, next) => {
  try {
    await db.query("DELETE FROM daily_reports WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: "Report removed" } });
  } catch (e) {
    next(e);
  }
};
