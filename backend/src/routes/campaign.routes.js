const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const controller = require('../controllers/campaign.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:id', [param('id').isUUID(), validate], controller.getById);

router.post('/', authorize('super_admin', 'admin'), [
  body('name').trim().notEmpty(),
  body('client_id').optional().isUUID(),
  validate
], auditLog('CREATE', 'campaigns'), controller.create);

router.put('/:id', authorize('super_admin', 'admin'), [
  param('id').isUUID(), validate
], auditLog('UPDATE', 'campaigns'), controller.update);

module.exports = router;
