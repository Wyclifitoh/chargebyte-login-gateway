// Authenticated ChargeNow routes (config + machine sync).
const express = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const c = require("../controllers/chargenow.controller");

const router = express.Router();
router.use(authenticate);

router.get("/config", authorize("super_admin"), c.getConfig);
router.post("/config", authorize("super_admin"), c.setConfig);
router.post(
  "/machines/:id/sync",
  authorize("super_admin", "admin", "staff"),
  c.syncMachine,
);

module.exports = router;
