# Plan — Users, settings, audit log, incidents and workers

Branch: `feat/users-settings` (tag `pre-users-settings` on `main` before starting). Never push.
A new session can resume by reading `CLAUDE.md`, this file and `git log`.

## Decisions taken
- No `docs/design/` folder and no images were provided: Users, Settings and History follow the visual language of Costs and Inventory.
- Incident status keeps the existing `IN_REVIEW` value (renaming an enum value is not additive). The UI labels it "In progress" / "En progreso".
- Worker already has `status` (ACTIVE/INACTIVE) and `position` (trade): reused as "isActive" and "oficio" instead of duplicating columns.

## Steps
- [x] Step 0 — State check (main has the non-squash merge, baseline checks green, sidebar/route audit, tag + branch, this plan)
- [ ] Step 1 — CLAUDE.md domain sections (users, audit, settings, incidents, workers)
- [ ] Step 2 — Hardening
  - [ ] 2.1 Assistant: 15–20 s timeout + one retry, 502 with truncated cause in the log
  - [ ] 2.2 Fix audit bugs: `/workers` leaks every worker (with document) to residents
- [ ] Step 3 — Additive schema (User, AuditLog, SystemSetting, Incident history, Evidence.incidentId, Worker.phone) — STOP-1
- [ ] Step 4 — Backend
  - [ ] 4.1 Audit service + GET /audit-logs (+ export) and events wired in existing modules
  - [ ] 4.2 Auth: inactive users, lastLoginAt, login rate limit, change-password, PASSWORD_CHANGE_REQUIRED
  - [ ] 4.3 Users CRUD (list+KPIs, detail, create with temp password, edit, activate/deactivate, reset password)
  - [ ] 4.4 Settings (GET/PUT/reset) wired to risk and inventory thresholds + company name
  - [ ] 4.5 Incidents (filters, KPIs, detail with history, status transitions by role, photos)
  - [ ] 4.6 Workers (filters, KPIs, detail, create/edit, deactivate/activate, role-filtered fields)
  - [ ] 4.7 curl checks both roles
- [ ] Step 5 — Frontend base (types, hooks, i18n namespaces, sidebar, profile entry, /change-password, PASSWORD_CHANGE_REQUIRED handling)
- [ ] Step 6 — Screens
  - [ ] 6.1 Incidents (admin + resident)
  - [ ] 6.2 Workers (admin + resident)
  - [ ] 6.3 Users list, create (temp password once), detail/edit
  - [ ] 6.4 Settings
  - [ ] 6.5 Audit history
  - [ ] 6.6 My profile
- [ ] Step 7 — Demo data (users incl. inactive and must-change, incidents with history/photos, workers, audit events) + clean
- [ ] Step 8 — Close-out (checks, rendering doc, walkthrough both roles, regressions, report)
