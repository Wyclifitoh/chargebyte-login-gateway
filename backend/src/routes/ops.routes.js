const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const c = require("../controllers/ops.controller");

const router = express.Router();
router.use(authenticate);

router.get("/staff", c.staff);
router.get("/departments", c.departments);
router.get("/dashboard", c.dashboard);

router.get("/daily-updates", c.listDailyUpdates);
router.post("/daily-updates", c.createDailyUpdate);
router.put("/daily-updates/:id", c.updateDailyUpdate);
router.delete("/daily-updates/:id", c.deleteDailyUpdate);

router.get("/field-activities", c.listFieldActivities);
router.post("/field-activities", c.createFieldActivity);
router.put("/field-activities/:id", c.updateFieldActivity);
router.delete("/field-activities/:id", c.deleteFieldActivity);

router.get("/department-updates", c.listDepartmentUpdates);
router.post("/department-updates", c.createDepartmentUpdate);
router.put("/department-updates/:id", c.updateDepartmentUpdate);
router.delete("/department-updates/:id", c.deleteDepartmentUpdate);

router.get("/tasks", c.listTasks);
router.get("/tasks/:id", c.getTask);
router.post("/tasks", c.createTask);
router.put("/tasks/:id", c.updateTask);
router.delete("/tasks/:id", c.deleteTask);
router.post("/tasks/:id/comments", c.addTaskComment);

router.get("/events", c.listEvents);
router.post("/events", c.createEvent);
router.put("/events/:id", c.updateEvent);
router.delete("/events/:id", c.deleteEvent);

module.exports = router;