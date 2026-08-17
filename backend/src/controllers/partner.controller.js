// backend/src/controllers/partner.controller.js
// Location Partner Management — comprehensive controller.
// Funding partner endpoints are intentionally not exposed here (future phase).
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const disbursementService = require("../services/partnerDisbursement.service");

// ---------------- helpers ----------------
function generateTempPassword() {
  return `Cb-${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 900) + 100}`;
}

function toSqlDateTime(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function partnerRentalWindowFromSql() {
  return `FROM partner_machine_deployments pmd
        JOIN machines dm ON dm.id = pmd.machine_id
        JOIN rentals r
          ON (
            r.machine_id = pmd.machine_id
            OR NULLIF(r.machine_id, '') = dm.cabinet_device_id
            OR NULLIF(r.machine_id, '') = dm.manufacturer_cabinet_id
            OR NULLIF(r.manufacturer_trade_no, '') = dm.cabinet_device_id
            OR NULLIF(r.manufacturer_trade_no, '') = dm.manufacturer_cabinet_id
            OR (r.machine_model = dm.model AND NOT EXISTS (SELECT 1 FROM machines mx WHERE mx.id = r.machine_id))
          )
         AND COALESCE(r.start_time, r.created_at) >= pmd.deployed_at
         AND (pmd.undeployed_at IS NULL OR COALESCE(r.start_time, r.created_at) < pmd.undeployed_at)`;
}

async function logActivity(partnerUserId, actor, action, entity, details) {
  try {
    await db.query(
      `INSERT INTO partner_activity_log (id, partner_user_id, actor_id, actor_name, action, entity, details_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        partnerUserId,
        actor?.id || null,
        actor?.full_name || actor?.email || null,
        action,
        entity || null,
        details ? JSON.stringify(details) : null,
      ],
    );
  } catch (_) {
    /* non-fatal */
  }
}

async function loadPartnerByUserId(userId) {
  const [rows] = await db.query(
    `SELECT u.id AS user_id, u.email, u.full_name, u.phone, u.is_active, u.created_at,
            p.id AS partner_id, p.partner_code, p.name, p.partner_type, p.tier,
            p.registration_number AS business_reg_no, p.address AS physical_address,
            p.city, p.county, p.status, p.agreement_type,
            p.revenue_share_percent, p.fixed_monthly_rent AS fixed_amount,
            p.disbursement_frequency, p.disbursement_day,
            p.contact_person, p.contact_phone, p.contact_email, p.contact_position,
            p.contract_start_date, p.contract_end_date, p.notes
     FROM system_users u LEFT JOIN partners p ON p.user_id = u.id
     WHERE u.id = ? AND u.role = 'location_partner'`,
    [userId],
  );
  return rows[0] || null;
}

// ============ LIST + SUMMARY ============
exports.getAll = async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const where = [`u.role = 'location_partner'`];
    const params = [];
    if (q) {
      where.push(
        `(u.full_name LIKE ? OR u.email LIKE ? OR p.partner_code LIKE ?)`,
      );
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) {
      where.push(`p.status = ?`);
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT u.id, u.full_name AS name, u.email, u.phone, u.is_active, u.created_at,
              p.id AS partner_id, p.partner_code, p.tier, p.status,
              p.agreement_type, p.revenue_share_percent, p.fixed_monthly_rent AS fixed_amount,
              p.disbursement_frequency, p.disbursement_day, p.city, p.county,
              (SELECT COUNT(*) FROM partner_station_assignments psa
                 WHERE psa.partner_user_id = u.id AND psa.unassigned_at IS NULL) AS stations_count,
              (SELECT COALESCE(SUM(amount_payable),0) FROM partner_disbursements d
                 WHERE d.partner_user_id = u.id AND d.status IN ('pending','approved')) AS pending_amount,
              (SELECT COALESCE(SUM(amount_payable),0) FROM partner_disbursements d
                 WHERE d.partner_user_id = u.id AND d.status = 'paid') AS paid_total
       FROM system_users u
       LEFT JOIN partners p ON p.user_id = u.id
       WHERE ${where.join(" AND ")}
       ORDER BY u.created_at DESC`,
      params,
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.getAdminSummary = async (_req, res, next) => {
  try {
    const [[totals]] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM system_users WHERE role='location_partner') AS total_partners,
         (SELECT COUNT(*) FROM system_users u JOIN partners p ON p.user_id=u.id
           WHERE u.role='location_partner' AND (p.status='active' OR p.status IS NULL) AND u.is_active=1) AS active_partners,
         (SELECT COUNT(*) FROM partner_disbursements WHERE status IN ('pending','approved')) AS pending_disbursements,
         (SELECT COALESCE(SUM(amount_payable),0) FROM partner_disbursements
           WHERE status='paid' AND paid_at >= DATE_FORMAT(CURDATE(),'%Y-%m-01')) AS paid_this_month,
         (SELECT COALESCE(SUM(amount_payable),0) FROM partner_disbursements
           WHERE generated_at >= DATE_FORMAT(CURDATE(),'%Y-%m-01')) AS revenue_shared_month,
         (SELECT COUNT(*) FROM partner_machine_deployments WHERE undeployed_at IS NULL) AS active_deployments`,
    );
    res.json({ success: true, data: totals });
  } catch (e) {
    next(e);
  }
};

// ============ PROFILE (360°) ============
exports.getProfile = async (req, res, next) => {
  try {
    const partner = await loadPartnerByUserId(req.params.id);
    if (!partner)
      return res
        .status(404)
        .json({ success: false, error: "Partner not found" });

    const pid = partner.partner_id;
    const uid = partner.user_id;

    const [[contacts], [accounts], [assignments], [disbursements], [activity]] =
      await Promise.all([
        db.query(
          `SELECT * FROM partner_contacts WHERE partner_id = ? ORDER BY is_primary DESC, created_at ASC`,
          [pid],
        ),
        db.query(
          `SELECT * FROM partner_payment_accounts WHERE partner_id = ? ORDER BY is_default DESC, created_at ASC`,
          [pid],
        ),
        db.query(
          `SELECT psa.*, s.name AS station_name, s.address AS station_address, s.county_name
         FROM partner_station_assignments psa
         LEFT JOIN cb_stations s ON s.id = psa.station_id
         WHERE psa.partner_user_id = ? ORDER BY psa.assigned_at DESC`,
          [uid],
        ),
        db.query(
          `SELECT d.*, m.name AS machine_name, m.name AS station_name
         FROM partner_disbursements d
         LEFT JOIN machines m ON m.id = d.station_id
         WHERE d.partner_user_id = ? ORDER BY d.period_start DESC LIMIT 100`,
          [uid],
        ),
        db.query(
          `SELECT * FROM partner_activity_log WHERE partner_user_id = ? ORDER BY created_at DESC LIMIT 50`,
          [uid],
        ),
      ]);

    // Partners own machines directly — every deployment is a machine window.
    const [machines] = await db.query(
      `SELECT pmd.id AS deployment_id, pmd.partner_user_id, pmd.partner_id,
              pmd.station_id, pmd.machine_id AS id, pmd.machine_id,
              pmd.deployed_at, pmd.undeployed_at, pmd.note, pmd.undeploy_note,
              CASE WHEN pmd.undeployed_at IS NULL THEN 'deployed' ELSE 'undeployed' END AS deployment_status,
              m.name, m.model, m.status, m.total_slots, m.available_slots,
              s.name AS station_name, s.address AS station_address
       FROM partner_machine_deployments pmd
       JOIN machines m ON m.id = pmd.machine_id
       LEFT JOIN cb_stations s ON s.id = pmd.station_id
       WHERE pmd.partner_user_id = ?
       ORDER BY (pmd.undeployed_at IS NULL) DESC, pmd.deployed_at DESC`,
      [uid],
    );

    // Revenue rollup for this month — scoped strictly to machine deployment windows.
    const [[agg]] = await db.query(
      `SELECT COUNT(DISTINCT r.id) AS c, COALESCE(SUM(r.total_amount),0) AS s
        ${partnerRentalWindowFromSql()}
       WHERE pmd.partner_user_id = ?
         AND r.status = 'completed'
         AND r.created_at >= DATE_FORMAT(CURDATE(),'%Y-%m-01')`,
      [uid],
    );
    const revenue_month = Number(agg.s);
    const rentals_month = Number(agg.c);

    res.json({
      success: true,
      data: {
        partner,
        contacts,
        payment_accounts: accounts,
        station_assignments: assignments,
        machines,
        disbursements,
        activity,
        revenue_month,
        rentals_month,
      },
    });
  } catch (e) {
    next(e);
  }
};

// ============ CREATE ============
exports.create = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      // company
      name,
      business_reg_no,
      email,
      phone,
      physical_address,
      city,
      county,
      status = "active",
      // contact
      contact_person,
      contact_phone,
      contact_email,
      contact_position,
      // payment
      payment_account,
      // agreement
      agreement_type = "revenue_share",
      revenue_share_percent = 10,
      fixed_amount = 0,
      disbursement_frequency = "monthly",
      disbursement_day = 5,
      // login
      password,
      // optional station
      station_id,
    } = req.body;

    if (!name || !email) {
      await conn.rollback();
      conn.release();
      return res
        .status(400)
        .json({ success: false, error: "name and email required" });
    }

    const userId = uuidv4();
    const partnerId = uuidv4();
    const tempPassword = password || generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    await conn.query(
      `INSERT INTO system_users (id, email, password_hash, full_name, phone, role, is_active, is_verified)
       VALUES (?, ?, ?, ?, ?, 'location_partner', 1, 1)`,
      [userId, email, hash, name, phone || null],
    );
    await conn.query(
      `INSERT INTO partners
        (id, partner_code, name, partner_type, tier, contact_person, contact_phone, contact_email, contact_position,
         registration_number, address, city, county, status,
         agreement_type, revenue_share_percent, fixed_monthly_rent,
         disbursement_frequency, disbursement_day,
         user_id, contract_start_date)
       VALUES (?, ?, ?, 'location_host', 'silver', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
      [
        partnerId,
        `LP-${userId.slice(0, 6).toUpperCase()}`,
        name,
        contact_person || name,
        contact_phone || phone || "",
        contact_email || email,
        contact_position || null,
        business_reg_no || null,
        physical_address || null,
        city || null,
        county || null,
        status,
        agreement_type === "fixed" ? "fixed_rent" : "revenue_share",
        agreement_type === "fixed" ? 0 : Number(revenue_share_percent),
        agreement_type === "fixed" ? Number(fixed_amount) : 0,
        disbursement_frequency,
        Number(disbursement_day),
        userId,
      ],
    );

    // Primary contact record
    if (contact_person) {
      await conn.query(
        `INSERT INTO partner_contacts (id, partner_id, full_name, phone, email, position, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          uuidv4(),
          partnerId,
          contact_person,
          contact_phone || null,
          contact_email || null,
          contact_position || null,
        ],
      );
    }

    // Payment account
    if (payment_account && payment_account.method) {
      const pa = payment_account;
      await conn.query(
        `INSERT INTO partner_payment_accounts
          (id, partner_id, method, bank_name, account_name, account_number, branch,
           mpesa_number, paybill, till_number, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          uuidv4(),
          partnerId,
          pa.method,
          pa.bank_name || null,
          pa.account_name || null,
          pa.account_number || null,
          pa.branch || null,
          pa.mpesa_number || null,
          pa.paybill || null,
          pa.till_number || null,
        ],
      );
    }

    // Optional station assignment
    if (station_id) {
      await conn.query(
        `INSERT INTO partner_station_assignments (id, partner_user_id, partner_id, station_id, assigned_by)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), userId, partnerId, station_id, req.user?.id || null],
      );
      await conn.query(
        `UPDATE cb_stations SET host_partner_id = ? WHERE id = ?`,
        [userId, station_id],
      );
    }

    await conn.commit();
    conn.release();

    await logActivity(userId, req.user, "CREATED", "partner", { name, email });

    res.status(201).json({
      success: true,
      data: {
        id: userId,
        partner_id: partnerId,
        name,
        email,
        temp_password: tempPassword,
      },
    });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {}
    conn.release();
    next(e);
  }
};

// ============ UPDATE ============
exports.update = async (req, res, next) => {
  try {
    const userFields = [];
    const userVals = [];
    if (req.body.name !== undefined) {
      userFields.push("full_name = ?");
      userVals.push(req.body.name);
    }
    if (req.body.email !== undefined) {
      userFields.push("email = ?");
      userVals.push(req.body.email);
    }
    if (req.body.phone !== undefined) {
      userFields.push("phone = ?");
      userVals.push(req.body.phone);
    }
    if (req.body.is_active !== undefined) {
      userFields.push("is_active = ?");
      userVals.push(req.body.is_active ? 1 : 0);
    }
    if (userFields.length) {
      userVals.push(req.params.id);
      await db.query(
        `UPDATE system_users SET ${userFields.join(", ")} WHERE id = ?`,
        userVals,
      );
    }
    const map = {
      name: "name",
      business_reg_no: "registration_number",
      physical_address: "address",
      city: "city",
      county: "county",
      status: "status",
      tier: "tier",
      contact_person: "contact_person",
      contact_phone: "contact_phone",
      contact_email: "contact_email",
      contact_position: "contact_position",
      agreement_type: "agreement_type",
      revenue_share_percent: "revenue_share_percent",
      fixed_amount: "fixed_monthly_rent",
      disbursement_frequency: "disbursement_frequency",
      disbursement_day: "disbursement_day",
      notes: "notes",
    };
    const pFields = [];
    const pVals = [];
    for (const [k, col] of Object.entries(map)) {
      if (req.body[k] !== undefined) {
        let v = req.body[k];
        if (k === "agreement_type")
          v = v === "fixed" ? "fixed_rent" : "revenue_share";
        pFields.push(`${col} = ?`);
        pVals.push(v);
      }
    }
    if (pFields.length) {
      pVals.push(req.params.id);
      await db.query(
        `UPDATE partners SET ${pFields.join(", ")} WHERE user_id = ?`,
        pVals,
      );
    }
    await logActivity(req.params.id, req.user, "UPDATED", "partner", req.body);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (e) {
    next(e);
  }
};

exports.suspend = async (req, res, next) => {
  try {
    const active = req.body.is_active ? 1 : 0;
    await db.query(`UPDATE system_users SET is_active = ? WHERE id = ?`, [
      active,
      req.params.id,
    ]);
    await db.query(`UPDATE partners SET status = ? WHERE user_id = ?`, [
      active ? "active" : "suspended",
      req.params.id,
    ]);
    await logActivity(
      req.params.id,
      req.user,
      active ? "REACTIVATED" : "SUSPENDED",
      "partner",
    );
    res.json({
      success: true,
      data: { id: req.params.id, is_active: !!active },
    });
  } catch (e) {
    next(e);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const newPassword = req.body.password || generateTempPassword();
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query(`UPDATE system_users SET password_hash = ? WHERE id = ?`, [
      hash,
      req.params.id,
    ]);
    await logActivity(req.params.id, req.user, "PASSWORD_RESET", "partner");
    res.json({
      success: true,
      data: { id: req.params.id, temp_password: newPassword },
    });
  } catch (e) {
    next(e);
  }
};

// ============ CONTACTS ============
exports.addContact = async (req, res, next) => {
  try {
    const partner = await loadPartnerByUserId(req.params.id);
    if (!partner)
      return res
        .status(404)
        .json({ success: false, error: "Partner not found" });
    const id = uuidv4();
    const { full_name, phone, email, position, is_primary } = req.body;
    if (is_primary) {
      await db.query(
        `UPDATE partner_contacts SET is_primary = 0 WHERE partner_id = ?`,
        [partner.partner_id],
      );
    }
    await db.query(
      `INSERT INTO partner_contacts (id, partner_id, full_name, phone, email, position, is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        partner.partner_id,
        full_name,
        phone || null,
        email || null,
        position || null,
        is_primary ? 1 : 0,
      ],
    );
    await logActivity(
      req.params.id,
      req.user,
      "CONTACT_ADDED",
      "partner_contact",
      { full_name },
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

exports.removeContact = async (req, res, next) => {
  try {
    await db.query(`DELETE FROM partner_contacts WHERE id = ?`, [
      req.params.contact_id,
    ]);
    await logActivity(
      req.params.id,
      req.user,
      "CONTACT_REMOVED",
      "partner_contact",
    );
    res.json({ success: true, data: { id: req.params.contact_id } });
  } catch (e) {
    next(e);
  }
};

// ============ PAYMENT ACCOUNTS ============
exports.addPaymentAccount = async (req, res, next) => {
  try {
    const partner = await loadPartnerByUserId(req.params.id);
    if (!partner)
      return res
        .status(404)
        .json({ success: false, error: "Partner not found" });
    const id = uuidv4();
    const b = req.body;
    if (b.is_default) {
      await db.query(
        `UPDATE partner_payment_accounts SET is_default = 0 WHERE partner_id = ?`,
        [partner.partner_id],
      );
    }
    await db.query(
      `INSERT INTO partner_payment_accounts
        (id, partner_id, method, bank_name, account_name, account_number, branch,
         mpesa_number, paybill, till_number, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        partner.partner_id,
        b.method,
        b.bank_name || null,
        b.account_name || null,
        b.account_number || null,
        b.branch || null,
        b.mpesa_number || null,
        b.paybill || null,
        b.till_number || null,
        b.is_default ? 1 : 0,
      ],
    );
    await logActivity(
      req.params.id,
      req.user,
      "PAYMENT_ACCOUNT_ADDED",
      "payment_account",
      { method: b.method },
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

exports.removePaymentAccount = async (req, res, next) => {
  try {
    await db.query(`DELETE FROM partner_payment_accounts WHERE id = ?`, [
      req.params.account_id,
    ]);
    await logActivity(
      req.params.id,
      req.user,
      "PAYMENT_ACCOUNT_REMOVED",
      "payment_account",
    );
    res.json({ success: true, data: { id: req.params.account_id } });
  } catch (e) {
    next(e);
  }
};

// ============ STATION ASSIGNMENT ============
exports.assignStation = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const partner = await loadPartnerByUserId(req.params.id);
    if (!partner) {
      await conn.rollback();
      conn.release();
      return res
        .status(404)
        .json({ success: false, error: "Partner not found" });
    }
    const { station_id, note } = req.body;
    if (!station_id) {
      await conn.rollback();
      conn.release();
      return res
        .status(400)
        .json({ success: false, error: "station_id required" });
    }

    // Close any existing partner for this station
    await conn.query(
      `UPDATE partner_station_assignments SET unassigned_at = NOW()
       WHERE station_id = ? AND unassigned_at IS NULL`,
      [station_id],
    );
    await conn.query(
      `UPDATE partner_machine_deployments
       SET undeployed_at = NOW(), undeployed_by = ?, undeploy_note = 'Station reassigned'
       WHERE station_id = ? AND undeployed_at IS NULL`,
      [req.user?.id || null, station_id],
    );
    await conn.query(
      `INSERT INTO partner_station_assignments (id, partner_user_id, partner_id, station_id, assigned_by, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        partner.user_id,
        partner.partner_id,
        station_id,
        req.user?.id || null,
        note || null,
      ],
    );
    await conn.query(
      `UPDATE cb_stations SET host_partner_id = ? WHERE id = ?`,
      [partner.user_id, station_id],
    );
    await conn.commit();
    conn.release();
    await logActivity(
      partner.user_id,
      req.user,
      "STATION_ASSIGNED",
      "station",
      { station_id },
    );
    res.json({ success: true, data: { message: "Station assigned" } });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {}
    conn.release();
    next(e);
  }
};

exports.unassignStation = async (req, res, next) => {
  try {
    const { station_id } = req.body;
    if (!station_id)
      return res
        .status(400)
        .json({ success: false, error: "station_id required" });
    await db.query(
      `UPDATE partner_station_assignments SET unassigned_at = NOW()
       WHERE partner_user_id = ? AND station_id = ? AND unassigned_at IS NULL`,
      [req.params.id, station_id],
    );
    await db.query(
      `UPDATE cb_stations SET host_partner_id = NULL
       WHERE id = ? AND host_partner_id = ?`,
      [station_id, req.params.id],
    );
    await db.query(
      `UPDATE partner_machine_deployments
       SET undeployed_at = NOW(), undeployed_by = ?, undeploy_note = 'Station unassigned'
       WHERE partner_user_id = ? AND station_id = ? AND undeployed_at IS NULL`,
      [req.user?.id || null, req.params.id, station_id],
    );
    await logActivity(
      req.params.id,
      req.user,
      "STATION_UNASSIGNED",
      "station",
      { station_id },
    );
    res.json({ success: true, data: { message: "Station unassigned" } });
  } catch (e) {
    next(e);
  }
};

// ============ MACHINE DEPLOYMENTS ============
exports.deployMachine = async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const partner = await loadPartnerByUserId(req.params.id);
    if (!partner) {
      await conn.rollback();
      conn.release();
      return res
        .status(404)
        .json({ success: false, error: "Partner not found" });
    }

    const { machine_id, deployed_at, note } = req.body;
    if (!machine_id) {
      await conn.rollback();
      conn.release();
      return res
        .status(400)
        .json({ success: false, error: "machine_id required" });
    }
    const deployAt = toSqlDateTime(deployed_at || new Date());
    if (!deployAt) {
      await conn.rollback();
      conn.release();
      return res
        .status(400)
        .json({ success: false, error: "invalid deployment date" });
    }

    const [[machine]] = await conn.query(
      `SELECT id, name, station_id FROM machines WHERE id = ?`,
      [machine_id],
    );
    if (!machine) {
      await conn.rollback();
      conn.release();
      return res
        .status(404)
        .json({ success: false, error: "Machine not found" });
    }

    // Enforce: only ONE active deployment per machine at a time.
    const [[activeRow]] = await conn.query(
      `SELECT id, partner_user_id FROM partner_machine_deployments
       WHERE machine_id = ? AND undeployed_at IS NULL LIMIT 1`,
      [machine_id],
    );
    if (activeRow) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({
        success: false,
        error:
          activeRow.partner_user_id === partner.user_id
            ? "Machine is already actively deployed to this partner. Undeploy it first."
            : "Machine is currently deployed to another partner. Undeploy it there first.",
      });
    }

    const id = uuidv4();
    await conn.query(
      `INSERT INTO partner_machine_deployments
        (id, partner_user_id, partner_id, station_id, machine_id, deployed_at, deployed_by, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        partner.user_id,
        partner.partner_id,
        machine.station_id || null,
        machine_id,
        deployAt,
        req.user?.id || null,
        note || null,
      ],
    );

    await conn.commit();
    conn.release();
    await logActivity(
      partner.user_id,
      req.user,
      "MACHINE_DEPLOYED",
      "machine",
      { machine_id, deployed_at: deployAt },
    );
    res
      .status(201)
      .json({ success: true, data: { id, machine_id, deployed_at: deployAt } });
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {}
    conn.release();
    next(e);
  }
};

exports.undeployMachine = async (req, res, next) => {
  try {
    const { deployment_id, machine_id, undeployed_at, note } = req.body;
    const undeployAt = toSqlDateTime(undeployed_at || new Date());
    if (!undeployAt)
      return res
        .status(400)
        .json({ success: false, error: "invalid undeployment date" });

    const params = [req.params.id];
    let where = `partner_user_id = ? AND undeployed_at IS NULL`;
    if (deployment_id) {
      where += ` AND id = ?`;
      params.push(deployment_id);
    } else if (machine_id) {
      where += ` AND machine_id = ?`;
      params.push(machine_id);
    } else
      return res.status(400).json({
        success: false,
        error: "deployment_id or machine_id required",
      });

    const [[deployment]] = await db.query(
      `SELECT id, machine_id, station_id, deployed_at FROM partner_machine_deployments
       WHERE ${where} ORDER BY deployed_at DESC LIMIT 1`,
      params,
    );
    if (!deployment)
      return res
        .status(404)
        .json({ success: false, error: "Active deployment not found" });
    if (
      new Date(undeployAt).getTime() <
      new Date(deployment.deployed_at).getTime()
    ) {
      return res.status(400).json({
        success: false,
        error: "undeployment date cannot be before deployment date",
      });
    }

    await db.query(
      `UPDATE partner_machine_deployments
       SET undeployed_at = ?, undeployed_by = ?, undeploy_note = ?
       WHERE id = ?`,
      [undeployAt, req.user?.id || null, note || null, deployment.id],
    );
    await logActivity(
      req.params.id,
      req.user,
      "MACHINE_UNDEPLOYED",
      "machine",
      {
        deployment_id: deployment.id,
        machine_id: deployment.machine_id,
        station_id: deployment.station_id,
      },
    );
    res.json({
      success: true,
      data: { id: deployment.id, undeployed_at: undeployAt },
    });
  } catch (e) {
    next(e);
  }
};

// ============ DISBURSEMENTS ============
exports.getDisbursements = async (req, res, next) => {
  try {
    const { status, partner_user_id } = req.query;
    const where = [];
    const params = [];
    if (status) {
      where.push("d.status = ?");
      params.push(status);
    }
    if (partner_user_id) {
      where.push("d.partner_user_id = ?");
      params.push(partner_user_id);
    }
    // Scope: partners see only their own
    if (req.user.role === "location_partner") {
      where.push("d.partner_user_id = ?");
      params.push(req.user.id);
    }
    const [rows] = await db.query(
      `SELECT d.*, m.name AS machine_name, m.name AS station_name, u.full_name AS partner_name
       FROM partner_disbursements d
        LEFT JOIN machines m ON m.id = d.station_id
       LEFT JOIN system_users u ON u.id = d.partner_user_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY d.period_start DESC, d.generated_at DESC LIMIT 500`,
      params,
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.generateDisbursement = async (req, res, next) => {
  try {
    const { partner_user_id, machine_id, period_start, period_end } = req.body;
    if (!partner_user_id || !machine_id || !period_start || !period_end) {
      return res.status(400).json({
        success: false,
        error: "partner_user_id, machine_id, period_start, period_end required",
      });
    }
    const r = await disbursementService.computeAndInsert({
      partnerUserId: partner_user_id,
      machineId: machine_id,
      periodStart: period_start,
      periodEnd: period_end,
    });
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.status(201).json({ success: true, data: r.disbursement });
  } catch (e) {
    next(e);
  }
};

exports.updateDisbursementStatus = async (req, res, next) => {
  try {
    const {
      status,
      payment_method,
      payment_account_id,
      reference_number,
      transaction_code,
      notes,
      amount_paid,
      paid_at,
    } = req.body;
    if (!["pending", "approved", "paid", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, error: "invalid status" });
    }
    const fields = ["status = ?"];
    const vals = [status];
    if (status === "paid") {
      fields.push(
        "paid_at = COALESCE(?, NOW())",
        "paid_by = ?",
        "payment_method = ?",
        "payment_account_id = ?",
        "reference_number = ?",
        "transaction_code = ?",
        "notes = ?",
      );
      vals.push(
        paid_at || null,
        req.user.id,
        payment_method || null,
        payment_account_id || null,
        reference_number || null,
        transaction_code || null,
        notes || null,
      );
      if (amount_paid !== undefined) {
        fields.push("amount_payable = ?");
        vals.push(amount_paid);
      }
    }
    vals.push(req.params.disb_id);
    await db.query(
      `UPDATE partner_disbursements SET ${fields.join(", ")} WHERE id = ?`,
      vals,
    );
    // Log against partner
    const [[row]] = await db.query(
      `SELECT partner_user_id FROM partner_disbursements WHERE id = ?`,
      [req.params.disb_id],
    );
    if (row)
      await logActivity(
        row.partner_user_id,
        req.user,
        `DISBURSEMENT_${status.toUpperCase()}`,
        "disbursement",
        { disb_id: req.params.disb_id },
      );
    res.json({ success: true, data: { id: req.params.disb_id, status } });
  } catch (e) {
    next(e);
  }
};

// ============ RENTALS / REVENUE ============
exports.getRentals = async (req, res, next) => {
  try {
    const uid =
      req.user.role === "location_partner" ? req.user.id : req.params.id;
    const [rows] = await db.query(
      `SELECT r.id, r.rental_code, r.station_id, s.name AS station_name,
              COALESCE(NULLIF(r.machine_id, ''), pmd.machine_id) AS machine_id,
              COALESCE(rm.name, dm.name) AS machine_name,
              pmd.id AS deployment_id, pmd.deployed_at, pmd.undeployed_at,
              r.phone_number, r.total_amount, r.status, r.start_time,
              CONVERT_TZ(r.end_time, '+08:00', '+00:00') AS end_time,
              r.created_at
       ${partnerRentalWindowFromSql()}
       LEFT JOIN cb_stations s ON s.id = r.station_id
       LEFT JOIN machines rm ON rm.id = r.machine_id
       WHERE pmd.partner_user_id = ?
       ORDER BY r.created_at DESC LIMIT 500`,
      [uid],
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

// ============ PARTNER SELF-DASHBOARD ============
exports.getPartnerDashboard = async (req, res, next) => {
  try {
    const uid = req.user.id;
    const partner = await loadPartnerByUserId(uid);
    if (!partner)
      return res
        .status(404)
        .json({ success: false, error: "Partner profile not found" });

    const [[assignments], [disbursements]] = await Promise.all([
      db.query(
        `SELECT psa.*, s.name AS station_name, s.address AS station_address, s.county_name
         FROM partner_station_assignments psa
         LEFT JOIN cb_stations s ON s.id = psa.station_id
         WHERE psa.partner_user_id = ? ORDER BY psa.assigned_at DESC`,
        [uid],
      ),
      db.query(
        // FIXED: Removed the machine join since d.machine_id doesn't exist
        `SELECT d.*, s.name AS station_name FROM partner_disbursements d
         LEFT JOIN cb_stations s ON s.id = d.station_id
         WHERE d.partner_user_id = ? ORDER BY d.period_start DESC LIMIT 50`,
        [uid],
      ),
    ]);

    const [machines] = await db.query(
      `SELECT pmd.id AS deployment_id, pmd.station_id, pmd.machine_id AS id,
              pmd.deployed_at, m.name, m.model, m.status, s.name AS station_name
       FROM partner_machine_deployments pmd
       JOIN machines m ON m.id = pmd.machine_id
       LEFT JOIN cb_stations s ON s.id = pmd.station_id
       WHERE pmd.partner_user_id = ? AND pmd.undeployed_at IS NULL
       ORDER BY pmd.deployed_at DESC`,
      [uid],
    );

    const [rentals] = await db.query(
      `SELECT r.id, r.rental_code, r.total_amount, r.status, r.created_at,
              s.name AS station_name, COALESCE(rm.name, dm.name) AS machine_name
       ${partnerRentalWindowFromSql()}
       LEFT JOIN cb_stations s ON s.id = r.station_id
       LEFT JOIN machines rm ON rm.id = r.machine_id
       WHERE pmd.partner_user_id = ?
       ORDER BY r.created_at DESC LIMIT 25`,
      [uid],
    );

    const [[a]] = await db.query(
      `SELECT COUNT(DISTINCT r.id) AS c, COALESCE(SUM(r.total_amount),0) AS s
       ${partnerRentalWindowFromSql()}
       WHERE pmd.partner_user_id = ? AND r.status='completed'`,
      [uid],
    );

    const [[b]] = await db.query(
      `SELECT COUNT(DISTINCT r.id) AS c, COALESCE(SUM(r.total_amount),0) AS s
       ${partnerRentalWindowFromSql()}
       WHERE pmd.partner_user_id = ? AND r.status='completed'
         AND r.created_at >= DATE_FORMAT(CURDATE(),'%Y-%m-01')`,
      [uid],
    );

    const rev = {
      total_revenue: Number(a.s),
      total_rentals: Number(a.c),
      month_revenue: Number(b.s),
      month_rentals: Number(b.c),
    };

    const pending = disbursements
      .filter((d) => d.status !== "paid" && d.status !== "cancelled")
      .reduce((s, d) => s + Number(d.amount_payable), 0);
    const paid = disbursements
      .filter((d) => d.status === "paid")
      .reduce((s, d) => s + Number(d.amount_payable), 0);

    res.json({
      success: true,
      data: {
        partner,
        stations: assignments,
        machines,
        rentals,
        disbursements,
        revenue: rev,
        pending_payouts: pending,
        paid_payouts: paid,
      },
    });
  } catch (e) {
    console.error(e);
    next(e);
  }
};

// ============ BACKWARDS-COMPAT ============
exports.getById = exports.getProfile;
exports.getPayouts = exports.getDisbursements;
