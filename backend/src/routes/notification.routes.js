const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const controller = require('../controllers/notification.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/:id/read', [param('id').isUUID(), validate], controller.markRead);
router.patch('/:id/dismiss', [param('id').isUUID(), validate], controller.dismiss);
router.post('/mark-all-read', controller.markAllRead);

module.exports = router;
