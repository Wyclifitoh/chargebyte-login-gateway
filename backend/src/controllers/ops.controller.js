const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");
const path = require("path");

const DEPARTMENTS = ["ICT", "Finance", "Operations", "Marketing", "Support", "HR", "Executive", "Field"];
const PRIORITIES = ["low", "medium", "high", "critical"];
const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"];
const DU_STATUSES = ["draft", "submitted"];
const DEPT_ENTRY_TYPES = ["update", "report", "meeting_minutes"];
const EVENT_TYPES = ["field_visit", "meeting", "deadline", "dept_activity", "maintenance", "company_event"];

const isPrivileged = (role) => role === "super_admin" || role === "admin";

async function notify(target_roles, title, message, type = "ops", severity = "info") {
  try {
    await db.query(
      `INSERT INTO notifications (type, severity, title, message, target_roles, is_read, dismissed, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, NOW())`,
      [type, severity, title, message, JSON.stringify(target_roles)],
    );
  } catch (e) { console.error("ops notify:", e.message); }
}

// --------- Staff dropdown ---------
exports.staff = async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name AS name, email, role FROM system_users
       WHERE is_active = 1 AND role IN ('super_admin','admin','staff')
       ORDER BY full_name`,
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.departments = async (_req, res) => res.json({ success: true, data: DEPARTMENTS });

// --------- File uploads (department reports / meeting minutes) ---------
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "file required" });
    const url = `/uploads/ops/${path.basename(req.file.filename)}`;
    res.status(201).json({
      success: true,
      data: {
        file_url: url,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
      },
    });
  } catch (e) { next(e); }
};

// --------- Dashboard summary ---------
exports.dashboard = async (req, res, next) => {
  try {
    const priv = isPrivileged(req.user.role);
    const userScope = priv ? "" : "AND user_id = ?";
    const userVal = priv ? [] : [req.user.id];

    // Updates run on a WEEKLY cadence — "today" figures are computed against
    // the current ISO week rather than the calendar day.
    const [[submittedToday]] = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS n FROM ops_daily_updates
       WHERE YEARWEEK(update_date, 1) = YEARWEEK(CURDATE(), 1)
         AND status = 'submitted' ${userScope}`, userVal);
    const [[activeStaff]] = await db.query(
      `SELECT COUNT(*) AS n FROM system_users WHERE is_active = 1 AND role IN ('super_admin','admin','staff')`);
    const [[activeField]] = await db.query(
      `SELECT COUNT(*) AS n FROM ops_field_activities
       WHERE activity_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         AND check_in_at IS NOT NULL AND check_out_at IS NULL ${userScope}`, userVal);
    const [[openTasks]] = await db.query(
      `SELECT COUNT(*) AS n FROM ops_tasks WHERE status IN ('pending','in_progress')
       ${priv ? "" : "AND (assigned_to = ? OR assigned_by = ?)"}`,
      priv ? [] : [req.user.id, req.user.id]);
    const [[completedToday]] = await db.query(
      `SELECT COUNT(*) AS n FROM ops_tasks WHERE status = 'completed'
       AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       ${priv ? "" : "AND (assigned_to = ? OR assigned_by = ?)"}`,
      priv ? [] : [req.user.id, req.user.id]);
    const [[issuesToday]] = await db.query(
      `SELECT COUNT(*) AS n FROM ops_field_activities
       WHERE activity_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         AND issues IS NOT NULL AND issues <> '' ${userScope}`, userVal);

    const [recentUpdates] = await db.query(
      `SELECT d.id, d.department, d.update_date, d.status, d.work_summary,
              u.full_name AS user_name
       FROM ops_daily_updates d
       LEFT JOIN system_users u ON u.id = d.user_id
       ${priv ? "" : "WHERE d.user_id = ?"}
       ORDER BY d.created_at DESC LIMIT 8`,
      priv ? [] : [req.user.id]);

    const [byDept] = await db.query(
      `SELECT department, COUNT(*) AS updates
       FROM ops_daily_updates
       WHERE update_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
       GROUP BY department`);

    const [upcoming] = await db.query(
      `SELECT id, title, event_type, start_at, department
       FROM ops_calendar_events
       WHERE start_at >= NOW()
       ORDER BY start_at ASC LIMIT 8`);

    res.json({
      success: true,
      data: {
        stats: {
          submitted_today: Number(submittedToday.n),
          pending_users: Math.max(Number(activeStaff.n) - Number(submittedToday.n), 0),
          active_field: Number(activeField.n),
          open_tasks: Number(openTasks.n),
          completed_today: Number(completedToday.n),
          issues_today: Number(issuesToday.n),
        },
        recent_updates: recentUpdates,
        by_department: byDept,
        upcoming_events: upcoming,
      },
    });
  } catch (e) { next(e); }
};

