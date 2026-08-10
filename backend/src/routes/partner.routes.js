// backend/src/routes/partner.routes.js
const express = require("express");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { auditLog } = require("../middleware/audit.middleware");
const c = require("../controllers/partner.controller");

const router = express.Router();
router.use(authenticate);

// Partner self-service
router.get(
  "/me/dashboard",
  authorize("location_partner"),
  c.getPartnerDashboard,
);

// Admin summary + list
router.get(
  "/summary",
  authorize("super_admin", "admin", "staff"),
  c.getAdminSummary,
);
router.get("/", authorize("super_admin", "admin", "staff"), c.getAll);

// Disbursements
router.get(
  "/disbursements",
  authorize("super_admin", "admin", "staff", "location_partner"),
  c.getDisbursements,
);
router.post(
  "/disbursements/generate",
  authorize("super_admin", "admin"),
  auditLog("CREATE", "partner_disbursements"),
  c.generateDisbursement,
);
router.patch(
  "/disbursements/:disb_id",
  authorize("super_admin", "admin"),
  auditLog("UPDATE", "partner_disbursements"),
  c.updateDisbursementStatus,
);

// Backwards-compat
router.get(
  "/payouts",
  authorize("super_admin", "admin", "staff", "location_partner"),
  c.getDisbursements,
);

// Machine deployments must be declared before dynamic /:id profile route
router.post(
  "/:id/deploy-machine",
  authorize("super_admin", "admin"),
  auditLog("CREATE", "partner_machine_deployments"),
  c.deployMachine,
);
router.post(
  "/:id/undeploy-machine",
  authorize("super_admin", "admin"),
  auditLog("UPDATE", "partner_machine_deployments"),
  c.undeployMachine,
);

// Profile
router.get(
  "/:id",
  authorize("super_admin", "admin", "staff", "location_partner"),
  c.getProfile,
);
router.get(
  "/:id/rentals",
  authorize("super_admin", "admin", "staff", "location_partner"),
  c.getRentals,
);

// CRUD
router.post(
  "/",
  authorize("super_admin", "admin"),
  auditLog("CREATE", "partners"),
  c.create,
);
router.put(
  "/:id",
  authorize("super_admin", "admin"),
  auditLog("UPDATE", "partners"),
  c.update,
);
router.patch(
  "/:id/suspend",
  authorize("super_admin", "admin"),
  auditLog("UPDATE", "system_users"),
  c.suspend,
);
router.post(
  "/:id/reset-password",
  authorize("super_admin", "admin"),
  auditLog("UPDATE", "system_users"),
  c.resetPassword,
);

// Contacts
router.post(
  "/:id/contacts",
  authorize("super_admin", "admin"),
  auditLog("CREATE", "partner_contacts"),
  c.addContact,
);
router.delete(
  "/:id/contacts/:contact_id",
  authorize("super_admin", "admin"),
  auditLog("DELETE", "partner_contacts"),
  c.removeContact,
);

// Payment accounts
router.post(
  "/:id/payment-accounts",
  authorize("super_admin", "admin"),
  auditLog("CREATE", "partner_payment_accounts"),
  c.addPaymentAccount,
);
router.delete(
  "/:id/payment-accounts/:account_id",
  authorize("super_admin", "admin"),
  auditLog("DELETE", "partner_payment_accounts"),
  c.removePaymentAccount,
);

// Station assignment
router.post(
  "/:id/assign-station",
  authorize("super_admin", "admin"),
  auditLog("CREATE", "partner_station_assignments"),
  c.assignStation,
);
router.post(
  "/:id/unassign-station",
  authorize("super_admin", "admin"),
  auditLog("UPDATE", "partner_station_assignments"),
  c.unassignStation,
);

module.exports = router;
