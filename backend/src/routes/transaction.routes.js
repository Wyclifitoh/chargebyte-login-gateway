const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const controller = require('../controllers/transaction.controller');

const router = express.Router();
router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/', controller.getAll);
router.get('/callbacks', controller.getCallbacks);
router.get('/:id', [param('id').isUUID(), validate], controller.getById);

module.exports = router;
