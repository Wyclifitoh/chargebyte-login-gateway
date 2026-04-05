const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const controller = require('../controllers/audit.controller');

const router = express.Router();
router.use(authenticate);
router.use(authorize('super_admin'));

router.get('/', controller.getAll);

module.exports = router;
