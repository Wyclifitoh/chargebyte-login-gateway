const express = require("express");
const { body, param } = require("express-validator");
const { validate } = require("../middleware/validate.middleware");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { auditLog } = require("../middleware/audit.middleware");
const controller = require("../controllers/machine.controller");

const router = express.Router();
router.use(authenticate);

router.get("/", controller.getAll);
router.get("/:id", [param("id").trim().notEmpty(), validate], controller.getById);

router.post(
  "/",
  authorize("super_admin", "admin"),
  [
    body("name").trim().notEmpty(),
    body("station_id").trim().notEmpty(),
    body("total_slots").isInt({ min: 1 }),
    validate,
  ],
  auditLog("CREATE", "machines"),
  controller.create,
);

router.put(
  "/:id",
  authorize("super_admin", "admin"),
  [param("id").trim().notEmpty(), validate],
  auditLog("UPDATE", "machines"),
  controller.update,
);

router.patch(
  "/:id/status",
  authorize("super_admin", "admin", "staff"),
  [
    param("id").trim().notEmpty(),
    body("status").isIn(["online", "offline", "maintenance"]),
    validate,
  ],
  auditLog("UPDATE", "machines"),
  controller.setStatus,
);

router.delete(
  "/:id",
  authorize("super_admin"),
  [param("id").trim().notEmpty(), validate],
  auditLog("DELETE", "machines"),
  controller.remove,
);

// Manual manufacturer sync — delegates to ChargeNow service.
const chargenowController = require("../controllers/chargenow.controller");
router.post(
  "/:id/sync",
  authorize("super_admin", "admin", "staff"),
  [param("id").trim().notEmpty(), validate],
  chargenowController.syncMachine,
);

module.exports = router;
