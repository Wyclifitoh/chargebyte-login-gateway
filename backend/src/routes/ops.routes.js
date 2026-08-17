const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { authenticate } = require("../middleware/auth.middleware");
const c = require("../controllers/ops.controller");

const router = express.Router();
router.use(authenticate);

// ---- Uploads (department reports & meeting minutes) ----
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "ops");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10).replace(/[^\w.]/g, "");
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_MIME.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Unsupported file type")),
});

router.post("/uploads", upload.single("file"), c.uploadFile);

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