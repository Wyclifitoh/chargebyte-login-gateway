-- ============================================================
-- Migration 002 — M-Pesa, transaction PIN, advertising clients
-- Run on your MySQL DB:  mysql -u root -p chargebyte_db < backend/src/database/migrations/002_mpesa_pin_adclients.sql
-- ============================================================

-- 1) Per-super-admin transaction PIN (4-digit, hashed). NULL = not set.
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS transaction_pin_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS transaction_pin_set_at DATETIME NULL;

-- 2) Paybill / shortcode balance snapshots (latest fetched balance from Daraja).
CREATE TABLE IF NOT EXISTS mpesa_balance (
  id            CHAR(36) PRIMARY KEY,
  shortcode     VARCHAR(20) NOT NULL,
  account_type  VARCHAR(50) NOT NULL DEFAULT 'Working Account',
  balance       DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency      VARCHAR(8)  NOT NULL DEFAULT 'KES',
  raw_response  JSON NULL,
  fetched_by    CHAR(36) NULL,
  fetched_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shortcode (shortcode),
  INDEX idx_fetched_at (fetched_at)
);

-- 3) Outgoing M-Pesa payments (B2C, B2B). Logs initiator + status + receipt.
CREATE TABLE IF NOT EXISTS mpesa_outgoing (
  id                       CHAR(36) PRIMARY KEY,
  payment_type             ENUM('B2C','B2B') NOT NULL,
  command_id               VARCHAR(50) NOT NULL,
  amount                   DECIMAL(15,2) NOT NULL,
  party_a                  VARCHAR(20) NOT NULL,
  party_b                  VARCHAR(20) NOT NULL,
  remarks                  VARCHAR(255) NOT NULL,
  occasion                 VARCHAR(255) NULL,
  conversation_id          VARCHAR(100) NULL,
  originator_conversation_id VARCHAR(100) NULL,
  mpesa_receipt            VARCHAR(50) NULL,
  result_code              INT NULL,
  result_desc              VARCHAR(500) NULL,
  status                   ENUM('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  raw_response             JSON NULL,
  raw_callback             JSON NULL,
  initiated_by             VARCHAR(36) NOT NULL,
  initiated_by_name        VARCHAR(255) NULL,
  initiated_by_role        VARCHAR(50)  NULL,
  created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_payment_type (payment_type),
  INDEX idx_initiated_by (initiated_by),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_outgoing_user FOREIGN KEY (initiated_by) REFERENCES system_users(id) ON DELETE RESTRICT
);

-- 4) Advertising clients (separate from system_users; campaigns belong to a client)
CREATE TABLE IF NOT EXISTS advertising_clients (
  id              CHAR(36) PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  industry        VARCHAR(100) NULL,
  contact_person  VARCHAR(150) NULL,
  contact_phone   VARCHAR(30)  NULL,
  contact_email   VARCHAR(255) NULL,
  website         VARCHAR(255) NULL,
  notes           TEXT NULL,
  status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
  user_id         CHAR(36) NULL,
  created_by      CHAR(36) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  CONSTRAINT fk_adclient_user FOREIGN KEY (user_id) REFERENCES system_users(id) ON DELETE SET NULL
);

-- 5) campaigns: link to advertising_clients
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS advertising_client_id CHAR(36) NULL AFTER client_name,
  ADD INDEX IF NOT EXISTS idx_campaign_adclient (advertising_client_id);

-- 6) partners: link to a system_user account (the partner's login)
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS user_id CHAR(36) NULL,
  ADD INDEX IF NOT EXISTS idx_partner_user (user_id);

-- 7) partner ↔ machine mapping (in addition to existing partner_stations)
CREATE TABLE IF NOT EXISTS partner_machines (
  id          CHAR(36) PRIMARY KEY,
  partner_id  CHAR(36) NOT NULL,
  machine_id  CHAR(36) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_partner_machine (partner_id, machine_id),
  INDEX idx_partner (partner_id),
  INDEX idx_machine (machine_id)
);

-- 8) Indexes for Mpesa incoming filtering
ALTER TABLE transactions
  ADD INDEX IF NOT EXISTS idx_tx_created_at (created_at),
  ADD INDEX IF NOT EXISTS idx_tx_type (transaction_type);
