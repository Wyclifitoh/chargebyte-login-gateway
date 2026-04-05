const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const controller = require('../controllers/operation.controller');

const router = express.Router();
router.use(authenticate);
router.use(authorize('super_admin', 'admin', 'staff'));

// Leads
router.get('/leads', controller.getLeads);
router.post('/leads', [
  body('name').trim().notEmpty(),
  body('email').optional().isEmail(),
  validate
], controller.createLead);
router.put('/leads/:id', [param('id').isUUID(), validate], controller.updateLead);

// Reports
router.get('/reports', controller.getReports);
router.post('/reports', [
  body('title').trim().notEmpty(),
  body('type').isIn(['daily', 'weekly', 'monthly']),
  validate
], controller.createReport);

// Daily plans
router.get('/daily-plans', controller.getDailyPlans);
router.post('/daily-plans', [
  body('title').trim().notEmpty(),
  validate
], controller.createDailyPlan);
router.patch('/daily-plans/:id/toggle', [param('id').isUUID(), validate], controller.toggleDailyPlan);

module.exports = router;
