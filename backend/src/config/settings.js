// Cached read/write access to the `system_settings` key/value table.
// TTL cache avoids hammering the DB from hot paths (clock-in, webhook, sync).

const db = require("./database");

const TTL_MS = 30_000;
let cache = { at: 0, values: {} };

async function loadAll() {
  const [rows] = await db.query("SELECT `key`, `value` FROM system_settings");
  const values = {};
  for (const r of rows) values[r.key] = r.value;
  cache = { at: Date.now(), values };
  return values;
}

async function all() {
  if (Date.now() - cache.at < TTL_MS) return cache.values;
  return loadAll();
}

async function get(key, fallback = null) {
  const v = (await all())[key];
  return v == null || v === "" ? fallback : v;
}

async function getInt(key, fallback) {
  const v = await get(key, null);
  const n = v == null ? NaN : parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function set(key, value, userId = null) {
  await db.query(
    `INSERT INTO system_settings (\`key\`, \`value\`, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_by = VALUES(updated_by)`,
    [key, value == null ? null : String(value), userId],
  );
  cache.at = 0; // invalidate
}

function invalidate() {
  cache.at = 0;
}

module.exports = { all, get, getInt, set, invalidate };
