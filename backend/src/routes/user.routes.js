const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('super_admin', 'admin'), userController.getAll);
router.get('/:id', authorize('super_admin', 'admin'), [
  param('id').isUUID().withMessage('Invalid user ID'), validate
], userController.getById);

router.post('/', authorize('super_admin'), [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['super_admin', 'admin', 'staff', 'location_partner', 'advertising_client']),
  validate
], auditLog('CREATE', 'users'), userController.create);

router.put('/:id', authorize('super_admin'), [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('role').optional().isIn(['super_admin', 'admin', 'staff', 'location_partner', 'advertising_client']),
  validate
], auditLog('UPDATE', 'users'), userController.update);

router.delete('/:id', authorize('super_admin'), [
  param('id').isUUID(), validate
], auditLog('DELETE', 'users'), userController.remove);

module.exports = router;
