-- Migration 014 — Events Module enhancement
-- Extends existing `events` table with lifecycle stages, communication tracking,
-- and outcomes. Adds an activity log. Reuses event_machines / event_staff.

-- 1) Widen event status enum to full lifecycle
ALTER TABLE events
  MODIFY COLUMN status ENUM(
    'planning','not_contacted','contacted','follow_up','proposal_sent',
    'negotiating','confirmed','upcoming','ongoing','completed','cancelled','lost'
  ) NOT NULL DEFAULT 'planning';

-- 2) Communication tracking + outcome fields
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS contacted TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
  ADD COLUMN IF NOT EXISTS first_contacted_at DATETIME NULL AFTER contacted,
  ADD COLUMN IF NOT EXISTS last_contacted_at DATETIME NULL AFTER first_contacted_at,
  ADD COLUMN IF NOT EXISTS email_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER last_contacted_at,
  ADD COLUMN IF NOT EXISTS email_sent_at DATETIME NULL AFTER email_sent,
  ADD COLUMN IF NOT EXISTS proposal_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER email_sent_at,
  ADD COLUMN IF NOT EXISTS proposal_sent_at DATETIME NULL AFTER proposal_sent,
  ADD COLUMN IF NOT EXISTS follow_up_count INT NOT NULL DEFAULT 0 AFTER proposal_sent_at,
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE NULL AFTER follow_up_count,
  ADD COLUMN IF NOT EXISTS outcome VARCHAR(500) NULL AFTER next_follow_up_date,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL AFTER outcome;

-- 3) Activity log per event (timeline, comms trail)
CREATE TABLE IF NOT EXISTS event_activity_log (
  id            CHAR(36) PRIMARY KEY,
  event_id      CHAR(36) NOT NULL,
  actor_id      CHAR(36) NULL,
  actor_name    VARCHAR(150) NULL,
  action        VARCHAR(80) NOT NULL,
  details       TEXT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_eal_event (event_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Ensure one active machine deployment per event x machine
CREATE INDEX IF NOT EXISTS idx_event_machine_status
  ON event_machines (machine_id, status);
