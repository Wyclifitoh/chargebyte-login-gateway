// ChargeNow manufacturer API client.
// - Basic auth via env (CHARGENOW_USERNAME/PASSWORD), base URL from env or system_settings.
// - 8s timeout, one retry on transient error.
// - Structured logging to `chargenow_api_logs`.
// - In-memory TTL cache for `getCabinet` to avoid hammering the vendor.
// - `getCabinetCached` also refreshes `machines.*` telemetry columns.

const axios = require("axios");
const db = require("../config/database");
const settings = require("../config/settings");

const DEFAULT_BASE = "https://developer.chargenow.top/cdb-open-api/v1";
const TIMEOUT_MS = 8000;

// device_id -> { at, data }
const cabinetCache = new Map();

async function baseUrl() {
  return (
    process.env.CHARGENOW_BASE_URL ||
    (await settings.get("chargenow_base_url", DEFAULT_BASE)) ||
    DEFAULT_BASE
  );
}

function authHeader() {
  const u = process.env.CHARGENOW_USERNAME || "";
  const p = process.env.CHARGENOW_PASSWORD || "";
  if (!u || !p) return null;
  return "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
}

async function logCall(method, path, deviceId, status, ms, err) {
  try {
    await db.query(
      `INSERT INTO chargenow_api_logs (method, path, device_id, status_code, duration_ms, error)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [method, path, deviceId || null, status || null, ms, err ? String(err).slice(0, 1000) : null],
    );
  } catch (e) {
    console.error("chargenow log error:", e.message);
  }
}

async function request(method, path, { params, data, deviceId } = {}) {
  const auth = authHeader();
  if (!auth) {
    const err = new Error("ChargeNow credentials not configured");
    err.code = "NO_CREDENTIALS";
    throw err;
  }
  const url = (await baseUrl()).replace(/\/+$/, "") + path;
  const start = Date.now();
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios({
        method,
        url,
        params,
        data,
        timeout: TIMEOUT_MS,
        headers: { Authorization: auth, "Content-Type": "application/json" },
      });
      await logCall(method, path, deviceId, res.status, Date.now() - start, null);
      return res.data;
    } catch (e) {
      lastErr = e;
      const status = e.response?.status;
      // Don't retry on 4xx auth/validation errors
      if (status && status >= 400 && status < 500) break;
      // brief backoff
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  const status = lastErr?.response?.status || 0;
  const msg = lastErr?.response?.data
    ? JSON.stringify(lastErr.response.data).slice(0, 500)
    : lastErr?.message;
  await logCall(method, path, deviceId, status, Date.now() - start, msg);
  const err = new Error(`ChargeNow ${method} ${path} failed: ${msg}`);
  err.status = status;
  throw err;
}

// ---- Public API ----

// API 1: get current event-push config
async function getEventPushConfig() {
  return request("GET", "/rent/eventNoticeConfig");
}

// API 2: set event-push config
async function setEventPushConfig({ pushUrl, events }) {
  return request("POST", "/rent/eventNoticeConfig", {
    data: { pushUrl, events: events || [] },
  });
}

// API 3: cabinet detail by device id
async function getCabinet(deviceId) {
  if (!deviceId) throw new Error("deviceId required");
  return request("GET", `/rent/cabinet/query`, {
    params: { deviceId },
    deviceId,
  });
}

// Cached wrapper — refreshes machine telemetry columns on success.
async function getCabinetCached(deviceId, maxAgeMs = 60_000) {
  if (!deviceId) return null;
  const hit = cabinetCache.get(deviceId);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.data;
  try {
    const data = await getCabinet(deviceId);
    cabinetCache.set(deviceId, { at: Date.now(), data });
    await applyCabinetToMachine(deviceId, data).catch(() => {});
    return data;
  } catch (e) {
    // On failure, mark last_sync_error but keep any cached data
    await db.query(
      `UPDATE machines SET last_sync_error = ?, last_synced_at = NOW()
       WHERE cabinet_device_id = ?`,
      [String(e.message || e).slice(0, 500), deviceId],
    ).catch(() => {});
    if (hit) return hit.data;
    throw e;
  }
}

// Normalize vendor payload to our columns. Vendor shapes vary — pull whichever
// key is present. Extra fields are ignored.
function normalizeCabinet(raw) {
  const d = raw?.data || raw || {};
  return {
    is_online:
      d.online != null ? (d.online ? 1 : 0) :
      d.status === "online" ? 1 :
      d.status === "offline" ? 0 : null,
    signal_strength: numOrNull(d.signal ?? d.signalStrength ?? d.rssi),
    empty_slots: numOrNull(d.emptySlots ?? d.freeSlots ?? d.available),
    busy_slots: numOrNull(d.busySlots ?? d.usedSlots ?? d.rented),
    cabinet_model: d.model ?? d.cabinetModel ?? null,
    manufacturer_cabinet_id: d.cabinetId ?? d.pCabinetId ?? null,
    batteries: Array.isArray(d.batteries) ? d.batteries : Array.isArray(d.slots) ? d.slots : [],
  };
}
function numOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function applyCabinetToMachine(deviceId, raw) {
  const n = normalizeCabinet(raw);
  await db.query(
    `UPDATE machines
       SET is_online = COALESCE(?, is_online),
           signal_strength = COALESCE(?, signal_strength),
           empty_slots = COALESCE(?, empty_slots),
           busy_slots = COALESCE(?, busy_slots),
           cabinet_model = COALESCE(?, cabinet_model),
           manufacturer_cabinet_id = COALESCE(?, manufacturer_cabinet_id),
           last_synced_at = NOW(),
           last_sync_error = NULL
     WHERE cabinet_device_id = ?`,
    [
      n.is_online, n.signal_strength, n.empty_slots, n.busy_slots,
      n.cabinet_model, n.manufacturer_cabinet_id, deviceId,
    ],
  );
  // Upsert powerbanks seen in this cabinet
  if (Array.isArray(n.batteries) && n.batteries.length) {
    const [[machine]] = [
      await db.query("SELECT id FROM machines WHERE cabinet_device_id = ? LIMIT 1", [deviceId]),
    ];
    const machineId = machine?.[0]?.id || null;
    for (const b of n.batteries) {
      const batteryId = b.batteryId || b.battery_id || b.bId || b.id;
      if (!batteryId) continue;
      const voltage = numOrNull(b.voltage ?? b.vol);
      const soc = numOrNull(b.soc ?? b.percent ?? b.electricQuantity);
      await db.query(
        `INSERT INTO powerbanks (id, machine_id, battery_id, voltage, soc_percent, status, last_seen_at)
         VALUES (UUID(), ?, ?, ?, ?, 'in_cabinet', NOW())
         ON DUPLICATE KEY UPDATE
           machine_id = VALUES(machine_id),
           voltage = VALUES(voltage),
           soc_percent = VALUES(soc_percent),
           status = 'in_cabinet',
           last_seen_at = NOW()`,
        [machineId, batteryId, voltage, soc],
      ).catch(() => {});
    }
  }
  return n;
}

function invalidateCache(deviceId) {
  if (deviceId) cabinetCache.delete(deviceId);
  else cabinetCache.clear();
}

module.exports = {
  getEventPushConfig,
  setEventPushConfig,
  getCabinet,
  getCabinetCached,
  applyCabinetToMachine,
  normalizeCabinet,
  invalidateCache,
};
