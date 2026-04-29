const express = require("express");
const { body } = require("express-validator");
const { validate } = require("../middleware/validate.middleware");
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    validate,
  ],
  authController.login,
);

router.post(
  "/refresh",
  [
    body("refreshToken").notEmpty().withMessage("Refresh token required"),
    validate,
  ],
  authController.refreshToken,
);

router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
