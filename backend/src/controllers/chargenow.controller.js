// ChargeNow controller: webhook ingest, config passthrough, machine sync.

const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const db = require("../config/database");
const settings = require("../config/settings");
const chargenow = require("../services/chargenow.service");

// ---- Webhook (public) ----

// Verify HMAC signature against the raw body. Falls back to shared-secret
// header equality when vendor doesn't sign. Body-less requests are rejected.
async function verifySignature(req) {
  const secret = process.env.CHARGENOW_WEBHOOK_SECRET
    || (await settings.get("chargenow_webhook_secret", ""));
  if (!secret) return { ok: false, reason: "webhook secret not configured" };
  const raw = req.rawBody;
  if (!raw) return { ok: false, reason: "empty body" };

  const sig = req.get("X-ChargeNow-Signature") || req.get("X-Signature") || "";
  if (sig) {
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig.replace(/^sha256=/, ""), "utf8");
    if (a.length !== b.length) return { ok: false, reason: "bad signature length" };
    return { ok: crypto.timingSafeEqual(a, b), reason: "signature mismatch" };
  }
  // Fallback: shared token in header
  const token = req.get("X-Webhook-Token") || "";
  if (token && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
    return { ok: true };
  }
  return { ok: false, reason: "missing signature" };
}

exports.webhook = async (req, res) => {
  try {
    const v = await verifySignature(req);
    if (!v.ok) {
      return res.status(401).json({ success: false, error: v.reason || "unauthorized" });
    }
    const payload = req.body || {};
    const eventType = payload.event || payload.eventType || payload.type || "unknown";
    const deviceId = payload.deviceId || payload.device_id || payload.dId || null;
    const batteryId = payload.batteryId || payload.battery_id || payload.bId || null;
    const eventTime = payload.eventTime || payload.time || payload.timestamp || "";

    const dedupeKey = crypto
      .createHash("sha256")
      .update(`${eventType}|${deviceId || ""}|${batteryId || ""}|${eventTime}`)
      .digest("hex");

    // Idempotent insert
    const id = uuidv4();
    try {
      await db.query(
        `INSERT INTO chargenow_webhook_events
          (id, event_type, device_id, battery_id, payload, signature, dedupe_key)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          String(eventType).slice(0, 64),
          deviceId,
          batteryId,
          JSON.stringify(payload),
          req.get("X-ChargeNow-Signature") || null,
          dedupeKey,
        ],
      );
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY") {
        return res.json({ success: true, data: { deduped: true } });
      }
      throw e;
    }

    // Fire-and-forget handler; keep webhook fast
    handleEvent({ eventType, deviceId, batteryId, payload })
      .then(() =>
        db.query("UPDATE chargenow_webhook_events SET processed_at = NOW() WHERE id = ?", [id]),
      )
      .catch((err) =>
        db.query(
          "UPDATE chargenow_webhook_events SET process_error = ? WHERE id = ?",
          [String(err.message || err).slice(0, 500), id],
        ),
      );

    res.json({ success: true, data: { id } });
  } catch (e) {
    console.error("chargenow webhook error:", e);
    res.status(500).json({ success: false, error: "webhook processing failed" });
  }
};

async function handleEvent({ eventType, deviceId, batteryId, payload }) {
  const t = String(eventType).toLowerCase();

  if (deviceId && (t.includes("online") || t.includes("offline") || t.includes("status"))) {
    const isOnline = t.includes("online") && !t.includes("offline") ? 1 : 0;
    await db.query(
      `UPDATE machines SET is_online = ?, last_synced_at = NOW() WHERE cabinet_device_id = ?`,
      [isOnline, deviceId],
    );
  }

  if (batteryId && (t.includes("battery") || t.includes("borrow") || t.includes("return"))) {
    const isReturn = t.includes("return") || t.includes("in");
    const voltage = payload.voltage ?? payload.vol ?? null;
    const soc = payload.soc ?? payload.percent ?? null;
    await db.query(
      `INSERT INTO powerbanks (id, machine_id, battery_id, voltage, soc_percent, status, last_seen_at)
       VALUES (UUID(), (SELECT id FROM machines WHERE cabinet_device_id = ? LIMIT 1), ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         machine_id = VALUES(machine_id),
         voltage = COALESCE(VALUES(voltage), voltage),
         soc_percent = COALESCE(VALUES(soc_percent), soc_percent),
         status = VALUES(status),
         last_seen_at = NOW()`,
      [deviceId, batteryId, voltage, soc, isReturn ? "in_cabinet" : "rented"],
    );
  }

  // Any event invalidates the cabinet cache
  if (deviceId) chargenow.invalidateCache(deviceId);
}

// ---- Config passthrough (super_admin) ----

exports.getConfig = async (_req, res, next) => {
  try {
    const data = await chargenow.getEventPushConfig();
    res.json({ success: true, data });
  } catch (e) {
    res.status(502).json({ success: false, error: e.message });
  }
};

exports.setConfig = async (req, res, next) => {
  try {
    const { pushUrl, events } = req.body || {};
    if (!pushUrl) return res.status(400).json({ success: false, error: "pushUrl required" });
    const data = await chargenow.setEventPushConfig({ pushUrl, events });
    await settings.set("chargenow_push_url", pushUrl, req.user?.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(502).json({ success: false, error: e.message });
  }
};

// ---- Manual machine sync ----

exports.syncMachine = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, cabinet_device_id FROM machines WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ success: false, error: "Machine not found" });
    const deviceId = rows[0].cabinet_device_id;
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: "Machine has no cabinet_device_id — set it before syncing.",
      });
    }
    chargenow.invalidateCache(deviceId);
    const data = await chargenow.getCabinetCached(deviceId, 0);
    res.json({ success: true, data });
  } catch (e) {
    res.status(502).json({ success: false, error: e.message });
  }
};

// ---- Background poller ----

let pollerHandle = null;
function startBackgroundSync(intervalMs = 5 * 60_000) {
  if (pollerHandle) return;
  pollerHandle = setInterval(async () => {
    try {
      const [rows] = await db.query(
        `SELECT cabinet_device_id FROM machines
         WHERE cabinet_device_id IS NOT NULL
           AND (last_synced_at IS NULL OR last_synced_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE))
         LIMIT 50`,
      );
      for (const r of rows) {
        try { await chargenow.getCabinetCached(r.cabinet_device_id, 0); }
        catch { /* logged in service */ }
      }
    } catch (e) {
      console.error("chargenow poller error:", e.message);
    }
  }, intervalMs);
  pollerHandle.unref?.();
}
exports.startBackgroundSync = startBackgroundSync;
