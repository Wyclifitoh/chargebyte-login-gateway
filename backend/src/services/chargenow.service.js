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
      [
        method,
        path,
        deviceId || null,
        status || null,
        ms,
        err ? String(err).slice(0, 1000) : null,
      ],
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
      await logCall(
        method,
        path,
        deviceId,
        res.status,
        Date.now() - start,
        null,
      );
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
// API 3: cabinet detail by device id
async function getCabinet(deviceId) {
  if (!deviceId) throw new Error("deviceId required");
  const response = await request("GET", `/rent/cabinet/query`, {
    params: { deviceId },
    deviceId,
  });

  // Check if the response indicates device is not online
  if (response.code === 2004 && response.msg === "Device not online.") {
    // Mark the machine as offline in the database
    await db
      .query(
        `UPDATE machines 
       SET 
         is_online = 0,
         status = 'offline',
         last_synced_at = NOW(),
         last_sync_error = 'Device reported as offline by manufacturer API'
       WHERE model = ? OR cabinet_device_id = ?`,
        [deviceId, deviceId],
      )
      .catch(() => {});

    // Return a special response indicating offline status
    return {
      is_online: false,
      online: false,
      msg: "Device not online",
      code: 2004,
      _offline: true,
    };
  }

  return response;
}

// Cached wrapper — refreshes machine telemetry columns on success.
async function getCabinetCached(deviceId, maxAgeMs = 60_000) {
  if (!deviceId) return null;

  const hit = cabinetCache.get(deviceId);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.data;

  try {
    const data = await getCabinet(deviceId);
    cabinetCache.set(deviceId, { at: Date.now(), data });

    // Only apply if the response is not an offline error
    if (!data._offline) {
      await applyCabinetToMachine(deviceId, data).catch((err) => {
        console.error("Error applying cabinet to machine:", err);
      });
    } else {
      // Already updated status to offline in getCabinet
      console.log(`Device ${deviceId} is offline`);
    }

    return data;
  } catch (e) {
    // On failure, mark last_sync_error but keep any cached data
    await db
      .query(
        `UPDATE machines 
         SET last_sync_error = ?, last_synced_at = NOW()
         WHERE model = ? OR cabinet_device_id = ?`,
        [String(e.message || e).slice(0, 500), deviceId, deviceId],
      )
      .catch(() => {});
    if (hit) return hit.data;
    throw e;
  }
}

// Normalize vendor payload to our columns. Vendor shapes vary — pull whichever
// key is present. Extra fields are ignored.
function normalizeCabinet(raw) {
  const d = raw?.data || raw || {};
  const cabinet = d.cabinet || {};
  const shop = d.shop || {};
  const priceStrategy = d.priceStrategy || {};

  return {
    is_online: cabinet.online != null ? (cabinet.online ? 1 : 0) : null,
    signal_strength: numOrNull(cabinet.signal ?? d.signal ?? d.signalStrength),
    empty_slots: numOrNull(cabinet.emptySlots ?? d.emptySlots ?? d.freeSlots),
    busy_slots: numOrNull(cabinet.busySlots ?? d.busySlots ?? d.rented),
    total_slots: numOrNull(cabinet.slots ?? d.slots),
    cabinet_model: cabinet.type ?? d.model ?? d.cabinetModel ?? null,
    manufacturer_cabinet_id: cabinet.id ?? d.cabinetId ?? d.pCabinetId ?? null,
    shop_name: shop.name || null,
    shop_address: shop.address || null,
    shop_latitude: shop.latitude || null,
    shop_longitude: shop.longitude || null,
    deposit_amount: priceStrategy.depositAmount || null,
    price_per_minute: priceStrategy.priceMinute || null,
    free_minutes: priceStrategy.freeMinutes || null,
    daily_max_price: priceStrategy.dailyMaxPrice || null,
    batteries: Array.isArray(d.batteries)
      ? d.batteries
      : Array.isArray(d.slots)
        ? d.slots
        : [],
  };
}

function numOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function applyCabinetToMachine(deviceId, raw) {
  // If raw indicates offline, skip processing
  if (raw && raw._offline) {
    return null;
  }

  // Check if raw has the expected data structure
  if (!raw || !raw.data) {
    console.log(`No valid data for deviceId: ${deviceId}`);
    return null;
  }

  const n = normalizeCabinet(raw);

  // Find machine by model (or cabinet_device_id)
  const [machineResult] = await db.query(
    "SELECT id, station_id FROM machines WHERE model = ? OR cabinet_device_id = ?",
    [deviceId, deviceId],
  );

  if (machineResult.length === 0) {
    console.log(`No machine found for deviceId: ${deviceId}`);
    return n;
  }

  const machineId = machineResult[0].id;

  // NOTE: the manufacturer sync is telemetry-only. It must NEVER overwrite
  // human-curated naming (machine name, station/location name or address) —
  // the vendor returns the same shop name for every cabinet, which previously
  // renamed every machine/station identically. Only live status + slot
  // telemetry is written back here.

  // Update the machine (status/telemetry only)
  await db.query(
    `UPDATE machines
     SET 
       is_online = COALESCE(?, is_online),
       signal_strength = COALESCE(?, signal_strength),
       empty_slots = COALESCE(?, empty_slots),
       busy_slots = COALESCE(?, busy_slots),
       total_slots = COALESCE(?, total_slots),
       manufacturer_cabinet_id = COALESCE(manufacturer_cabinet_id, ?),
       cabinet_device_id = COALESCE(cabinet_device_id, ?),
       status = CASE 
         WHEN ? = 1 THEN 'online'
         WHEN ? = 0 THEN 'offline'
         ELSE status
       END,
       last_synced_at = NOW(),
       last_sync_error = NULL
     WHERE id = ?`,
    [
      n.is_online,
      n.signal_strength,
      n.empty_slots,
      n.busy_slots,
      n.total_slots,
      n.manufacturer_cabinet_id,
      deviceId,
      n.is_online,
      n.is_online,
      machineId,
    ],
  );

  // Update powerbanks only if we have batteries data
  if (Array.isArray(n.batteries) && n.batteries.length) {
    // First, clear existing powerbanks for this machine (since we're getting fresh data)
    // Or you can update them individually
    for (const b of n.batteries) {
      const batteryId = b.batteryId || b.battery_id || b.bId || b.id;
      if (!batteryId) continue;
      const voltage = numOrNull(b.voltage ?? b.vol);
      const soc = numOrNull(b.soc ?? b.percent ?? b.electricQuantity);
      const slotNum = b.slotNum || b.slot || 0;

      await db
        .query(
          `INSERT INTO powerbanks 
         (id, machine_id, battery_id, slot_number, voltage, soc_percent, status, last_seen_at, created_at, updated_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, 'in_cabinet', NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           machine_id = VALUES(machine_id),
           slot_number = VALUES(slot_number),
           voltage = COALESCE(VALUES(voltage), voltage),
           soc_percent = COALESCE(VALUES(soc_percent), soc_percent),
           status = 'in_cabinet',
           last_seen_at = NOW(),
           updated_at = NOW()`,
          [machineId, batteryId, slotNum, voltage, soc],
        )
        .catch((err) => console.error("Error upserting powerbank:", err));
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
