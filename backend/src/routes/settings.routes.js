const express = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { auditLog } = require("../middleware/audit.middleware");
const c = require("../controllers/settings.controller");

const router = express.Router();
router.use(authenticate);

// Any authenticated user can read public keys; super_admin sees all.
router.get("/", c.getAll);

// Only super_admin can mutate settings.
router.put(
  "/",
  authorize("super_admin"),
  auditLog("UPDATE", "system_settings"),
  c.update,
);

module.exports = router;
