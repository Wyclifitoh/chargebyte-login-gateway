-- Migration 012 — Partner machine deployments
-- Explicit deployment windows control partner rentals, revenue, and disbursements.

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