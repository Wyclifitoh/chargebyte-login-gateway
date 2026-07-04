# Chargebyte CRM Enhancement Plan

This is a large, multi-domain change. I'll extend the existing Express/MySQL backend and the React dashboard without removing any existing features. Delivery is broken into 4 phases so each is testable before moving on.

## Phase A — Data model & configuration (foundation)

Migration `008_gps_cabinets_snapshots.sql`:

- `cb_stations`: add `latitude DECIMAL(10,7)`, `longitude DECIMAL(10,7)`, `allowed_radius_m INT` (nullable, per-station override).
- `system_settings` (new, key/value): stores `default_clockin_radius_m`, `chargenow_base_url`, `chargenow_webhook_secret`, `chargenow_push_url`. Super Admin editable.
- `machines`: add `cabinet_device_id VARCHAR(64) UNIQUE`, `cabinet_model VARCHAR(64)`, `manufacturer_cabinet_id VARCHAR(64)`, `signal INT`, `empty_slots INT`, `busy_slots INT`, `is_online TINYINT`, `last_synced_at DATETIME`, `last_sync_error TEXT`.
- `powerbanks` (new): `id`, `battery_id`, `machine_id` (nullable if rented out), `voltage`, `status` (`in_cabinet|rented|abnormal`), `last_seen_at`.
- `clock_events`: add `station_id`, `distance_m`, `accuracy_m` (already partly present — additive only).
- `shift_snapshots` (new): `id`, `clock_event_id`, `machine_id`, `phase` (`clock_in|clock_out`), `snapshot JSON`, `captured_at`.
- `chargenow_webhook_events` (new): `id`, `event_type`, `device_id`, `payload JSON`, `signature`, `received_at`, `processed_at`, `dedupe_key UNIQUE`.
- Standard GRANTs, keep existing RLS/role checks.

Backend config module: `backend/src/config/settings.js` (cached read of `system_settings` with TTL). Super Admin CRUD via `/api/settings`.

## Phase B — GPS clock-in / work-gating / clock-out (feature 1–3)

Backend:

- `clockin.controller.js`:
  - `clock` (in): require `station_id`; load station coords + radius (fallback to `default_clockin_radius_m`); compute haversine distance; reject with 422 + friendly message if outside; persist distance/lat/lng/station.
  - `clock` (out): require today's `daily_reports` row for the user → else 422 "You must submit today's report before clocking out."
  - On clock-in success: fire-and-forget snapshot of every machine at that station (Phase C).
  - On clock-out success: capture second snapshot, compute + persist diff row.
- New middleware `requireClockedIn` used by `daily_reports` create, `support` create, `operations/reports` create, `shift_observations` create. Returns 423 "Please clock in before performing this action."
- Whitelist/settings endpoints: `GET/PUT /api/settings/clockin` for radius default; per-station radius via existing `stations` update.

Frontend:

- `ClockInPage.tsx`: station picker (from `api.stations.getAll`), `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: true, timeout: 15000 }`, submit `{ station_id, latitude, longitude, accuracy }`. Show distance-from-target on success; toast the server's friendly rejection message.
- Global `useClockInGuard` hook + `<ClockedInOnly>` wrapper on Reports/Support/Operations create actions — disables buttons and surfaces the gate message.
- `StationsPage.tsx`: add lat/lng/radius fields to create/edit dialog (super_admin / admin only).
- New `SettingsPage.tsx` under `/dashboard/settings` for super_admin: default radius, ChargeNow credentials/URLs.

## Phase C — ChargeNow manufacturer integration (feature 4, 5, 7, 9, 10)

New service `backend/src/services/chargenow.service.js`:

