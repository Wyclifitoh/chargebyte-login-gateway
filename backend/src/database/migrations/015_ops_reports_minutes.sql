-- Migration 015 — Department updates: reports, meeting minutes and file attachments
-- Additive. Run once.

ALTER TABLE ops_department_updates
  ADD COLUMN entry_type ENUM('update','report','meeting_minutes') NOT NULL DEFAULT 'update' AFTER department,
  ADD COLUMN meeting_date DATE NULL AFTER priority,
  ADD COLUMN attendees TEXT NULL AFTER meeting_date,
  ADD COLUMN file_url VARCHAR(1000) NULL AFTER attendees,
  ADD COLUMN file_name VARCHAR(255) NULL AFTER file_url,
  ADD KEY idx_ops_du2_entry_type (entry_type);
