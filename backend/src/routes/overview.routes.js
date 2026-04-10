const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const overviewController = require('../controllers/overview.controller');

const router = express.Router();
router.use(authenticate);

router.get('/dashboard', overviewController.getDashboard);

module.exports = router;
