-- ============================================================
-- Migration 004 — Team management + IP/geo clock-in
-- Run:  mysql -u root -p chargebyte_db < backend/src/database/migrations/004_team_management.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS team_members (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  system_user_id VARCHAR(36) DEFAULT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  category ENUM('core','agent','consultant') NOT NULL DEFAULT 'agent',
  title VARCHAR(150) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_full_name (full_name),
  KEY idx_category (category),
  KEY idx_system_user (system_user_id),
  KEY idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clockin_whitelist (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL,
  type ENUM('ip','cidr','geo') NOT NULL,
  ip_cidr VARCHAR(64) DEFAULT NULL,
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  radius_meters INT DEFAULT 150,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  notes VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_active (is_active),
  KEY idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clock_events (
  id VARCHAR(36) NOT NULL DEFAULT (UUID()),
  team_member_id VARCHAR(36) DEFAULT NULL,
  system_user_id VARCHAR(36) NOT NULL,
  event_type ENUM('clock_in','clock_out') NOT NULL,
  event_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(64) DEFAULT NULL,
  latitude DECIMAL(10,7) DEFAULT NULL,
  longitude DECIMAL(10,7) DEFAULT NULL,
  accuracy_meters INT DEFAULT NULL,
  matched_whitelist_id VARCHAR(36) DEFAULT NULL,
  status ENUM('approved','rejected') NOT NULL DEFAULT 'approved',
  reject_reason VARCHAR(255) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  notes VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_member_time (team_member_id, event_time),
  KEY idx_user_time (system_user_id, event_time),
  KEY idx_status (status),
  KEY idx_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
