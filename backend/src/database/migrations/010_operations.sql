-- Migration 010 — Operations module (daily updates, field activities, department updates, tasks, calendar, attachments)
-- Additive only. Safe to re-run.

CREATE TABLE IF NOT EXISTS ops_daily_updates (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  user_id             CHAR(36) NOT NULL,
  department          VARCHAR(80)  NULL,
  position            VARCHAR(120) NULL,
  update_date         DATE NOT NULL,
  work_summary        TEXT NULL,
  tasks_completed     TEXT NULL,
  challenges          TEXT NULL,
  assistance_required TEXT NULL,
  tomorrow_plan       TEXT NULL,
  status              ENUM('draft','submitted') NOT NULL DEFAULT 'draft',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ops_du_user_date (user_id, update_date),
  KEY idx_ops_du_date (update_date),
  KEY idx_ops_du_dept (department),
  KEY idx_ops_du_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_field_activities (
  id               CHAR(36) NOT NULL PRIMARY KEY,
  user_id          CHAR(36) NOT NULL,
  department       VARCHAR(80) NULL,
  activity_type    VARCHAR(80) NOT NULL,
  station_id       CHAR(36) NULL,
  client_name      VARCHAR(200) NULL,
  location         VARCHAR(255) NULL,
  latitude         DECIMAL(10,7) NULL,
  longitude        DECIMAL(10,7) NULL,
  check_in_at      DATETIME NULL,
  check_out_at     DATETIME NULL,
  activities       TEXT NULL,
  findings         TEXT NULL,
  issues           TEXT NULL,
  recommendations  TEXT NULL,
  activity_date    DATE NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ops_fa_user_date (user_id, activity_date),
  KEY idx_ops_fa_date (activity_date),
  KEY idx_ops_fa_station (station_id),
  KEY idx_ops_fa_dept (department),
  KEY idx_ops_fa_type (activity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_department_updates (
  id          CHAR(36) NOT NULL PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  department  VARCHAR(80) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  summary     VARCHAR(500) NULL,
  details     TEXT NULL,
  priority    ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ops_du2_dept (department),
  KEY idx_ops_du2_priority (priority),
  KEY idx_ops_du2_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_tasks (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NULL,
  assigned_by   CHAR(36) NOT NULL,
  assigned_to   CHAR(36) NULL,
  department    VARCHAR(80) NULL,
  priority      ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  due_date      DATE NULL,
  status        ENUM('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
  completed_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ops_tasks_assignee (assigned_to),
  KEY idx_ops_tasks_status (status),
  KEY idx_ops_tasks_due (due_date),
  KEY idx_ops_tasks_dept (department),
  KEY idx_ops_tasks_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_task_comments (
  id         CHAR(36) NOT NULL PRIMARY KEY,
  task_id    CHAR(36) NOT NULL,
  user_id    CHAR(36) NOT NULL,
  comment    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ops_tc_task (task_id, created_at),
  CONSTRAINT fk_ops_tc_task FOREIGN KEY (task_id) REFERENCES ops_tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_attachments (
  id           CHAR(36) NOT NULL PRIMARY KEY,
  entity_type  ENUM('daily_update','field_activity','department_update','task','task_comment') NOT NULL,
  entity_id    CHAR(36) NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_url     VARCHAR(1000) NOT NULL,
  file_type    VARCHAR(80) NULL,
  file_size    INT NULL,
  uploaded_by  CHAR(36) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ops_att_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ops_calendar_events (
  id                    CHAR(36) NOT NULL PRIMARY KEY,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT NULL,
  event_type            ENUM('field_visit','meeting','deadline','dept_activity','maintenance','company_event') NOT NULL DEFAULT 'meeting',
  start_at              DATETIME NOT NULL,
  end_at                DATETIME NULL,
  all_day               TINYINT(1) NOT NULL DEFAULT 0,
  department            VARCHAR(80) NULL,
  created_by            CHAR(36) NOT NULL,
  related_entity_type   VARCHAR(40) NULL,
  related_entity_id     CHAR(36) NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ops_cal_start (start_at),
  KEY idx_ops_cal_dept (department),
  KEY idx_ops_cal_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

