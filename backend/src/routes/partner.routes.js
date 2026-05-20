// backend/src/routes/partner.routes.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { auditLog } = require('../middleware/audit.middleware');
const c = require('../controllers/partner.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('super_admin', 'admin', 'staff'), c.getAll);
router.get('/payouts', authorize('super_admin', 'admin', 'staff', 'location_partner', 'funding_partner'), c.getPayouts);
router.get('/:id', authorize('super_admin', 'admin', 'staff', 'location_partner', 'funding_partner'), c.getById);

router.post('/', authorize('super_admin'), auditLog('CREATE', 'partners'), c.create);
router.put('/:id', authorize('super_admin'), auditLog('UPDATE', 'partners'), c.update);

router.post('/assign-station',  authorize('super_admin'), auditLog('UPDATE', 'cb_stations'), c.assignStation);
router.delete('/stations/:station_id', authorize('super_admin'), auditLog('UPDATE', 'cb_stations'), c.unassignStation);
router.post('/assign-machine',  authorize('super_admin'), auditLog('CREATE', 'partner_machines'), c.assignMachine);
router.delete('/:partner_id/machines/:machine_id', authorize('super_admin'), auditLog('DELETE', 'partner_machines'), c.unassignMachine);

module.exports = router;
