-- Migration 008: GPS clock-in, cabinet integration, shift snapshots, webhooks
-- All changes additive. Safe to re-run: uses IF NOT EXISTS / IGNORE.

-- 1) Station GPS radius (lat/lng already exist)
ALTER TABLE cb_stations
  ADD COLUMN IF NOT EXISTS allowed_radius_m INT NULL COMMENT 'Per-station override, meters. NULL => use system default.';

-- 2) system_settings key/value store (super_admin editable)
CREATE TABLE IF NOT EXISTS system_settings (
  `key`        VARCHAR(128) PRIMARY KEY,
  `value`      TEXT NULL,
  description  VARCHAR(255) NULL,
  updated_by   VARCHAR(36) NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO system_settings (`key`, `value`, description) VALUES
  ('default_clockin_radius_m', '100', 'Default allowed radius (meters) for GPS clock-in when a station has no override.'),
  ('chargenow_base_url', 'https://developer.chargenow.top/cdb-open-api/v1', 'ChargeNow manufacturer API base URL.'),
  ('chargenow_push_url', '', 'Public URL where ChargeNow should POST webhook events.'),
  ('chargenow_webhook_secret', '', 'Shared secret used to sign/verify ChargeNow webhook requests.');

-- 3) Machines: manufacturer identity + live telemetry cache
ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS cabinet_device_id       VARCHAR(64)  NULL,
  ADD COLUMN IF NOT EXISTS cabinet_model           VARCHAR(64)  NULL,
  ADD COLUMN IF NOT EXISTS manufacturer_cabinet_id VARCHAR(64)  NULL,
  ADD COLUMN IF NOT EXISTS signal_strength         INT          NULL,
  ADD COLUMN IF NOT EXISTS empty_slots             INT          NULL,
  ADD COLUMN IF NOT EXISTS busy_slots              INT          NULL,
  ADD COLUMN IF NOT EXISTS is_online               TINYINT(1)   NULL,
  ADD COLUMN IF NOT EXISTS last_synced_at          DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS last_sync_error         TEXT         NULL;

-- Unique per non-null device id (allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS ux_machines_cabinet_device_id
  ON machines (cabinet_device_id);

-- 4) Powerbanks (batteries) tracked per cabinet
CREATE TABLE IF NOT EXISTS powerbanks (
  id            VARCHAR(36) PRIMARY KEY,
  battery_id    VARCHAR(64) NOT NULL,
  machine_id    VARCHAR(36) NULL,
  voltage       DECIMAL(5,2) NULL,
  soc_percent   INT NULL COMMENT 'State of charge 0-100',
  status        ENUM('in_cabinet','rented','abnormal','unknown') NOT NULL DEFAULT 'unknown',
  last_seen_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY ux_powerbanks_battery_id (battery_id),
  KEY ix_powerbanks_machine (machine_id),
  KEY ix_powerbanks_status  (status),
  CONSTRAINT fk_powerbanks_machine FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) clock_events: add distance_m (station_id/accuracy already exist)
ALTER TABLE clock_events
  ADD COLUMN IF NOT EXISTS distance_m INT NULL COMMENT 'Distance in meters from selected station at time of event.';

-- 6) Shift snapshots (clock-in / clock-out) for audit + comparison
CREATE TABLE IF NOT EXISTS shift_snapshots (
  id             VARCHAR(36) PRIMARY KEY,
  clock_event_id VARCHAR(36) NOT NULL,
  system_user_id VARCHAR(36) NOT NULL,
  station_id     VARCHAR(36) NULL,
  machine_id     VARCHAR(36) NULL,
  phase          ENUM('clock_in','clock_out') NOT NULL,
  snapshot       JSON NOT NULL,
  captured_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_snap_event (clock_event_id),
  KEY ix_snap_user  (system_user_id, phase),
  KEY ix_snap_station (station_id, phase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7) ChargeNow webhook event ledger (idempotent)
CREATE TABLE IF NOT EXISTS chargenow_webhook_events (
  id           VARCHAR(36) PRIMARY KEY,
  event_type   VARCHAR(64) NOT NULL,
  device_id    VARCHAR(64) NULL,
  battery_id   VARCHAR(64) NULL,
  payload      JSON NOT NULL,
  signature    VARCHAR(255) NULL,
  dedupe_key   VARCHAR(128) NOT NULL,
  received_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  process_error TEXT NULL,
  UNIQUE KEY ux_webhook_dedupe (dedupe_key),
  KEY ix_webhook_device (device_id, event_type),
  KEY ix_webhook_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8) ChargeNow API call log
CREATE TABLE IF NOT EXISTS chargenow_api_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  method      VARCHAR(8)  NOT NULL,
  path        VARCHAR(255) NOT NULL,
  device_id   VARCHAR(64) NULL,
  status_code INT NULL,
  duration_ms INT NULL,
  error       TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_api_log_device (device_id),
  KEY ix_api_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9) Attach live cabinet snapshot to a submitted daily report
CREATE TABLE IF NOT EXISTS report_machine_snapshots (
  id           VARCHAR(36) PRIMARY KEY,
  report_id    VARCHAR(36) NOT NULL,
  machine_id   VARCHAR(36) NULL,
  device_id    VARCHAR(64) NULL,
  snapshot     JSON NOT NULL,
  captured_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_rms_report (report_id),
  KEY ix_rms_machine (machine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
