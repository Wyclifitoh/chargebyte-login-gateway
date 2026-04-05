const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const controller = require('../controllers/revenue.controller');

const router = express.Router();
router.use(authenticate);
router.use(authorize('super_admin', 'admin', 'location_partner'));

router.get('/summary', controller.getSummary);
router.get('/by-station', controller.getByStation);
router.get('/by-machine', controller.getByMachine);
router.get('/over-time', controller.getOverTime);

module.exports = router;
