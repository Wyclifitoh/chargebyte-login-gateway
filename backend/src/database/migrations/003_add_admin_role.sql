-- ============================================================
-- Migration 003 — Add 'admin' role (distinct from 'super_admin')
-- Run:  mysql -u root -p chargebyte_db < backend/src/database/migrations/003_add_admin_role.sql
-- ============================================================

ALTER TABLE system_users
  MODIFY COLUMN role ENUM(
    'super_admin',
    'admin',
    'staff',
    'location_partner',
    'funding_partner',
    'ad_client',
    'system'
  ) NOT NULL;
