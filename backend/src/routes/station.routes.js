const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const controller = require('../controllers/station.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:id', [param('id').isUUID(), validate], controller.getById);

router.post('/', authorize('super_admin', 'admin'), [
  body('name').trim().notEmpty().isLength({ max: 150 }),
  body('address').optional().isLength({ max: 300 }),
  body('revenue_share_percent').optional().isFloat({ min: 0, max: 100 }),
  validate
], auditLog('CREATE', 'cb_stations'), controller.create);

router.put('/:id', authorize('super_admin', 'admin'), [
  param('id').isUUID(), validate
], auditLog('UPDATE', 'cb_stations'), controller.update);

router.patch('/:id/toggle', authorize('super_admin', 'admin'), [
  param('id').isUUID(), validate
], auditLog('UPDATE', 'cb_stations'), controller.toggleActive);

module.exports = router;
