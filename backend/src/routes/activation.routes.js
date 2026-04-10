const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const activationController = require('../controllers/activation.controller');

const router = express.Router();
router.use(authenticate);

router.get('/locations', activationController.getLocations);
router.get('/contacts', activationController.getContacts);
router.get('/stats', activationController.getStats);

module.exports = router;