// --------- Daily Updates ---------
exports.listDailyUpdates = async (req, res, next) => {
  try {
    const priv = isPrivileged(req.user.role);
    const { user_id, department, date, status, search } = req.query;
    const conds = [];
    const vals = [];
    if (!priv) { conds.push("d.user_id = ?"); vals.push(req.user.id); }
    else if (user_id) { conds.push("d.user_id = ?"); vals.push(user_id); }
    if (department) { conds.push("d.department = ?"); vals.push(department); }
    if (date) { conds.push("d.update_date = ?"); vals.push(date); }
    if (status) { conds.push("d.status = ?"); vals.push(status); }
    if (search) {
      conds.push("(d.work_summary LIKE ? OR d.tasks_completed LIKE ? OR d.challenges LIKE ?)");
      const s = `%${search}%`; vals.push(s, s, s);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT d.*, u.full_name AS user_name, u.email AS user_email
       FROM ops_daily_updates d
       LEFT JOIN system_users u ON u.id = d.user_id
       ${where}
       ORDER BY d.update_date DESC, d.created_at DESC
       LIMIT 500`, vals);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.createDailyUpdate = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.update_date) return res.status(400).json({ success: false, error: "update_date required" });
    const status = DU_STATUSES.includes(b.status) ? b.status : "draft";
    const id = uuidv4();
    await db.query(
      `INSERT INTO ops_daily_updates
       (id, user_id, department, position, update_date, work_summary, tasks_completed,
        challenges, assistance_required, tomorrow_plan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, b.department || null, b.position || null, b.update_date,
       b.work_summary || null, b.tasks_completed || null, b.challenges || null,
       b.assistance_required || null, b.tomorrow_plan || null, status]);
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.updateDailyUpdate = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT user_id FROM ops_daily_updates WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Not found" });
    if (!isPrivileged(req.user.role) && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const fields = ["department", "position", "update_date", "work_summary", "tasks_completed",
                    "challenges", "assistance_required", "tomorrow_plan", "status"];
    const updates = []; const vals = [];
    for (const f of fields) {
      if (req.body[f] === undefined) continue;
      if (f === "status" && !DU_STATUSES.includes(req.body[f])) continue;
      updates.push(`${f} = ?`); vals.push(req.body[f] === "" ? null : req.body[f]);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: "No fields" });
    vals.push(req.params.id);
    await db.query(`UPDATE ops_daily_updates SET ${updates.join(", ")} WHERE id = ?`, vals);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
};

exports.deleteDailyUpdate = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT user_id FROM ops_daily_updates WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Not found" });
    if (!isPrivileged(req.user.role) && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    await db.query("DELETE FROM ops_daily_updates WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (e) { next(e); }
};

// --------- Field Activities ---------
exports.listFieldActivities = async (req, res, next) => {
  try {
    const priv = isPrivileged(req.user.role);
    const { user_id, department, activity_type, date, station_id } = req.query;
    const conds = []; const vals = [];
    if (!priv) { conds.push("f.user_id = ?"); vals.push(req.user.id); }
    else if (user_id) { conds.push("f.user_id = ?"); vals.push(user_id); }
    if (department) { conds.push("f.department = ?"); vals.push(department); }
    if (activity_type) { conds.push("f.activity_type = ?"); vals.push(activity_type); }
    if (date) { conds.push("f.activity_date = ?"); vals.push(date); }
    if (station_id) { conds.push("f.station_id = ?"); vals.push(station_id); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT f.*, u.full_name AS user_name, s.name AS station_name
       FROM ops_field_activities f
       LEFT JOIN system_users u ON u.id = f.user_id
       LEFT JOIN cb_stations  s ON s.id = f.station_id
       ${where}
       ORDER BY f.activity_date DESC, f.created_at DESC LIMIT 500`, vals);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.createFieldActivity = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.activity_type || !b.activity_date) {
      return res.status(400).json({ success: false, error: "activity_type and activity_date required" });
    }
    const id = uuidv4();
    await db.query(
      `INSERT INTO ops_field_activities
       (id, user_id, department, activity_type, station_id, client_name, location,
        latitude, longitude, check_in_at, check_out_at, activities, findings,
        issues, recommendations, activity_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, b.department || null, b.activity_type, b.station_id || null,
       b.client_name || null, b.location || null, b.latitude || null, b.longitude || null,
       b.check_in_at || null, b.check_out_at || null, b.activities || null,
       b.findings || null, b.issues || null, b.recommendations || null, b.activity_date]);
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.updateFieldActivity = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT user_id FROM ops_field_activities WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Not found" });
    if (!isPrivileged(req.user.role) && rows[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    const fields = ["department", "activity_type", "station_id", "client_name", "location",
                    "latitude", "longitude", "check_in_at", "check_out_at", "activities",
                    "findings", "issues", "recommendations", "activity_date"];
    const updates = []; const vals = [];
    for (const f of fields) {
      if (req.body[f] === undefined) continue;
      updates.push(`${f} = ?`); vals.push(req.body[f] === "" ? null : req.body[f]);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: "No fields" });
    vals.push(req.params.id);
    await db.query(`UPDATE ops_field_activities SET ${updates.join(", ")} WHERE id = ?`, vals);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
};

exports.deleteFieldActivity = async (req, res, next) => {
  try {
    await db.query("DELETE FROM ops_field_activities WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (e) { next(e); }
};

// --------- Department Updates ---------
exports.listDepartmentUpdates = async (req, res, next) => {
  try {
    const { department, priority, search, entry_type } = req.query;
    const conds = []; const vals = [];
    if (department) { conds.push("d.department = ?"); vals.push(department); }
    if (priority) { conds.push("d.priority = ?"); vals.push(priority); }
    if (entry_type && DEPT_ENTRY_TYPES.includes(entry_type)) {
      conds.push("d.entry_type = ?"); vals.push(entry_type);
    }
    if (search) {
      conds.push("(d.title LIKE ? OR d.summary LIKE ? OR d.details LIKE ?)");
      const s = `%${search}%`; vals.push(s, s, s);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT d.*, u.full_name AS user_name
       FROM ops_department_updates d
       LEFT JOIN system_users u ON u.id = d.user_id
       ${where} ORDER BY d.created_at DESC LIMIT 300`, vals);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.createDepartmentUpdate = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title || !b.department) return res.status(400).json({ success: false, error: "title and department required" });
    const priority = PRIORITIES.includes(b.priority) ? b.priority : "medium";
    const entryType = DEPT_ENTRY_TYPES.includes(b.entry_type) ? b.entry_type : "update";
    const id = uuidv4();
    await db.query(
      `INSERT INTO ops_department_updates
       (id, user_id, department, entry_type, title, summary, details, priority,
        meeting_date, attendees, file_url, file_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, b.department, entryType, b.title, b.summary || null,
       b.details || null, priority, b.meeting_date || null, b.attendees || null,
       b.file_url || null, b.file_name || null]);
    if (priority === "high" || priority === "critical") {
      await notify(["super_admin", "admin"], `[${b.department}] ${b.title}`, b.summary || "New department update", "ops_dept_update", priority);
    }
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.updateDepartmentUpdate = async (req, res, next) => {
  try {
    const fields = ["department", "entry_type", "title", "summary", "details",
                    "priority", "meeting_date", "attendees", "file_url", "file_name"];
    const updates = []; const vals = [];
    for (const f of fields) {
      if (req.body[f] === undefined) continue;
      if (f === "priority" && !PRIORITIES.includes(req.body[f])) continue;
      if (f === "entry_type" && !DEPT_ENTRY_TYPES.includes(req.body[f])) continue;
      updates.push(`${f} = ?`); vals.push(req.body[f] === "" ? null : req.body[f]);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: "No fields" });
    vals.push(req.params.id);
    await db.query(`UPDATE ops_department_updates SET ${updates.join(", ")} WHERE id = ?`, vals);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
};

exports.deleteDepartmentUpdate = async (req, res, next) => {
  try {
    await db.query("DELETE FROM ops_department_updates WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (e) { next(e); }
};

// --------- Tasks ---------
exports.listTasks = async (req, res, next) => {
  try {
    const priv = isPrivileged(req.user.role);
    const { assigned_to, department, status, priority, search } = req.query;
    const conds = []; const vals = [];
    if (!priv) {
      conds.push("(t.assigned_to = ? OR t.assigned_by = ?)");
      vals.push(req.user.id, req.user.id);
    } else if (assigned_to) { conds.push("t.assigned_to = ?"); vals.push(assigned_to); }
    if (department) { conds.push("t.department = ?"); vals.push(department); }
    if (status) { conds.push("t.status = ?"); vals.push(status); }
    if (priority) { conds.push("t.priority = ?"); vals.push(priority); }
    if (search) {
      conds.push("(t.title LIKE ? OR t.description LIKE ?)");
      const s = `%${search}%`; vals.push(s, s);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT t.*, a.full_name AS assignee_name, b.full_name AS assigner_name
       FROM ops_tasks t
       LEFT JOIN system_users a ON a.id = t.assigned_to
       LEFT JOIN system_users b ON b.id = t.assigned_by
       ${where} ORDER BY
         CASE t.status WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
         t.due_date IS NULL, t.due_date ASC, t.created_at DESC
       LIMIT 500`, vals);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.getTask = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, a.full_name AS assignee_name, b.full_name AS assigner_name
       FROM ops_tasks t
       LEFT JOIN system_users a ON a.id = t.assigned_to
       LEFT JOIN system_users b ON b.id = t.assigned_by
       WHERE t.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Not found" });
    const [comments] = await db.query(
      `SELECT c.*, u.full_name AS user_name FROM ops_task_comments c
       LEFT JOIN system_users u ON u.id = c.user_id
       WHERE task_id = ? ORDER BY created_at ASC`, [req.params.id]);
    res.json({ success: true, data: { ...rows[0], comments } });
  } catch (e) { next(e); }
};

exports.createTask = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ success: false, error: "title required" });
    const priority = PRIORITIES.includes(b.priority) ? b.priority : "medium";
    const status = TASK_STATUSES.includes(b.status) ? b.status : "pending";
    const id = uuidv4();
    await db.query(
      `INSERT INTO ops_tasks
       (id, title, description, assigned_by, assigned_to, department, priority, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, b.title, b.description || null, req.user.id, b.assigned_to || null,
       b.department || null, priority, b.due_date || null, status]);
    if (b.assigned_to && b.assigned_to !== req.user.id) {
      await notify(["super_admin", "admin", "staff"], `New task: ${b.title}`,
        `You have been assigned a task by ${req.user.name}`, "ops_task_assigned", priority);
    }
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM ops_tasks WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Not found" });
    const existing = rows[0];
    const fields = ["title", "description", "assigned_to", "department", "priority", "due_date", "status"];
    const updates = []; const vals = [];
    for (const f of fields) {
      if (req.body[f] === undefined) continue;
      if (f === "priority" && !PRIORITIES.includes(req.body[f])) continue;
      if (f === "status" && !TASK_STATUSES.includes(req.body[f])) continue;
      updates.push(`${f} = ?`); vals.push(req.body[f] === "" ? null : req.body[f]);
    }
    if (req.body.status === "completed" && existing.status !== "completed") {
      updates.push("completed_at = NOW()");
    } else if (req.body.status && req.body.status !== "completed") {
      updates.push("completed_at = NULL");
    }
    if (!updates.length) return res.status(400).json({ success: false, error: "No fields" });
    vals.push(req.params.id);
    await db.query(`UPDATE ops_tasks SET ${updates.join(", ")} WHERE id = ?`, vals);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
};

exports.deleteTask = async (req, res, next) => {
  try {
    await db.query("DELETE FROM ops_tasks WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (e) { next(e); }
};

exports.addTaskComment = async (req, res, next) => {
  try {
    if (!req.body.comment) return res.status(400).json({ success: false, error: "comment required" });
    const id = uuidv4();
    await db.query(
      `INSERT INTO ops_task_comments (id, task_id, user_id, comment) VALUES (?, ?, ?, ?)`,
      [id, req.params.id, req.user.id, req.body.comment]);
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

// --------- Calendar ---------
exports.listEvents = async (req, res, next) => {
  try {
    const { start, end, department, event_type } = req.query;
    const conds = []; const vals = [];
    if (start) { conds.push("start_at >= ?"); vals.push(start); }
    if (end) { conds.push("start_at <= ?"); vals.push(end); }
    if (department) { conds.push("department = ?"); vals.push(department); }
    if (event_type) { conds.push("event_type = ?"); vals.push(event_type); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(
      `SELECT e.*, u.full_name AS created_by_name
       FROM ops_calendar_events e
       LEFT JOIN system_users u ON u.id = e.created_by
       ${where} ORDER BY start_at ASC LIMIT 1000`, vals);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.createEvent = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.title || !b.start_at) return res.status(400).json({ success: false, error: "title and start_at required" });
    const event_type = EVENT_TYPES.includes(b.event_type) ? b.event_type : "meeting";
    const id = uuidv4();
    await db.query(
      `INSERT INTO ops_calendar_events
       (id, title, description, event_type, start_at, end_at, all_day, department, created_by, related_entity_type, related_entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, b.title, b.description || null, event_type, b.start_at, b.end_at || null,
       b.all_day ? 1 : 0, b.department || null, req.user.id,
       b.related_entity_type || null, b.related_entity_id || null]);
    res.status(201).json({ success: true, data: { id } });
  } catch (e) { next(e); }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const fields = ["title", "description", "event_type", "start_at", "end_at", "all_day", "department"];
    const updates = []; const vals = [];
    for (const f of fields) {
      if (req.body[f] === undefined) continue;
      if (f === "event_type" && !EVENT_TYPES.includes(req.body[f])) continue;
      updates.push(`${f} = ?`); vals.push(req.body[f] === "" ? null : req.body[f]);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: "No fields" });
    vals.push(req.params.id);
    await db.query(`UPDATE ops_calendar_events SET ${updates.join(", ")} WHERE id = ?`, vals);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) { next(e); }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    await db.query("DELETE FROM ops_calendar_events WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: "Deleted" } });
  } catch (e) { next(e); }
};