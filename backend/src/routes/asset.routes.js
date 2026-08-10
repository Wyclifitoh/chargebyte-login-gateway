const express = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { auditLog } = require("../middleware/audit.middleware");
const c = require("../controllers/asset.controller");

const router = express.Router();
router.use(authenticate);

// Admins only (super_admin + admin)
const adminsOnly = authorize("super_admin", "admin");

router.get("/", adminsOnly, c.list);
router.get("/summary", adminsOnly, c.summary);
router.get("/assignable-staff", adminsOnly, c.assignableStaff);
router.get("/:id", adminsOnly, c.getById);
router.post("/", adminsOnly, auditLog("CREATE", "assets"), c.create);
router.put("/:id", adminsOnly, auditLog("UPDATE", "assets"), c.update);
router.delete("/:id", authorize("super_admin"), auditLog("DELETE", "assets"), c.remove);

module.exports = router;