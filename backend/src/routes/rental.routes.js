const express = require('express');
const { param, query } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const controller = require('../controllers/rental.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'admin', 'staff'), controller.getAll);
router.get('/:id', authorize('super_admin', 'admin', 'staff'), [param('id').isUUID(), validate], controller.getById);
router.patch('/:id/cancel', authorize('super_admin', 'admin'), [param('id').isUUID(), validate], controller.cancel);

module.exports = router;
