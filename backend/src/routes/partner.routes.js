const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const partnerController = require('../controllers/partner.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('super_admin', 'staff'), partnerController.getAll);
router.get('/payouts', authorize('super_admin', 'staff', 'location_partner', 'funding_partner'), partnerController.getPayouts);
router.get('/:id', authorize('super_admin', 'staff', 'location_partner', 'funding_partner'), partnerController.getById);
router.post('/', authorize('super_admin'), partnerController.create);
router.put('/:id', authorize('super_admin'), partnerController.update);

module.exports = router;
