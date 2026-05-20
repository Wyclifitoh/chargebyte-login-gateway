const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();
router.use(authenticate);

// PIN endpoints — every authenticated user manages their own
router.get('/me/pin-status', userController.getPinStatus);
router.post('/me/pin', auditLog('UPDATE', 'system_users'), userController.setPin);

router.get('/', authorize('super_admin', 'admin'), userController.getAll);
router.get('/:id', authorize('super_admin', 'admin'), userController.getById);

router.post('/', authorize('super_admin'), [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['super_admin', 'admin', 'staff', 'location_partner', 'funding_partner', 'ad_client', 'system']),
  validate
], auditLog('CREATE', 'system_users'), userController.create);

router.put('/:id', authorize('super_admin'), [
  param('id').isUUID(),
  validate
], auditLog('UPDATE', 'system_users'), userController.update);

router.delete('/:id', authorize('super_admin'), [
  param('id').isUUID(), validate
], auditLog('DELETE', 'system_users'), userController.remove);

module.exports = router;
