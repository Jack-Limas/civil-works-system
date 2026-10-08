# Session plan — branch `feat/claude-session`

Safety net: local tag `pre-claude-code` marks the state before this session. Never push; the owner merges to `main`.
To resume: read `CLAUDE.md`, this file and `git log --oneline pre-claude-code..HEAD`.

## Block A — Harden what exists

- [x] Step 0 — Safety net (tag, branch, this plan)
- [x] Step 1 — Root `CLAUDE.md` with project rules
- [x] Step 2 — Backend & auth bugs
  - [x] 2.1 `GET /auth/me` reads the DB; frontend aligned
  - [x] 2.2 `AppError` everywhere instead of plain objects
  - [x] 2.3 Ownership-based access for RESIDENT_ENGINEER (central helper)
  - [x] 2.4 Activity `responsibleId` from `request.user.sub`
  - [x] 2.5 Inventory movement in a transaction with conditional decrement
  - [x] 2.6 `GET /users` (ADMIN), responsible select, users list, `useCreateUser` fix
  - [x] 2.7 Gemini fallback not re-persisted, deduplicated, `GEMINI_MODEL` from env
  - [x] 2.8 `cookies.txt` out of the index, `.env` history check
  - [x] 2.9 Locale-aware refresh redirect; proxy protects every private route
  - Note: resident-role curl checks run after Step 10 with the demo residents (real resident password unknown)
- [x] Step 3 — Full i18n (namespaces, `i18n:check`, backend error mapping, locale formats, ObraIQ brand)
- [x] Step 4 — Dashboard & projects polish (tokens, skeletons, empty states, toasts, responsive)

## Block B — Finance module "Costos"

- [x] Step 5 — New ProjectType values (translations, forms, Gemini prompts)
- [x] Step 6 — Additive Prisma schema (Supplier, Expense columns, FundTransfer, indexes) — **STOP-1: owner approval before applying** — approved and applied with migrate deploy on 2026-10-07; row counts identical before/after
- [x] Step 7 — Finance backend (suppliers, expenses review/upload, fund transfers, cash balances, finance summary, cashflow; APPROVED-only sums)
  - Done: 38 role/write integration checks (admin + demo resident) passed against demo data; test rows removed by reseeding
- [x] Step 8 — Frontend finance base (types, hooks, `formatCOP`, `exportCsv`, i18n namespaces, sidebar "Costos")
- [x] Step 9 — Screens
  - [x] 9.1 Financial summary `/expenses`
  - [x] 9.2 Register expense `/expenses/new` (mobile-first, image-compress worker)
  - [x] 9.3 Suppliers & petty cash
  - [x] 9.4 Cash flow `/cashflow`
- [x] Step 10 — Demo data (`seed:demo`, `seed:demo:clean`) — idempotent, real data verified identical after seed and after clean; demo data left loaded

## Block C — Landing & rendering

- [x] Step 11 — Static landing (SSG es/en) + `docs/rendering-strategy.md`
- [x] Step 12 — Close-out: builds, lint, i18n check, manual walkthrough, report
  - backend build, frontend tsc/lint/i18n:check/next build green; 28 route x role/locale/theme/viewport sweeps without JS errors or horizontal scroll; Web Worker, SharedWorker, SharedArrayBuffer, worker threads, assistant and Cloudinary verified
