-- Migration 013 — Location Partner ↔ Machine (direct link, station-independent)
-- Partners now own machines directly. station_id in deployments is retained for
-- historical records only and is not required for new deployments.

ALTER TABLE partner_machine_deployments
  MODIFY COLUMN station_id CHAR(36) NULL;

-- Ensure only one active deployment per machine at any time (application-level
-- enforcement is authoritative; this partial index just accelerates the check).
CREATE INDEX IF NOT EXISTS idx_pmd_machine_active
  ON partner_machine_deployments (machine_id, undeployed_at);