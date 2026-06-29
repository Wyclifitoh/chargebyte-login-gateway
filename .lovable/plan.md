# Chargebyte Enterprise Platform — Phased Transformation Plan

This is a multi-month scope. Shipping it in one turn would produce a broken app. I'll break it into phases you can approve/reorder. Each phase ships independently and leaves the app stable.

## Phase 0 — Audit & Foundation (1 batch)
- Codebase audit report: duplicated code, unused components, inconsistent styling, broken state, redundant API calls, perf, security, naming.
- Standardize **Africa/Nairobi (UTC+3)** everywhere via a single `formatDate/formatDateTime` utility (already started). Replace all ad-hoc `toLocaleString` calls.
- Centralize API layer: single `useQuery` patterns, error boundaries, toast helpers, loading skeletons, empty states.
- Folder restructure: `features/<domain>/{components,hooks,api,types}`.

## Phase 1 — Security Hardening (critical, do first)
- Short access-token TTL (15 min) + rotating refresh tokens (7 days, single-use, server-tracked in `refresh_tokens` table).
- **Idle auto-logout** (15 min default, configurable). Activity listener resets timer; logs out + clears tokens.
- **Absolute session expiry** regardless of activity.
- "Remember me" toggle controls refresh-token lifetime only.
- Server-side session table: device, browser, IP, last_activity, created_at. Endpoints: list sessions, revoke one, revoke all.
- Login attempt tracking + lockout after N failures (already partial via rate limiter — extend with per-user counter).
- Password strength validation (zod), password history table (last 5), 2FA-ready schema (totp_secret column, unused for now).
- Audit table extension: every login/logout/refresh/revoke.
- Helmet CSP tightening, CSRF for cookie-based routes, parameterized queries verified.

## Phase 2 — RBAC Overhaul
- Permission matrix table (`role_permissions`): resource × action (view/create/edit/delete/approve/export).
- Replace hard-coded `ROLE_NAV_ACCESS` with permission checks via `usePermission(resource, action)` hook.
- Roles: super_admin, ops_manager, finance, support, field_supervisor, field_agent, developer, marketing, viewer.
- Backend `authorize()` middleware reads matrix instead of role list.

## Phase 3 — Executive Dashboard Redesign
- New `/dashboard` overview: KPI cards (today rentals/revenue, pending returns, PBs out, machine online/offline/error, open tickets, agents working, active locations).
- Charts: weekly/monthly revenue, top/bottom stations, top agents, return rate, refund stats, machine/battery health.
- Live map (Leaflet) of stations with status colors.
- Recent activity feed, announcements widget, quick actions.
- WebSocket or 30s polling for "real-time" feel.

## Phase 4 — Field Agent Module (replaces WhatsApp)
- **Clock-in with silent GPS**: `navigator.geolocation`, haversine distance vs `cb_stations.lat/lng/allowed_radius_m`. Reject + modal if outside.
- Add `allowed_radius_m` column to stations; admin UI to set per station.
- Clock-in/out records: time, gps, accuracy, device, browser, ip.
- Agent shift dashboard: current shift, station, hours, rentals/returns today, machine status, tickets, announcements.
- **Shift report auto-populated** from rentals/clockin tables; agent only fills qualitative fields + photos (upload to storage).
- Disable report submission until clock-out.

## Phase 5 — Customer Support CRM
- `support_tickets` table: status (open/assigned/in_progress/resolved/closed/escalated), priority (low/med/high/critical), category, customer_phone, machine_id, station_id, gps, photos[], notes, sla_due_at.
- Ticket UI: kanban + list, internal comments thread, attachments, assign, escalate, SLA timer.
- Notify admins on create (in-app + email-ready hook).

## Phase 6 — Agent Performance
- Aggregations: attendance %, late arrivals, missed shifts, total hours, rentals assisted, tickets created, productivity score, leaderboard.
- Monthly performance page per agent.

## Phase 7 — Machine Management Upgrade
- Extended machine detail: health, battery count/health, network, SIM, revenue, current rentals, pending returns, last_seen, firmware, maintenance log, error log, images, QR, install date, owner, warranty, notes.
- Maintenance history table.

## Phase 8 — Reports & Exports
- Unified report builder: revenue / rentals / returns / refunds / support / attendance / machine health / inventory / finance / agents / locations / customers.
- Filters: date, station, region, agent, machine, status.
- Export PDF (pdfmake), Excel (already xlsx), CSV.

## Phase 9 — Notifications Center
- In-app notification table + bell dropdown with unread badge.
- Toast standardization (sonner) — success/error/warning/info helpers.
- Confirmation modal component used everywhere destructive actions exist.
- Email + SMS + Push hooks (no-op adapters now, real providers later).

## Phase 10 — UX/Mobile Polish
- Mobile-first nav rework (bottom tab bar on small screens, top bar on desktop — keeps your "no sidebar" rule).
- Skeleton loaders, empty states, global search (cmdk), keyboard shortcuts, dark mode toggle, accessibility pass (ARIA, focus, contrast).
- Bulk actions on every list (select all, bulk delete/export/assign).

## Phase 11 — Analytics & Audit
- Analytics page: revenue/rental trends, station heatmap, refund trends, agent productivity, machine uptime — interactive with recharts.
- Audit log viewer: who/what/when/where, before/after diff, IP, device, full-text search.

---

## Technical Notes
- **Stack stays the same**: React 18 + Vite + Tailwind + shadcn frontend; existing Node/Express + MySQL backend in `/backend`.
- **No Lovable Cloud migration**: your backend is already MySQL on your own infra. I will not move auth to Supabase.
- New DB migrations land in `backend/src/database/migrations/` (006+).
- Each phase = its own PR-style batch with migrations + backend + frontend + a short verification checklist.

---

## What I need from you
1. **Approve the phasing** or reorder (e.g. "Security + Timezone + Field Agent first, rest later").
2. **Confirm scope cuts** — anything you want to defer (e.g. 2FA, push notifications, dark mode)?
3. **Phase 1 size**: do you want full session-management UI in Phase 1, or just idle-logout + short tokens now and device list later?

Once you pick, I'll start with Phase 0 audit + Phase 1 security in the next turn.
