// backend/src/routes/mpesa-public.routes.js
// Safaricom Daraja calls these endpoints (no auth).
const express = require('express');
const ctrl = require('../controllers/mpesa.controller');
const router = express.Router();

router.post('/stk-callback', ctrl.stkCallback);
router.post('/b2c-result', ctrl.b2cResult);
router.post('/b2c-timeout', ctrl.passthroughTimeout);
router.post('/b2b-result', ctrl.b2cResult); // same handler shape
router.post('/b2b-timeout', ctrl.passthroughTimeout);
router.post('/balance-result', ctrl.balanceResult);
router.post('/balance-timeout', ctrl.passthroughTimeout);

module.exports = router;
