// Public webhook route — no auth middleware. Signature-verified in controller.
const express = require("express");
const c = require("../controllers/chargenow.controller");

const router = express.Router();
router.post("/chargenow", c.webhook);

module.exports = router;
