const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");

const CATEGORIES = ["electronics", "branded", "tools", "vehicles", "furniture", "other"];
const STATUSES = ["in_use", "in_storage", "repair", "lost", "retired"];

const SELECT_SQL = `
  SELECT a.*,
         u.full_name AS assigned_user_name,
         u.email     AS assigned_user_email,
         s.name      AS station_name
  FROM assets a
  LEFT JOIN system_users u ON u.id = a.assigned_user_id
  LEFT JOIN cb_stations  s ON s.id = a.station_id
`;

async function logHistory(assetId, eventType, from, to, note, actor) {
  try {
    await db.query(
      `INSERT INTO asset_history (id, asset_id, event_type, from_value, to_value, note, actor_id, actor_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), assetId, eventType, from || null, to || null, note || null, actor?.id || null, actor?.name || null],
    );
  } catch (e) {
    console.error("asset history log:", e.message);
  }
}

exports.list = async (req, res, next) => {
  try {
    const { search, category, status, assigned_user_id, station_id, active } = req.query;
    const conds = [];
    const vals = [];
    if (search) {
      conds.push("(a.name LIKE ? OR a.serial LIKE ? OR a.asset_tag LIKE ? OR a.assigned_to_name LIKE ? OR a.location LIKE ?)");
      const s = `%${search}%`;
      vals.push(s, s, s, s, s);
    }
    if (category) { conds.push("a.category = ?"); vals.push(category); }
    if (status) { conds.push("a.status = ?"); vals.push(status); }
    if (assigned_user_id) { conds.push("a.assigned_user_id = ?"); vals.push(assigned_user_id); }
    if (station_id) { conds.push("a.station_id = ?"); vals.push(station_id); }
    if (active !== undefined) { conds.push("a.is_active = ?"); vals.push(active === "true" || active === "1" ? 1 : 0); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const [rows] = await db.query(`${SELECT_SQL} ${where} ORDER BY a.created_at DESC`, vals);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};

exports.summary = async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT
         COUNT(*)                                                     AS total,
         SUM(status = 'in_use')                                       AS in_use,
         SUM(status = 'in_storage')                                   AS in_storage,
         SUM(status IN ('repair','lost'))                             AS issues,
         COALESCE(SUM(value_kes), 0)                                  AS total_value
       FROM assets WHERE is_active = 1`,
    );
    const [byCat] = await db.query(
      `SELECT category, COUNT(*) AS count FROM assets WHERE is_active = 1 GROUP BY category`,
    );
    res.json({ success: true, data: { ...rows[0], by_category: byCat } });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(`${SELECT_SQL} WHERE a.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Asset not found" });
    const [history] = await db.query(
      `SELECT * FROM asset_history WHERE asset_id = ? ORDER BY created_at DESC LIMIT 100`,
      [req.params.id],
    );
    res.json({ success: true, data: { ...rows[0], history } });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, error: "name is required" });
    const category = CATEGORIES.includes(b.category) ? b.category : "other";
    const status = STATUSES.includes(b.status) ? b.status : "in_storage";
    const id = uuidv4();
    await db.query(
      `INSERT INTO assets
         (id, asset_tag, name, category, serial, status,
          assigned_user_id, assigned_to_name, station_id, location,
          value_kes, \`condition\`, date_assigned, purchase_date, notes, image_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        b.asset_tag || null,
        b.name,
        category,
        b.serial || null,
        status,
        b.assigned_user_id || null,
        b.assigned_to_name || null,
        b.station_id || null,
        b.location || null,
        Number(b.value_kes) || 0,
        b.condition || null,
        b.date_assigned || null,
        b.purchase_date || null,
        b.notes || null,
        b.image_url || null,
        req.user?.id || null,
      ],
    );
    await logHistory(id, "created", null, status, `Asset "${b.name}" created`, req.user);
    const [rows] = await db.query(`${SELECT_SQL} WHERE a.id = ?`, [id]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, error: "Asset tag or serial already exists" });
    }
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const [existingRows] = await db.query("SELECT * FROM assets WHERE id = ?", [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ success: false, error: "Asset not found" });
    const existing = existingRows[0];

    const editable = [
      "asset_tag", "name", "category", "serial", "status",
      "assigned_user_id", "assigned_to_name", "station_id", "location",
      "value_kes", "condition", "date_assigned", "purchase_date", "notes", "image_url", "is_active",
    ];
    const updates = [];
    const vals = [];
    for (const f of editable) {
      if (req.body[f] === undefined) continue;
      if (f === "category" && !CATEGORIES.includes(req.body[f])) continue;
      if (f === "status" && !STATUSES.includes(req.body[f])) continue;
      updates.push(`\`${f}\` = ?`);
      vals.push(req.body[f] === "" ? null : req.body[f]);
    }
    if (!updates.length) return res.status(400).json({ success: false, error: "No fields to update" });
    vals.push(req.params.id);
    await db.query(`UPDATE assets SET ${updates.join(", ")} WHERE id = ?`, vals);

    // History
    if (req.body.status && req.body.status !== existing.status) {
      await logHistory(req.params.id, "status_changed", existing.status, req.body.status, null, req.user);
    }
    if (req.body.assigned_user_id !== undefined && req.body.assigned_user_id !== existing.assigned_user_id) {
      const evt = req.body.assigned_user_id ? "assigned" : "unassigned";
      await logHistory(req.params.id, evt, existing.assigned_user_id, req.body.assigned_user_id, req.body.assigned_to_name || null, req.user);
    }

    const [rows] = await db.query(`${SELECT_SQL} WHERE a.id = ?`, [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, error: "Asset tag or serial already exists" });
    }
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT name FROM assets WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Asset not found" });
    await db.query("DELETE FROM assets WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: `Asset "${rows[0].name}" removed` } });
  } catch (e) { next(e); }
};

// Chargebyte staff dropdown — system_users with staff/admin/super_admin roles
exports.assignableStaff = async (_req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name AS name, email, role
       FROM system_users
       WHERE is_active = 1 AND role IN ('super_admin','admin','staff')
       ORDER BY full_name`,
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
};