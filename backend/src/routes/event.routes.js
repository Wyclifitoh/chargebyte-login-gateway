const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const eventController = require('../controllers/event.controller');

const router = express.Router();
router.use(authenticate);

router.get('/summary', eventController.summary);
router.get('/', eventController.getAll);
router.get('/:id/performance', eventController.performance);
router.get('/:id', eventController.getById);
router.post('/', authorize('super_admin', 'admin', 'staff'), eventController.create);
router.put('/:id', authorize('super_admin', 'admin', 'staff'), eventController.update);
router.delete('/:id', authorize('super_admin', 'admin'), eventController.delete);

router.post('/:id/log-communication', authorize('super_admin', 'admin', 'staff'), eventController.logCommunication);
router.post('/:id/staff', authorize('super_admin', 'admin', 'staff'), eventController.assignStaff);
router.delete('/:id/staff/:staff_id', authorize('super_admin', 'admin', 'staff'), eventController.removeStaff);
router.post('/:id/deploy-machine', authorize('super_admin', 'admin', 'staff'), eventController.deployMachine);
router.post('/:id/machines/:deployment_id/return', authorize('super_admin', 'admin', 'staff'), eventController.returnMachine);

module.exports = router;
