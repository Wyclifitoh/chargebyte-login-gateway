const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");

exports.getAll = async (req, res, next) => {
  try {
    const { search, status, station_id } = req.query;
    let sql = `SELECT m.*, s.name as station_name FROM machines m JOIN cb_stations s ON m.station_id = s.id`;
    const conditions = [];
    const values = [];

    if (search) {
      conditions.push("(m.name LIKE ? OR m.qr_code LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      conditions.push("m.status = ?");
      values.push(status);
    }
    if (station_id) {
      conditions.push("m.station_id = ?");
      values.push(station_id);
    }
    if (req.user.role === "location_partner") {
      conditions.push("s.host_partner_id = ?");
      values.push(req.user.id);
    }

    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY m.created_at DESC";

    const [rows] = await db.query(sql, values);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT m.*, s.name as station_name FROM machines m JOIN cb_stations s ON m.station_id = s.id WHERE m.id = ?",
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ success: false, error: "Machine not found" });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const id = uuidv4();
    const {
      name,
      station_id,
      model,
      qr_code,
      total_slots,
      cabinet_device_id,
      cabinet_model,
      manufacturer_cabinet_id,
    } = req.body;
    await db.query(
      `INSERT INTO machines
         (id, station_id, name, model, qr_code, total_slots, available_slots,
          cabinet_device_id, cabinet_model, manufacturer_cabinet_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        station_id,
        name,
        model || null,
        qr_code || `QR-${id.slice(0, 8)}`,
        total_slots,
        total_slots,
        cabinet_device_id || null,
        cabinet_model || null,
        manufacturer_cabinet_id || null,
      ],
    );
    res.status(201).json({ success: true, data: { id, ...req.body } });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const fields = [
      "name",
      "station_id",
      "model",
      "qr_code",
      "total_slots",
      "available_slots",
      "is_active",
      "cabinet_device_id",
      "cabinet_model",
      "manufacturer_cabinet_id",
    ];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    if (!updates.length)
      return res.status(400).json({ success: false, error: "No fields to update" });
    values.push(req.params.id);
    await db.query(`UPDATE machines SET ${updates.join(", ")} WHERE id = ?`, values);
    res.json({ success: true, data: { id: req.params.id, ...req.body } });
  } catch (error) {
    next(error);
  }
};

exports.setStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updates = { status };
    if (status === "maintenance") updates.last_maintenance = new Date();
    await db.query(
      `UPDATE machines SET status = ?, ${status === "maintenance" ? "last_maintenance = NOW()," : ""} is_available = ? WHERE id = ?`,
      [status, status === "online" ? 1 : 0, req.params.id],
    );
    res.json({ success: true, data: { message: `Machine status set to ${status}` } });
  } catch (error) {
    next(error);
  }
};
