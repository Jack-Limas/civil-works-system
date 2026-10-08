# Plan — Inventory & Reports (branch `feat/inventory-reports`)

Safety net: local tag `pre-inventory-reports` marks `main` before this session; tag `session-1-history`
keeps the 157 commits of the previous session (finance module). Never push: the owner merges.
To resume: read `CLAUDE.md`, this file and `git log --oneline pre-inventory-reports..HEAD`.

- [x] Step 0 — Safety net (tags, branch, this plan)
- [x] Step 1 — CLAUDE.md: inventory and reports domain rules
- [x] Step 2 — DELETE /projects/:id returns 409 when the project has accounting/inventory/log data
  - Note: field reports join the dependency check once the table exists (Step 3)
- [x] Step 3 — Additive schema (MaterialCategory, movement columns, Weather, FieldReportStatus, FieldReport) — **STOP-1: owner approval + Neon backup before applying** — approved; Neon backup branch created by owner; applied with migrate deploy on 2026-10-08; 14 table counts identical before/after; existing movements read fine with new columns NULL
- [x] Step 4 — Inventory backend
  - [x] 4.1 Thresholds config and material status engine (single source, also behind /materials/low-stock)
  - [x] 4.2 GET /materials (search, filters, status, coverage, need, last movement, admin-only cost), /materials/summary, /materials/:id
  - [x] 4.3 POST/PATCH /materials with role rules
  - [x] 4.4 Movements: role rules on POST, GET /materials/movements with filters, no PATCH/DELETE
  - [x] 4.5 POST /expenses inventoryEntry (single transaction)
  - [x] 4.6 Inventory in the assistant context (role-filtered)
  - [x] 4.7 curl checks both roles (400/403/404, insufficient stock, concurrency) — 33/33 passed; test rows removed
- [ ] Step 5 — Reports backend
  - [ ] 5.1 Report meta + Server-Timing; /reports/progress, /financial (admin), /materials, /incidents
  - [ ] 5.2 Field reports: list, compile, create (409 per project/day), detail, edit, review
  - [ ] 5.3 POST /reports/summary with Gemini (server-side data, locale, 502, 10 s rate limit)
  - [ ] 5.4 curl checks both roles
- [ ] Step 6 — Frontend base (types, hooks, i18n inventory/reports/fieldReports, sidebar, print utilities)
- [ ] Step 7 — Inventory screens
  - [ ] 7.1 Admin inventory `/materials`
  - [ ] 7.2 Admin movements `/materials/movements`
  - [ ] 7.3 Material detail `/materials/[id]`
  - [ ] 7.4 Resident inventory (stock + register consumption + recent movements)
  - [ ] 7.5 Expense form: "also register in inventory"
- [ ] Step 8 — Reports screens
  - [ ] 8.1 Reports center `/reports`
  - [ ] 8.2 Report view `/reports/[type]` (filters, KPIs, charts, meta, CSV, print, AI summary)
  - [ ] 8.3 Daily log `/reports/daily` (admin list/detail/review)
  - [ ] 8.4 Resident "My daily log" with today's prefilled report
- [ ] Step 9 — Demo data (categories, costs, movements, rejected-linked warning, 60-day consumption, 15-20 days of logs)
- [ ] Step 10 — Close-out (builds, rendering doc, walkthrough both roles, regressions, report)
