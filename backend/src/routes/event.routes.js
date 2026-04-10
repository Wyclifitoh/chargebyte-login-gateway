const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const eventController = require('../controllers/event.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', eventController.getAll);
router.get('/:id', eventController.getById);
router.post('/', authorize('super_admin', 'staff'), eventController.create);
router.put('/:id', authorize('super_admin', 'staff'), eventController.update);

module.exports = router;
