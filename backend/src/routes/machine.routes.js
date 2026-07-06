const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const controller = require('../controllers/machine.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:id', [param('id').isUUID(), validate], controller.getById);

router.post('/', authorize('super_admin', 'admin'), [
  body('name').trim().notEmpty(),
  body('station_id').isUUID(),
  body('total_slots').isInt({ min: 1 }),
  validate
], auditLog('CREATE', 'machines'), controller.create);

router.put('/:id', authorize('super_admin', 'admin'), [
  param('id').isUUID(), validate
], auditLog('UPDATE', 'machines'), controller.update);

router.patch('/:id/status', authorize('super_admin', 'admin', 'staff'), [
  param('id').isUUID(),
  body('status').isIn(['online', 'offline', 'maintenance']),
  validate
], auditLog('UPDATE', 'machines'), controller.setStatus);

// Manual manufacturer sync — delegates to ChargeNow service.
const chargenowController = require('../controllers/chargenow.controller');
router.post('/:id/sync', authorize('super_admin', 'admin', 'staff'), [
  param('id').isUUID(), validate,
], chargenowController.syncMachine);

module.exports = router;
