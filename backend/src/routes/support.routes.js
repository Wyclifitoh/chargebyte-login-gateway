const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const c = require('../controllers/support.controller');

const router = express.Router();
router.use(authenticate);

router.get('/',         c.list);
router.get('/summary',  c.summary);
router.get('/:id',      c.getById);

router.post('/',                auditLog('CREATE', 'support_tickets'), c.create);
router.post('/:id/comments',    auditLog('CREATE', 'support_ticket_comments'), c.addComment);
router.put('/:id',              auditLog('UPDATE', 'support_tickets'), c.update);
router.put('/:id/assign',       authorize('super_admin', 'admin'), auditLog('UPDATE', 'support_tickets'), c.assign);
router.delete('/:id',           authorize('super_admin'), auditLog('DELETE', 'support_tickets'), c.remove);

module.exports = router;
