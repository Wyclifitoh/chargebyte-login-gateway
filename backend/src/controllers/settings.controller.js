const settings = require("../config/settings");

// Allowed keys editable via API (whitelist to prevent arbitrary writes).
const EDITABLE_KEYS = new Set([
  "default_clockin_radius_m",
  "chargenow_base_url",
  "chargenow_push_url",
  "chargenow_webhook_secret",
]);

// Keys safe to expose to non-super-admin dashboard users.
const PUBLIC_KEYS = new Set(["default_clockin_radius_m"]);

exports.getAll = async (req, res, next) => {
  try {
    const all = await settings.all();
    // Super admin sees everything; others get public subset only.
    const isSuper = req.user?.role === "super_admin";
    const out = {};
    for (const [k, v] of Object.entries(all)) {
      if (isSuper || PUBLIC_KEYS.has(k)) out[k] = v;
    }
    res.json({ success: true, data: out });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const body = req.body || {};
    const applied = {};
    for (const [k, v] of Object.entries(body)) {
      if (!EDITABLE_KEYS.has(k)) continue;
      await settings.set(k, v, req.user?.id || null);
      applied[k] = v;
    }
    res.json({ success: true, data: applied });
  } catch (e) {
    next(e);
  }
};
