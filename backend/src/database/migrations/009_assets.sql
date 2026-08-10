-- Migration 009 — Asset & inventory tracker
-- Additive only. Safe to re-run.

CREATE TABLE IF NOT EXISTS assets (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  asset_tag         VARCHAR(64)  NULL,
  name              VARCHAR(200) NOT NULL,
  category          ENUM('electronics','branded','tools','vehicles','furniture','other') NOT NULL DEFAULT 'other',
  serial            VARCHAR(120) NULL,
  status            ENUM('in_use','in_storage','repair','lost','retired') NOT NULL DEFAULT 'in_storage',
  -- Assignment: either a real system user or free-text label (e.g. "HR / Ops Store")
  assigned_user_id  CHAR(36)     NULL,
  assigned_to_name  VARCHAR(150) NULL,
  -- Optional station link + free-text location
  station_id        CHAR(36)     NULL,
  location          VARCHAR(255) NULL,
  value_kes         DECIMAL(12,2) NOT NULL DEFAULT 0,
  `condition`       VARCHAR(80)  NULL,
  date_assigned     DATE         NULL,
  purchase_date     DATE         NULL,
  notes             TEXT         NULL,
  image_url         VARCHAR(500) NULL,
  is_active         TINYINT(1)   NOT NULL DEFAULT 1,
  created_by        CHAR(36)     NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_assets_serial (serial),
  UNIQUE KEY uniq_assets_tag (asset_tag),
  KEY idx_assets_status (status),
  KEY idx_assets_category (category),
  KEY idx_assets_assigned_user (assigned_user_id),
  KEY idx_assets_station (station_id),
  KEY idx_assets_active (is_active),
  KEY idx_assets_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- History log for status / assignment changes (audit trail beyond generic audit_logs)
CREATE TABLE IF NOT EXISTS asset_history (
  id            CHAR(36)   NOT NULL PRIMARY KEY,
  asset_id      CHAR(36)   NOT NULL,
  event_type    ENUM('created','updated','assigned','unassigned','status_changed','deleted') NOT NULL,
  from_value    VARCHAR(255) NULL,
  to_value      VARCHAR(255) NULL,
  note          VARCHAR(500) NULL,
  actor_id      CHAR(36)   NULL,
  actor_name    VARCHAR(150) NULL,
  created_at    DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_asset_history_asset (asset_id, created_at),
  CONSTRAINT fk_asset_history_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

