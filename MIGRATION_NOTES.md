# Migration Notes — Downtime Tracker → Vercel

This document describes the port of the ANDRITZ South Holland downtime tracker
from a self-hosted Express + better-sqlite3 app to a Vercel-deployable
serverless app backed by Postgres (Neon). Source app:
`/home/user/workspace/downtime-tracker` (left untouched as a backup). Migrated
app: this directory.

## What changed

1. **Database: SQLite → Postgres (Neon)**
   - `shared/schema.ts`: all 13 tables converted from `sqliteTable` (drizzle
     `sqlite-core`) to `pgTable` (drizzle `pg-core`). Autoincrement primary
     keys became `serial("id").primaryKey()`. Column names, defaults, and
     NULL semantics were kept identical. Integer 0/1 "boolean" flag columns
     (e.g. `active`) were kept as `integer`, not converted to a real
     Postgres `boolean`, to avoid touching any app code that compares against
     `0`/`1`.
   - `server/storage.ts`: rewritten to use `drizzle-orm/neon-http` +
     `@neondatabase/serverless`. Every method is now `async` and returns a
     `Promise`. `.get()`/`.all()`/`.run()` sqlite calls became
     `await db.select()...` / `await db.insert().returning()` etc. An
     `ensureTables()` helper runs `CREATE TABLE IF NOT EXISTS` for all 13
     tables as a fallback safety net — the primary/documented path for
     creating tables is `npm run db:push` (drizzle-kit), see below.
   - `drizzle.config.ts`: `dialect` changed to `"postgresql"`,
     `dbCredentials.url` now reads `process.env.DATABASE_URL`, `out` changed
     to `./drizzle`.

2. **Serverless entry point**
   - Added `api/index.ts` — a single Vercel serverless function that wraps
     the same Express app and route handlers as the original app. It sets up
     `express.json()`, `express-session`, a `410` stub for `/uploads/*`, and
     lazily calls `registerRoutes()` on cold start.
   - `vercel.json` routes every `/api/*` request to this function and builds
     the frontend with `npm run build:frontend` (`vite build`) into
     `dist/public`.

3. **No WebSockets — replaced with polling**
   - The old SSE distress broadcaster (`broadcastDistress`, the
     `distressClients` `Set`, and the `/api/distress/stream` endpoint) was
     removed from `server/routes.ts`. Vercel serverless functions cannot hold
     long-lived connections open.
   - `client/src/components/distress-broadcaster.tsx` no longer opens an
     `EventSource`. It now polls `GET /api/distress/active` every 5 seconds
     via `setInterval` (kept faster than the general 30-60s guidance because
     this is a safety/emergency broadcaster — responsiveness matters more
     here than for dashboards).
   - All other polling (TV dashboard, safety concerns, birthdays, toolbox
     talk) already used `useQuery({ refetchInterval })` at 30s/60s in the
     original app and needed no changes.
   - The `/api/distress` POST (create alert), `/api/distress/active` GET
     (public, active alerts), `/api/distress` GET (managers, history), and
     `/api/distress/:id/respond` / `/api/distress/:id/resolve` endpoints are
     all preserved with identical behavior — they just no longer broadcast.

4. **File uploads disabled (no persistent filesystem on Vercel)**
   - `multer` disk storage was removed. Delay photos, birthday photos, and
     toolbox talk images are **not persisted** in this deployment.
   - To keep the client's existing `FormData`/multipart submissions working
     without any UI changes, the three affected routes
     (`POST /api/delays`, `POST /api/birthdays`, `PATCH /api/birthdays/:id`,
     `PUT /api/toolbox`) use `multer.memoryStorage()` purely to parse the
     surrounding form fields (name, description, dates, etc.). Any uploaded
     file bytes are received into memory and then discarded — never written
     anywhere. `photoPath`/`imagePath` fields are left null/empty/unchanged.
   - `app.use("/uploads", ...)` in `api/index.ts` returns `410 Gone` with a
     JSON body for any old `/uploads/*` URL still referenced by existing
     data rows, so the UI's `<img>` fallback/broken-image handling degrades
     gracefully instead of erroring.
   - **TODO (follow-up, not done in this pass):** wire up `@vercel/blob` for
     real photo storage and remove the `410` stub.

5. **Sessions**
   - Session middleware moved from `server/routes.ts` (previously backed by
     `better-sqlite3-session-store`) into `api/index.ts`, using
     `express-session`'s default `MemoryStore`.
   - **MemoryStore is in-memory and per-instance.** On Vercel this means
     sessions will NOT persist across serverless cold starts or be shared
     between concurrent function instances — a user could occasionally get
     logged out unexpectedly, especially right after a deploy or during
     low-traffic periods when instances spin down. This is an accepted
     tradeoff for a small, single-shop internal tool per the migration brief.
     If this becomes a problem in practice, swap in a Postgres-backed session
     store (e.g. `connect-pg-simple`) using the same `DATABASE_URL`.
   - Cookie name is `sid` (per the serverless entry point template), secure
     in production, `httpOnly`, `sameSite: "lax"`, 30-day `maxAge`.