- Basic auth from env `CHARGENOW_USERNAME` / `CHARGENOW_PASSWORD` (I'll request these via add_secret before shipping — do not hardcode).
- `getEventPushConfig()`, `setEventPushConfig(pushUrl, events)`, `getCabinet(deviceId)`.
- Axios client with 8s timeout, retry (2x, expo backoff), structured logging to `chargenow_api_logs` table.
- In-memory + DB cache: `getCabinetCached(deviceId, maxAgeMs = 60_000)` — writes to `machines.*` snapshot fields.

Routes:

- `POST /api/webhooks/chargenow` — **public**, no auth-middleware. Verifies optional HMAC or shared-secret header, dedupes by `${event}:${device_id}:${event_time}`, persists raw payload, applies handler by `event_type` (online/offline/status/battery in/out/abnormal/popup/rental/pos). Idempotent — safe to replay.
- `GET/POST /api/chargenow/config` (super_admin) — proxies API 1 & 2, updates settings.
- `POST /api/machines/:id/sync` (admin) — force-fetch API 3 for a single cabinet.
- Background sync: lightweight `setInterval` (5 min) in `server.js` bootstrap re-syncs stale machines (`last_synced_at < now-5min`). Fails soft — logs error, keeps last known state.

Report submission:

- `daily_reports` create handler: before insert, if `machine_id`/`station_id` supplied, call `getCabinetCached` for each machine and store the snapshot JSON in a new `report_machine_snapshots` column/table so reports carry live cabinet state automatically.

Frontend:

- Machine create/edit: add Device ID, Cabinet Model, Manufacturer Cabinet ID. "Sync now" button on machine detail.
- Settings page: ChargeNow section — view current push config (API 1), edit push URL + event toggles (API 2), test connection button.
- Fallback banner (existing `FallbackBanner`) shown when `last_sync_error` set or `last_synced_at` > 10 min.

## Phase D — Live dashboard, snapshots & audit (feature 6, 8)

Backend:

- `overview.controller.js` extended with `/api/overview/live`:
  - Station counts (total, with machines online/offline/issues).
  - Machine aggregate (online/offline, avg signal, slot totals).
  - Battery aggregate (in cabinet, rented, returned today, borrowed today, low-voltage, abnormal) using `powerbanks` + `chargenow_webhook_events` for today's borrow/return counts.
  - Staff (currently clocked in from `clock_events`, reports submitted today, pending).
- `/api/shift-snapshots?user_id=&date=` — returns paired in/out snapshots + diff.

Frontend:

- `OverviewPage.tsx`: new "Live Operations" section with the four groups above; poll every 30s; each tile deep-links to filtered list.
- `MachinesPage.tsx`: columns for Device ID, Cabinet ID, signal, slots (empty/busy/total), last update; row-level "Sync" action; issue filter.
- `ClockInPage.tsx`: show today's snapshot diff (batteries added/removed, slot changes, new warnings) after clock-out.

## Technical details

- Distance: haversine in JS (backend) — no PostGIS needed on MySQL.
- Webhook security: shared secret header `X-ChargeNow-Signature` (HMAC-SHA256 of raw body with `chargenow_webhook_secret`). If manufacturer doesn't sign, fall back to IP allowlist + secret path token.
- Idempotency key: `SHA256(event_type + device_id + event_time + battery_id?)` → unique index on `chargenow_webhook_events.dedupe_key`.
- Secrets needed (I'll request via `add_secret` at Phase C start): `CHARGENOW_USERNAME`, `CHARGENOW_PASSWORD`, `CHARGENOW_WEBHOOK_SECRET` (generated).
- All new controllers reuse `authenticate` + `authorize` + `auditLog` middleware. No existing endpoints modified destructively — only additive fields/behaviors.
- All frontend colors/spacing use existing turquoise tokens; horizontal nav preserved; new pages slot into existing dropdown groups (Operations → Settings, Insights → Live Ops).

## Delivery order

1. Phase A migration + settings CRUD.
2. Phase B clock-in GPS + gating + report-before-clockout.
3. Phase C ChargeNow service + webhook + machine sync + report enrichment (requires secrets).
4. Phase D live dashboard tiles + snapshot diff UI.

Each phase ends with: backend migrated, endpoints smoke-tested, UI wired, no regressions to existing pages.

Reply **approve** to start Phase A, or tell me which phases to reorder/skip.