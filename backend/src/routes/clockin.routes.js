const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const c = require('../controllers/clockin.controller');

const router = express.Router();
router.use(authenticate);

// Self
router.post('/clock', auditLog('CREATE', 'clock_events'), c.clock);
router.get('/events/me', c.myEvents);

// Admin
router.get('/events', authorize('super_admin', 'admin'), c.events);
router.get('/summary', authorize('super_admin', 'admin'), c.summary);

// Whitelist
router.get('/whitelist', authorize('super_admin', 'admin'), c.listWhitelist);
router.post('/whitelist', authorize('super_admin', 'admin'), auditLog('CREATE', 'clockin_whitelist'), c.createWhitelist);
router.put('/whitelist/:id', authorize('super_admin', 'admin'), auditLog('UPDATE', 'clockin_whitelist'), c.updateWhitelist);
router.delete('/whitelist/:id', authorize('super_admin'), auditLog('DELETE', 'clockin_whitelist'), c.removeWhitelist);

// Daily reports
router.get('/reports', c.listReports);                                  // self or admin (filtered in controller)
router.post('/reports', auditLog('CREATE', 'daily_reports'), c.upsertReport);
router.delete('/reports/:id', authorize('super_admin'), auditLog('DELETE', 'daily_reports'), c.deleteReport);

module.exports = router;
