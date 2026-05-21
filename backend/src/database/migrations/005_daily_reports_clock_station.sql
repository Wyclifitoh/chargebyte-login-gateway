-- ============================================================
-- Migration 005 — Daily agent reports + station_id on clock events
-- Run:  mysql -u root -p chargebyte_db < backend/src/database/migrations/005_daily_reports_clock_station.sql
-- ============================================================

-- Add station_id + cooldown helpers to clock_events
ALTER TABLE clock_events
  ADD COLUMN IF NOT EXISTS station_id VARCHAR(36) DEFAULT NULL AFTER matched_whitelist_id,
  ADD COLUMN IF NOT EXISTS location_name VARCHAR(150) DEFAULT NULL AFTER station_id;

CREATE INDEX IF NOT EXISTS idx_clock_station ON clock_events (station_id);

-- Daily station reports filled by agents at clock-out (or anytime in shift)
CREATE TABLE IF NOT EXISTS daily_reports (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  report_date DATE NOT NULL,
  agent_user_id VARCHAR(36) NOT NULL,
  agent_name VARCHAR(150) NOT NULL,
  station_id VARCHAR(36) DEFAULT NULL,
  location VARCHAR(150) NOT NULL,
  rentals INT NOT NULL DEFAULT 0,
  returns INT NOT NULL DEFAULT 0,
  pending_returns INT NOT NULL DEFAULT 0,
  powerbanks_arrival INT NOT NULL DEFAULT 0,
  powerbanks_departure INT NOT NULL DEFAULT 0,
  time_in TIMESTAMP NULL DEFAULT NULL,
  time_out TIMESTAMP NULL DEFAULT NULL,
  rentals_auto INT NOT NULL DEFAULT 0,
  notes VARCHAR(1000) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_agent_date_location (agent_user_id, report_date, location),
  KEY idx_date (report_date),
  KEY idx_agent (agent_user_id),
  KEY idx_station (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
