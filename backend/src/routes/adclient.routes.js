// backend/src/routes/adclient.routes.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const ctrl = require('../controllers/adclient.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'admin', 'staff'), ctrl.getAll);
router.get('/:id', authorize('super_admin', 'admin', 'staff'), ctrl.getById);
router.post('/', authorize('super_admin'), auditLog('CREATE', 'advertising_clients'), ctrl.create);
router.put('/:id', authorize('super_admin'), auditLog('UPDATE', 'advertising_clients'), ctrl.update);
router.delete('/:id', authorize('super_admin'), auditLog('DELETE', 'advertising_clients'), ctrl.remove);

module.exports = router;
