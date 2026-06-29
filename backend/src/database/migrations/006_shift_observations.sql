-- ============================================================
-- Migration 006 — Shift observation fields on daily_reports
-- Run: mysql -u root -p chargebyte_db < backend/src/database/migrations/006_shift_observations.sql
-- ============================================================

ALTER TABLE daily_reports
  ADD COLUMN IF NOT EXISTS returns_auto INT NOT NULL DEFAULT 0 AFTER rentals_auto,
  ADD COLUMN IF NOT EXISTS pending_auto INT NOT NULL DEFAULT 0 AFTER returns_auto,
  ADD COLUMN IF NOT EXISTS machine_cleanliness ENUM('excellent','good','fair','poor') DEFAULT NULL AFTER notes,
  ADD COLUMN IF NOT EXISTS customer_feedback TEXT DEFAULT NULL AFTER machine_cleanliness,
  ADD COLUMN IF NOT EXISTS issues_observed TEXT DEFAULT NULL AFTER customer_feedback,
  ADD COLUMN IF NOT EXISTS competitor_activity TEXT DEFAULT NULL AFTER issues_observed,
  ADD COLUMN IF NOT EXISTS marketing_activities TEXT DEFAULT NULL AFTER competitor_activity,
  ADD COLUMN IF NOT EXISTS suggestions TEXT DEFAULT NULL AFTER marketing_activities,
  ADD COLUMN IF NOT EXISTS photos_json JSON DEFAULT NULL AFTER suggestions,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP NULL DEFAULT NULL AFTER photos_json;

CREATE INDEX IF NOT EXISTS idx_reports_submitted ON daily_reports (submitted_at);
