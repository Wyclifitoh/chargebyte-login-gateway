-- Phase 5 — Customer Support CRM

CREATE TABLE IF NOT EXISTS support_tickets (
  id            CHAR(36)        NOT NULL PRIMARY KEY,
  ticket_no     VARCHAR(20)     NOT NULL UNIQUE,
  subject       VARCHAR(255)    NOT NULL,
  description   TEXT            NULL,
  category      ENUM('rental','refund','machine','payment','account','other') NOT NULL DEFAULT 'other',
  priority      ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  status        ENUM('open','assigned','in_progress','resolved','closed','escalated') NOT NULL DEFAULT 'open',
  customer_name   VARCHAR(150)  NULL,
  customer_phone  VARCHAR(20)   NULL,
  customer_email  VARCHAR(150)  NULL,
  rental_id     CHAR(36)        NULL,
  machine_id    CHAR(36)        NULL,
  station_id    CHAR(36)        NULL,
  latitude      DECIMAL(10,7)   NULL,
  longitude     DECIMAL(10,7)   NULL,
  photos_json   JSON            NULL,
  sla_due_at    DATETIME        NULL,
  assigned_to   CHAR(36)        NULL,
  created_by    CHAR(36)        NOT NULL,
  resolved_at   DATETIME        NULL,
  resolution_note TEXT          NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tickets_status (status),
  INDEX idx_tickets_priority (priority),
  INDEX idx_tickets_assigned (assigned_to),
  INDEX idx_tickets_phone (customer_phone),
  INDEX idx_tickets_station (station_id),
  INDEX idx_tickets_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  ticket_id   CHAR(36)    NOT NULL,
  author_id   CHAR(36)    NOT NULL,
  author_name VARCHAR(150) NULL,
  body        TEXT        NOT NULL,
  is_internal TINYINT(1)  NOT NULL DEFAULT 1,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_comments_ticket (ticket_id, created_at),
  CONSTRAINT fk_comments_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
