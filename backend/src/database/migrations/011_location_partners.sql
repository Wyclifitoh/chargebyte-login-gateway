-- Migration 011 — Location Partner Management System
-- Additive only. Safe to re-run. Extends existing partners + partner_stations.

-- 1) Extend partners with agreement + address fields
ALTER TABLE partners
  ADD COLUMN county VARCHAR(100) NULL AFTER city,
  ADD COLUMN disbursement_frequency ENUM('monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly' AFTER fixed_monthly_rent,
  ADD COLUMN disbursement_day TINYINT NOT NULL DEFAULT 5 AFTER disbursement_frequency,
  ADD COLUMN contact_position VARCHAR(120) NULL AFTER contact_email;

-- 2) Multiple contact persons per partner
CREATE TABLE partner_contacts (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    partner_id VARCHAR(36) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255),
    position VARCHAR(120),
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_pc_partner (partner_id),

    CONSTRAINT fk_pc_partner
        FOREIGN KEY (partner_id)
        REFERENCES partners(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=latin1;

-- 3) Multiple payout accounts per partner
CREATE TABLE IF NOT EXISTS partner_payment_accounts (
  id VARCHAR(36) PRIMARY KEY,
  partner_id VARCHAR(36) NOT NULL,

  method ENUM('bank','mpesa','paybill','till') NOT NULL,

  bank_name VARCHAR(150) NULL,
  account_name VARCHAR(150) NULL,
  account_number VARCHAR(64) NULL,
  branch VARCHAR(120) NULL,

  mpesa_number VARCHAR(30) NULL,
  paybill VARCHAR(30) NULL,
  till_number VARCHAR(30) NULL,

  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  KEY idx_ppa_partner (partner_id),

  CONSTRAINT fk_ppa_partner
    FOREIGN KEY (partner_id)
    REFERENCES partners(id)
    ON DELETE CASCADE
) ENGINE=InnoDB
DEFAULT CHARSET=latin1;


-- 4) History-preserving station assignments
CREATE TABLE IF NOT EXISTS partner_station_assignments (
  id               CHAR(36) PRIMARY KEY,
  partner_user_id  CHAR(36) NOT NULL,   -- system_users.id (the partner login)
  partner_id       CHAR(36) NOT NULL,   -- partners.id
  station_id       CHAR(36) NOT NULL,
  assigned_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at    DATETIME NULL,
  assigned_by      CHAR(36) NULL,
  note             VARCHAR(500) NULL,
  KEY idx_psa_partner (partner_user_id),
  KEY idx_psa_partner_row (partner_id),
  KEY idx_psa_station (station_id),
  KEY idx_psa_current (station_id, unassigned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) Auto-generated disbursement vouchers
CREATE TABLE IF NOT EXISTS partner_disbursements (
  id                  CHAR(36) PRIMARY KEY,
  partner_user_id     CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  station_id          CHAR(36) NULL,
  agreement_type      ENUM('revenue_share','fixed') NOT NULL DEFAULT 'revenue_share',
  period_start        DATE     NOT NULL,
  period_end          DATE     NOT NULL,
  gross_revenue       DECIMAL(12,2) NOT NULL DEFAULT 0,
  share_percent       DECIMAL(5,2)  NULL,
  fixed_amount        DECIMAL(12,2) NULL,
  amount_payable      DECIMAL(12,2) NOT NULL DEFAULT 0,
  generated_at        DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date            DATE      NULL,
  status              ENUM('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
  paid_at             DATETIME  NULL,
  payment_method      VARCHAR(60) NULL,
  payment_account_id  CHAR(36)   NULL,
  reference_number    VARCHAR(120) NULL,
  transaction_code    VARCHAR(120) NULL,
  notes               TEXT NULL,
  paid_by             CHAR(36) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_disb_period (partner_id, station_id, period_start),
  KEY idx_disb_partner (partner_user_id),
  KEY idx_disb_status (status),
  KEY idx_disb_period (period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) Activity log per partner
CREATE TABLE IF NOT EXISTS partner_activity_log (
  id               CHAR(36) PRIMARY KEY,
  partner_user_id  CHAR(36) NOT NULL,
  actor_id         CHAR(36) NULL,
  actor_name       VARCHAR(150) NULL,
  action           VARCHAR(80) NOT NULL,
  entity           VARCHAR(80) NULL,
  details_json     JSON NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pal_partner (partner_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) Machine deployment history per location partner
-- Revenue/rentals only count while a machine is explicitly deployed to the partner's station.
CREATE TABLE IF NOT EXISTS partner_machine_deployments (
  id                CHAR(36) PRIMARY KEY,
  partner_user_id   CHAR(36) NOT NULL,
  partner_id        CHAR(36) NOT NULL,
  station_id        CHAR(36) NOT NULL,
  machine_id        CHAR(36) NOT NULL,
  deployed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  undeployed_at     DATETIME NULL,
  deployed_by       CHAR(36) NULL,
  undeployed_by     CHAR(36) NULL,
  note              VARCHAR(500) NULL,
  undeploy_note     VARCHAR(500) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pmd_partner (partner_user_id, deployed_at),
  KEY idx_pmd_station (station_id, deployed_at),
  KEY idx_pmd_machine (machine_id, undeployed_at),
  KEY idx_pmd_active_partner (partner_user_id, station_id, undeployed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

