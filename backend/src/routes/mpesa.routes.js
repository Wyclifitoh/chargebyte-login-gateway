// backend/src/routes/mpesa.routes.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/mpesa.controller');

const router = express.Router();

// Authenticated, super-admin only
router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/incoming', ctrl.listIncoming);
router.get('/outgoing', ctrl.listOutgoing);
router.post('/stk-push', ctrl.stkPush);
router.post('/b2c', ctrl.b2c);
router.post('/b2b', ctrl.b2b);
router.post('/balance/refresh', ctrl.fetchBalance);
router.get('/balance/latest', ctrl.getLatestBalance);

module.exports = router;