6. **Dependencies**
   - Removed: `better-sqlite3`, `better-sqlite3-session-store`,
     `@types/better-sqlite3`, `ws`, `@types/ws`, `sql.js`, `passport`,
     `passport-local`, `@types/passport`, `@types/passport-local`,
     `bufferutil` (all unused after the SQLite/WebSocket removal — `passport`
     was already vestigial/unused in the original app's routes).
   - Added: `@neondatabase/serverless` (`latest`).
   - Kept: `drizzle-orm` (already includes the `neon-http` driver),
     `drizzle-kit`, `express`, `express-session`, `multer` (now used only for
     in-memory form-field parsing, see above — no disk storage).

7. **Scripts**
   - `package.json` scripts simplified to: `dev` (`vite`, frontend-only dev
     server), `build:frontend` (`vite build`), `check` (`tsc`), `db:push`
     (`drizzle-kit push`).
   - The old `server/index.ts` (boot diagnostics, health endpoint, dynamic
     `setupVite`/`serveStatic` branching for a long-running Node process) is
     still present in the repo but is dead code on Vercel — `api/index.ts` is
     the actual entry point now. It's harmless to leave and could be revived
     if this app is ever run outside Vercel.

## What was NOT changed

- Every route path, HTTP method, request/response shape, and validation rule
  in `server/routes.ts` is identical to the original.
- All role checks (`requireAuth`, `requireRole`, hardcoded passwords —
  `15600` operator / `prod2026` production_manager / `plant2026`
  plant_manager) are unchanged.
- Every page, component, translation string (en/es), and the hash-based
  `wouter` routing in the client are unchanged.
- The Excel export (9 worksheets), safety concerns flow (public submission +
  rate limiting + admin CRUD), rollups, schedule/holiday CRUD, and DLH%
  settings are unchanged.

## Environment variables required on Vercel

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres/Neon connection string used by `drizzle-orm/neon-http` and `drizzle-kit push`. |
| `SESSION_SECRET` | Secret used to sign the `express-session` cookie. Falls back to `"dev-secret"` if unset — **must** be set in production. |
| `OPERATOR_PASSWORD` | Bootstrap password for the `operator` role (if the app is seeded to read this from env rather than the hardcoded `15600` default — see note below). |
| `PRODUCTION_PASSWORD` | Bootstrap password for `production_manager` (default `prod2026`). |
| `PLANT_PASSWORD` | Bootstrap password for `plant_manager` (default `plant2026`). |
| `NODE_ENV` | Set to `production` automatically by Vercel; controls the `secure` cookie flag. |

**Note on passwords:** per the migration brief, the hardcoded default
passwords (`15600` / `prod2026` / `plant2026`) were preserved exactly as they
were in `server/storage.ts`'s `bootstrap()` seeding function — they are not
currently read from `OPERATOR_PASSWORD`/`PRODUCTION_PASSWORD`/`PLANT_PASSWORD`
env vars at runtime. Those three env vars are listed above because the task
brief calls for documenting them; wiring `bootstrap()` to prefer the env vars
over the hardcoded defaults (with the hardcoded values as fallback) would be
a small, safe follow-up if you want to change passwords without a code change.

## First deploy steps

1. Create a Neon (or Vercel Postgres) database and copy its connection string.
2. In the Vercel project settings, set `DATABASE_URL`, `SESSION_SECRET`, and
   (optionally) `OPERATOR_PASSWORD` / `PRODUCTION_PASSWORD` / `PLANT_PASSWORD`.
3. Deploy. The build command (`npm run build:frontend`) only builds the
   frontend — the `api/index.ts` function is deployed automatically by
   Vercel's zero-config Node function detection.
4. **Create the database tables** by running, from your local machine (with
   `DATABASE_URL` pointed at the same Neon database):
   ```bash
   npm install
   DATABASE_URL="<your-connection-string>" npm run db:push
   ```
   This runs `drizzle-kit push`, which creates all 13 tables from
   `shared/schema.ts`. (There's also an `ensureTables()` fallback in
   `server/storage.ts` that runs `CREATE TABLE IF NOT EXISTS` on first
   request if tables are missing, but `db:push` is the primary, documented
   path and keeps the schema in sync going forward.)
5. Visit the deployed app once — `bootstrap()` seeds default assets, reasons,
   employees, assignments, schedule, holidays, DLH%, and the three role
   password hashes on first run (same seed data as the original app).

## Known blockers / TODOs

- **File uploads are disabled**, not migrated to blob storage. Delay/birthday
  photos and toolbox images can no longer be saved. TODO: integrate
  `@vercel/blob`.
- **Session store is in-memory** (`MemoryStore`) and not shared across
  serverless instances — see the Sessions section above.
- **Bootstrap passwords are still hardcoded**, not read from the
  `OPERATOR_PASSWORD`/`PRODUCTION_PASSWORD`/`PLANT_PASSWORD` env vars (see
  note above).
- A handful of **pre-existing TypeScript strictness warnings** (unrelated to
  this migration — confirmed present in the original `downtime-tracker`
  source too) remain: a `ToolboxTalk.presenter` property access in
  `admin.tsx`/`tv.tsx` not present in the shared type, some `req.query`
  values typed as `string | string[]` passed where a `string` is expected,
  and one `MapIterator` needing `--downlevelIteration`. None of these block
  `npm run build:frontend`, which is the actual Vercel build command; they
  only show up under a stricter standalone `tsc --noEmit` run.
- `script/seed-demo.mjs` (a legacy demo-seeding script) directly imports
  `better-sqlite3`, which has been removed from dependencies. It was not part
  of the brief's scope and will not run as-is; left in place unmigrated.

## Source references

- Migration brief: `/home/user/workspace/vercel-migration-brief.md`
- Original app (untouched backup): `/home/user/workspace/downtime-tracker`
