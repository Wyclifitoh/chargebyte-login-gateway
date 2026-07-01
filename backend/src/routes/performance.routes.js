const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const c = require('../controllers/performance.controller');

const router = express.Router();
router.use(authenticate);
router.use(authorize('super_admin', 'admin'));

router.get('/leaderboard', c.leaderboard);
router.get('/agent/:id', c.agentDetail);

module.exports = router;
