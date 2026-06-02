const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const c = require('../controllers/team.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', authorize('super_admin', 'admin'), auditLog('CREATE', 'team_members'), c.create);
router.put('/:id', authorize('super_admin', 'admin'), auditLog('UPDATE', 'team_members'), c.update);
router.delete('/:id', authorize('super_admin'), auditLog('DELETE', 'team_members'), c.remove);

module.exports = router;
