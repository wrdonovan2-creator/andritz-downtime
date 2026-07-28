import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import type {} from "express-session"; // needed for the SessionData augmentation below to attach
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import multer from "multer";
import { storage, bootstrap } from "./storage";

// ---- downtime math ----
function parseDateTime(date: string, time: string): number | null {
  if (!date) return null;
  const t = time && time.length >= 4 ? time.slice(0, 5) : "00:00";
  const ms = Date.parse(`${date}T${t}:00`);
  return isNaN(ms) ? null : ms;
}
function computeHours(d: { dateDown: string; timeDown: string; dateUp: string | null; timeUp: string | null }): number | null {
  if (!d.dateUp || !d.timeUp) return null;
  const down = parseDateTime(d.dateDown, d.timeDown);
  const up = parseDateTime(d.dateUp, d.timeUp);
  if (down === null || up === null) return null;
  return (up - down) / (1000 * 60 * 60);
}
function isoWeek(dateStr: string): { week: number; year: number } {
  const d = new Date(dateStr + "T00:00:00Z");
  const target = new Date(d.getTime());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return { week, year: target.getUTCFullYear() };
}
function yearOf(dateStr: string): number { return parseInt(dateStr.slice(0, 4), 10); }
function weekStart(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4Day * 86400000);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * 86400000);
}
function fmtDate(d: Date): string { return d.toISOString().slice(0, 10); }

type Role = "operator" | "production_manager" | "plant_manager";

declare module "express-session" {
  interface SessionData {
    role?: Role;
    lang?: "en" | "es";
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.role) return res.status(401).json({ message: "Please sign in." });
  next();
}
// requireRole('plant_manager') or requireRole(['plant_manager','production_manager'])
function requireRole(roles: Role | Role[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.role) return res.status(401).json({ message: "Please sign in." });
    if (!allowed.includes(req.session.role))
      return res.status(403).json({ message: "You do not have permission for this action." });
    next();
  };
}
const MANAGERS: Role[] = ["production_manager", "plant_manager"];

// NOTE — FILE UPLOADS DISABLED FOR VERCEL SERVERLESS DEPLOYMENT.
// Vercel functions have no persistent local filesystem, so multer disk
// storage (delay photos, birthday photos, toolbox talk images) cannot work
// as-is. Per the migration brief, upload endpoints are stubbed: the actual
// image bytes are discarded (no @vercel/blob wiring yet) so the UI doesn't
// break, but we still need to parse the surrounding multipart/form-data
// body (name, month, day, title, etc.) since the client always submits
// these forms as FormData. `multer.memoryStorage()` parses the fields and
// buffers any file in memory momentarily; we simply never persist it.
// TODO(next): wire these up to @vercel/blob for real file storage and
// restore photo upload support.
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Soft in-memory rate limit for PUBLIC safety submissions: max 5 per IP / hour.
// NOTE: this is per-lambda-instance state and will not be consistent across
// serverless invocations/regions. Fine for a first cut; consider a DB-backed
// rate limit if abuse becomes an issue.
const safetyRate = new Map<string, number[]>();
function safetyRateOk(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const hits = (safetyRate.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= 5) { safetyRate.set(ip, hits); return false; }
  hits.push(now);
  safetyRate.set(ip, hits);
  return true;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await bootstrap();

  // Session middleware + cookie config now live in api/index.ts (the
  // serverless entry point) since there is no long-lived process here to
  // hold a sqlite-backed session store. Session store is in-memory
  // (express-session's default MemoryStore) — see MIGRATION_NOTES.md.
  app.set("trust proxy", 1);

  // Uploads directory no longer served from disk — see api/index.ts, which
  // returns 410 for any /uploads/* request in this deployment.

  // ---- AUTH ----
  app.post("/api/auth/login", (req, res) => {
    const { password, role } = req.body || {};
    if (!password) return res.status(400).json({ message: "Password required." });
    const map: Record<Role, string> = {
      operator: "operator_pw_hash",
      production_manager: "prod_pw_hash",
      plant_manager: "plant_pw_hash",
    };
    // If a role is provided, only check that role's password. Otherwise try all.
    const rolesToTry: Role[] = role && map[role as Role]
      ? [role as Role]
      : ["plant_manager", "production_manager", "operator"];
    (async () => {
      for (const r of rolesToTry) {
        const hash = await storage.getSetting(map[r]);
        if (hash && bcrypt.compareSync(password, hash)) {
          req.session.role = r;
          if (!req.session.lang) req.session.lang = "en";
          return res.json({ role: r, lang: req.session.lang });
        }
      }
      return res.status(401).json({ message: "Incorrect password. Try again." });
    })().catch((e) => res.status(500).json({ message: e?.message || "Login failed." }));
  });
  app.post("/api/auth/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.role) return res.status(401).json({ message: "Not signed in." });
    res.json({ role: req.session.role, lang: req.session.lang || "en" });
  });

  // ---- LANG PREFS ----
  app.get("/api/prefs/lang", (req, res) => res.json({ lang: req.session?.lang || "en" }));
  app.post("/api/prefs/lang", (req, res) => {
    const lang = req.body?.lang === "es" ? "es" : "en";
    req.session.lang = lang;
    res.json({ lang });
  });

  // ---- ASSETS ----
  app.get("/api/assets", async (_req, res) => res.json(await storage.listAssets()));
  app.patch("/api/assets/:id", requireRole("plant_manager"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch: any = {};
    if (req.body.ratePerHour !== undefined) patch.ratePerHour = Number(req.body.ratePerHour);
    if (req.body.costCenter !== undefined) patch.costCenter = String(req.body.costCenter);
    if (req.body.activityType !== undefined) patch.activityType = String(req.body.activityType);
    if (req.body.name !== undefined) patch.name = String(req.body.name);
    if (req.body.active !== undefined) patch.active = req.body.active ? 1 : 0;
    const a = await storage.updateAsset(id, patch);
    if (!a) return res.status(404).json({ message: "Asset not found." });
    res.json(a);
  });
  app.delete("/api/assets/:id", requireRole("plant_manager"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const asset = await storage.getAsset(id);
    if (!asset) return res.status(404).json({ message: "Asset not found." });
    // Refuse if there are delay records referencing the asset
    const delayList = await storage.listDelays();
    const hasDelays = delayList.some((d) => d.assetId === id);
    if (hasDelays) return res.status(409).json({ message: "Cannot delete: asset has delay history. Deactivate instead." });
    await storage.deleteAsset(id);
    res.json({ ok: true, deleted: asset.name });
  });
  app.post("/api/assets/preset", requireRole("plant_manager"), async (req, res) => {
    const { costCenter, ratePerHour } = req.body || {};
    if (!costCenter || ratePerHour === undefined) return res.status(400).json({ message: "costCenter and ratePerHour required." });
    let count = 0;
    for (const a of await storage.listAssets()) {
      if (a.costCenter === costCenter) { await storage.updateAsset(a.id, { ratePerHour: Number(ratePerHour) }); count++; }
    }
    res.json({ updated: count });
  });

  // ---- REASONS ----
  app.get("/api/reasons", async (_req, res) => res.json(await storage.listReasons()));
  app.post("/api/reasons", requireRole(MANAGERS), async (req, res) => {
    const labelEs = (req.body?.labelEs || "").trim();
    let labelEn = (req.body?.labelEn || "").trim();
    if (!labelEs) return res.status(400).json({ message: "Spanish label required." });
    if (!labelEn) labelEn = labelEs;
    res.status(201).json(await storage.createReason({ labelEn, labelEs }));
  });
  app.delete("/api/reasons/:id", requireRole(MANAGERS), async (req, res) => {
    await storage.deleteReason(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });

  // ---- EMPLOYEES ----
  app.get("/api/employees", async (_req, res) => res.json(await storage.listEmployees()));
  app.post("/api/employees", requireRole(MANAGERS), async (req, res) => {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name required." });
    res.status(201).json(await storage.createEmployee({ name, active: 1 }));
  });
  app.patch("/api/employees/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch: any = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name);
    if (req.body.active !== undefined) patch.active = req.body.active ? 1 : 0;
    const e = await storage.updateEmployee(id, patch);
    if (!e) return res.status(404).json({ message: "Employee not found." });
    res.json(e);
  });
  app.delete("/api/employees/:id", requireRole(MANAGERS), async (req, res) => {
    await storage.deleteEmployee(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });

  // ---- ASSIGNMENTS ----
  app.get("/api/assignments", async (_req, res) => res.json(await storage.listAssignments()));
  app.post("/api/assignments", requireRole(MANAGERS), async (req, res) => {
    const { assetId, shift, employeeId } = req.body || {};
    if (!assetId || !shift) return res.status(400).json({ message: "assetId and shift required." });
    res.json(await storage.upsertAssignment(Number(assetId), Number(shift), employeeId ? Number(employeeId) : null));
  });
  // resolve default operator for asset+shift
  app.get("/api/assignments/resolve", async (req, res) => {
    const assetId = parseInt(String(req.query.assetId), 10);
    const shift = parseInt(String(req.query.shift), 10);
    const a = await storage.findAssignment(assetId, shift);
    res.json({ employeeId: a?.employeeId ?? null });
  });

  // ---- DELAYS ----
  async function enrichDelay(d: any) {
    const asset = await storage.getAsset(d.assetId);
    const reason = d.reasonId ? await storage.getReason(d.reasonId) : null;
    const employeeList = d.employeeId ? await storage.listEmployees() : [];
    const employee = d.employeeId ? employeeList.find((e) => e.id === d.employeeId) : null;
    const open = !d.dateUp || !d.timeUp;
    // Raw wall-clock hours (kept for reference / debugging).
    const hoursRaw = computeHours(d);
    // Chargeable hours = only scheduled working-hour overlap.
    const chargeableHours = open ? null : await storage.getChargeableHours(d);
    const rate = asset?.ratePerHour ?? 0;
    const dlhPercent = await storage.getDlhPercent();
    // cost = chargeableHours * (DLH% / 100) * rate
    const cost = chargeableHours !== null ? chargeableHours * (dlhPercent / 100) * rate : null;
    return {
      ...d,
      assetName: asset?.name ?? "(unknown)",
      reasonLabelEn: reason?.labelEn ?? "",
      reasonLabelEs: reason?.labelEs ?? "",
      employeeName: employee?.name ?? "",
      ratePerHour: rate,
      dlhPercent,
      hoursRaw,
      // `hours` now surfaces chargeable hours (all UI/rollups consume this field).
      hours: chargeableHours,
      chargeableHours,
      cost, open,
    };
  }

  app.get("/api/delays", async (req, res) => {
    const raw = await storage.listDelays();
    let list = await Promise.all(raw.map(enrichDelay));
    if (req.query.open === "true") list = list.filter((d) => d.open);
    if (req.query.year) {
      const y = parseInt(String(req.query.year), 10);
      list = list.filter((d) => yearOf(d.dateDown) === y);
    }
    list.sort((a, b) => (a.dateDown + a.timeDown < b.dateDown + b.timeDown ? 1 : -1));
    res.json(list);
  });

  // NOTE: photo upload disabled (no persistent filesystem on Vercel). The
  // `photo` field is accepted and silently ignored — see TODO at top of file.
  app.post("/api/delays", requireAuth, memoryUpload.single("photo"), async (req, res) => {
    const b = req.body || {};
    if (!b.assetId) return res.status(400).json({ message: "Asset required." });
    const now = new Date();
    const dateDown = b.dateDown || fmtDate(now);
    const timeDown = b.timeDown || now.toTimeString().slice(0, 5);
    let shift = b.shift ? Number(b.shift) : null;
    if (!shift) {
      const hr = parseInt(timeDown.slice(0, 2), 10);
      shift = hr >= 6 && hr < 14 ? 1 : 2;
    }
    let employeeId = b.employeeId ? Number(b.employeeId) : null;
    if (!employeeId) {
      const a = await storage.findAssignment(Number(b.assetId), shift);
      employeeId = a?.employeeId ?? null;
    }
    const created = await storage.createDelay({
      assetId: Number(b.assetId),
      reasonId: b.reasonId ? Number(b.reasonId) : null,
      description: b.description || "",
      dateDown, timeDown, dateUp: null, timeUp: null,
      shift, employeeId,
      correctiveActions: "",
      photoPath: null, // uploads disabled in this deployment — see TODO above
      createdByUser: req.session.role || "",
      createdAt: now.toISOString(),
    } as any);
    res.status(201).json(await enrichDelay(created));
  });

  app.patch("/api/delays/:id/close", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const now = new Date();
    const patch: any = {
      dateUp: req.body?.dateUp || fmtDate(now),
      timeUp: req.body?.timeUp || now.toTimeString().slice(0, 5),
    };
    if (req.body?.correctiveActions !== undefined) patch.correctiveActions = req.body.correctiveActions;
    const d = await storage.updateDelay(id, patch);
    if (!d) return res.status(404).json({ message: "Delay not found." });
    res.json(await enrichDelay(d));
  });

  app.patch("/api/delays/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getDelay(id);
    if (!existing) return res.status(404).json({ message: "Delay not found." });
    // Permission: managers can edit any delay any time. Operators may edit
    // only delays that are still OPEN (dateUp is null). Once closed, they must
    // ask a Production Manager.
    const role = req.session.role;
    if (role === "operator") {
      const isOpen = !existing.dateUp || !existing.timeUp;
      if (!isOpen) {
        return res.status(403).json({
          message: "This delay is closed. Ask a Production Manager to edit it. / Este paro est\u00e1 cerrado. Pida al Gerente de Producci\u00f3n que lo edite.",
        });
      }
    }
    const patch: any = {};
    for (const k of ["assetId", "reasonId", "description", "dateDown", "timeDown", "dateUp", "timeUp", "correctiveActions", "shift", "employeeId"]) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    if (patch.assetId !== undefined) patch.assetId = Number(patch.assetId);
    if (patch.reasonId !== undefined) patch.reasonId = patch.reasonId ? Number(patch.reasonId) : null;
    if (patch.shift !== undefined) patch.shift = patch.shift ? Number(patch.shift) : null;
    if (patch.employeeId !== undefined) patch.employeeId = patch.employeeId ? Number(patch.employeeId) : null;
    const d = await storage.updateDelay(id, patch);
    if (!d) return res.status(404).json({ message: "Delay not found." });
    res.json(await enrichDelay(d));
  });

  app.delete("/api/delays/:id", requireRole(MANAGERS), async (req, res) => {
    await storage.deleteDelay(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });

  // ---- ROLLUPS ----
  async function allEnriched(year?: number) {
    const raw = await storage.listDelays();
    let list = await Promise.all(raw.map(enrichDelay));
    if (year) list = list.filter((d) => yearOf(d.dateDown) === year);
    return list;
  }

  app.get("/api/rollups/dashboard", async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
    const assets = await storage.listAssets();
    const delays = await allEnriched(year);
    const rows = assets.map((a) => {
      const dels = delays.filter((d) => d.assetId === a.id);
      return {
        assetId: a.id, assetName: a.name, ratePerHour: a.ratePerHour,
        costCenter: a.costCenter, activityType: a.activityType,
        events: dels.length,
        downHours: dels.reduce((s, d) => s + (d.hours || 0), 0),
        cost: dels.reduce((s, d) => s + (d.cost || 0), 0),
        status: dels.some((d) => d.open) ? "DOWN" : "UP",
      };
    });
    // top operators by downtime hours
    const opMap = new Map<string, { name: string; hours: number; events: number }>();
    for (const d of delays) {
      if (!d.employeeName) continue;
      const cur = opMap.get(d.employeeName) || { name: d.employeeName, hours: 0, events: 0 };
      cur.hours += d.hours || 0;
      cur.events += 1;
      opMap.set(d.employeeName, cur);
    }
    const topOperators = [...opMap.values()].sort((a, b) => b.hours - a.hours).slice(0, 5);
    const totals = {
      ytdCost: rows.reduce((s, r) => s + r.cost, 0),
      totalHours: rows.reduce((s, r) => s + r.downHours, 0),
      totalEvents: rows.reduce((s, r) => s + r.events, 0),
      assetsDownNow: rows.filter((r) => r.status === "DOWN").length,
      assetCount: assets.length,
    };
    res.json({ rows, totals, topOperators });
  });

  app.get("/api/rollups/weekly", async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
    const delays = await allEnriched(year);
    const rows = [] as any[];
    for (let w = 1; w <= 53; w++) {
      const start = weekStart(year, w);
      const end = new Date(start.getTime() + 6 * 86400000);
      const dels = delays.filter((d) => { const iw = isoWeek(d.dateDown); return iw.week === w && iw.year === year; });
      rows.push({
        week: w, weekStart: fmtDate(start), weekEnd: fmtDate(end),
        events: dels.length,
        downHours: dels.reduce((s, d) => s + (d.hours || 0), 0),
        cost: dels.reduce((s, d) => s + (d.cost || 0), 0),
      });
    }
    res.json(rows);
  });

  app.get("/api/rollups/by-reason", async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
    const delays = await allEnriched(year);
    const reasons = await storage.listReasons();
    const rows = reasons.map((r) => {
      const dels = delays.filter((d) => d.reasonId === r.id);
      return {
        reasonId: r.id, reasonEn: r.labelEn, reasonEs: r.labelEs,
        events: dels.length,
        downHours: dels.reduce((s, d) => s + (d.hours || 0), 0),
        cost: dels.reduce((s, d) => s + (d.cost || 0), 0),
      };
    });
    res.json(rows);
  });

  // ---- ADMIN passwords (Plant Manager only) ----
  app.post("/api/admin/passwords", requireRole("plant_manager"), async (req, res) => {
    const { operatorPassword, prodPassword, plantPassword } = req.body || {};
    if (operatorPassword) await storage.setSetting("operator_pw_hash", bcrypt.hashSync(operatorPassword, 10));
    if (prodPassword) await storage.setSetting("prod_pw_hash", bcrypt.hashSync(prodPassword, 10));
    if (plantPassword) await storage.setSetting("plant_pw_hash", bcrypt.hashSync(plantPassword, 10));
    res.json({ ok: true });
  });

  // ---- SCHEDULE (working hours) ----
  app.get("/api/schedule", async (_req, res) => res.json(await storage.listSchedule()));
  app.patch("/api/schedule/:dow", requireRole("plant_manager"), async (req, res) => {
    const dow = parseInt(req.params.dow, 10);
    const patch: { hours?: number; startHour?: number } = {};
    if (req.body.hours !== undefined) patch.hours = Math.max(0, Number(req.body.hours));
    if (req.body.startHour !== undefined) patch.startHour = Math.min(23.5, Math.max(0, Number(req.body.startHour)));
    const s = await storage.updateSchedule(dow, patch);
    (storage as any).invalidateScheduleCache?.();
    if (!s) return res.status(404).json({ message: "Schedule row not found." });
    res.json(s);
  });

  // ---- HOLIDAYS (Prod + Plant can edit) ----
  app.get("/api/holidays", async (req, res) => {
    let list = await storage.listHolidays();
    if (req.query.year) {
      const y = String(req.query.year);
      list = list.filter((h) => h.date.slice(0, 4) === y);
    }
    list.sort((a, b) => (a.date < b.date ? -1 : 1));
    res.json(list);
  });
  app.post("/api/holidays", requireRole(MANAGERS), async (req, res) => {
    const date = (req.body?.date || "").trim();
    const labelEs = (req.body?.labelEs || "").trim();
    let labelEn = (req.body?.labelEn || "").trim();
    if (!date) return res.status(400).json({ message: "Date required." });
    if (!labelEs && !labelEn) return res.status(400).json({ message: "A label is required." });
    if (!labelEn) labelEn = labelEs;
    const created = await storage.createHoliday({ date, labelEn, labelEs: labelEs || labelEn });
    (storage as any).invalidateScheduleCache?.();
    res.status(201).json(created);
  });
  app.patch("/api/holidays/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch: any = {};
    if (req.body.date !== undefined) patch.date = String(req.body.date);
    if (req.body.labelEn !== undefined) patch.labelEn = String(req.body.labelEn);
    if (req.body.labelEs !== undefined) patch.labelEs = String(req.body.labelEs);
    const h = await storage.updateHoliday(id, patch);
    (storage as any).invalidateScheduleCache?.();
    if (!h) return res.status(404).json({ message: "Holiday not found." });
    res.json(h);
  });
  app.delete("/api/holidays/:id", requireRole(MANAGERS), async (req, res) => {
    await storage.deleteHoliday(parseInt(req.params.id, 10));
    (storage as any).invalidateScheduleCache?.();
    res.json({ ok: true });
  });

  // ---- DLH % (Plant Manager only to edit) ----
  app.get("/api/settings/dlh", async (_req, res) => res.json({ dlhPercent: await storage.getDlhPercent() }));
  app.post("/api/settings/dlh", requireRole("plant_manager"), async (req, res) => {
    let v = Number(req.body?.dlhPercent);
    if (isNaN(v)) return res.status(400).json({ message: "dlhPercent must be a number." });
    v = Math.min(100, Math.max(0, v));
    await storage.setDlhPercent(v);
    res.json({ dlhPercent: v });
  });

  // ---- EXCEL EXPORT ----
  app.get("/api/export/excel", requireRole(MANAGERS), async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : new Date().getFullYear();
    const assets = await storage.listAssets();
    const reasons = await storage.listReasons();
    const employees = await storage.listEmployees();
    const delays = (await allEnriched(year)).slice().sort((a, b) => (a.dateDown + a.timeDown > b.dateDown + b.timeDown ? 1 : -1));
    const wb = new ExcelJS.Workbook();
    wb.creator = "Asset Downtime Tracker";
    const HEAD = { bold: true } as const;

    const dash = wb.addWorksheet("DASHBOARD");
    dash.addRow([`Per-Asset Dashboard — ${year}`]);
    dash.addRow([]);
    dash.addRow(["Asset #", "# Events", "Down Hours", "Cost", "Status"]);
    dash.getRow(3).font = HEAD;
    for (const a of assets) {
      const dels = delays.filter((d) => d.assetId === a.id);
      dash.addRow([a.name, dels.length, Number(dels.reduce((s, d) => s + (d.hours || 0), 0).toFixed(2)),
        Number(dels.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2)), dels.some((d) => d.open) ? "DOWN" : "UP"]);
    }
    dash.columns.forEach((c, i) => (c.width = i === 0 ? 34 : 14));

    const del = wb.addWorksheet("ASSET DELAY");
    del.addRow([`Asset Delay Log — ${year}`]);
    del.addRow([]);
    del.addRow(["Company:", "ANDRITZ METALS — V403 South Holland, IL", "", "Year Filter:", year]);
    del.addRow(["Date:", fmtDate(new Date()), "", "YTD Total Cost:", Number(delays.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2))]);
    del.addRow(["", "", "", "ASSET DOWN", "", "ASSET RUNNING", "", "Down Time"]);
    del.addRow(["ASSET #", "REASON", "Description", "Operator", "Shift", "DATE", "TIME", "DATE2", "TIME2", "Days", "Hours", "$/hr", "Cost"]);
    del.getRow(6).font = HEAD;
    for (const d of delays) {
      del.addRow([d.assetName, d.reasonLabelEn, d.description, d.employeeName, d.shift || "",
        d.dateDown, d.timeDown, d.dateUp || "", d.timeUp || "",
        d.hours !== null ? Number((d.hours / 24).toFixed(3)) : "",
        d.hours !== null ? Number(d.hours.toFixed(2)) : "", d.ratePerHour,
        d.cost !== null ? Number(d.cost.toFixed(2)) : ""]);
    }
    del.columns.forEach((c, i) => (c.width = i === 0 ? 30 : i === 2 ? 28 : 12));

    const wk = wb.addWorksheet("WEEKLY");
    wk.addRow([`Weekly Downtime — ${year}`]);
    wk.addRow([]);
    wk.addRow(["Week", "Week Start", "Week End", "# Events", "Down Hours", "Cost"]);
    wk.getRow(3).font = HEAD;
    for (let w = 1; w <= 53; w++) {
      const start = weekStart(year, w);
      const end = new Date(start.getTime() + 6 * 86400000);
      const dels = delays.filter((d) => { const iw = isoWeek(d.dateDown); return iw.week === w && iw.year === year; });
      wk.addRow([w, fmtDate(start), fmtDate(end), dels.length,
        Number(dels.reduce((s, d) => s + (d.hours || 0), 0).toFixed(2)),
        Number(dels.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2))]);
    }
    wk.columns.forEach((c) => (c.width = 14));

    const br = wb.addWorksheet("BY REASON");
    br.addRow([`Downtime by Reason — ${year}`]);
    br.addRow([]);
    br.addRow(["Reason", "Reason (ES)", "# Events", "Down Hours", "Cost"]);
    br.getRow(3).font = HEAD;
    for (const r of reasons) {
      const dels = delays.filter((d) => d.reasonId === r.id);
      br.addRow([r.labelEn, r.labelEs, dels.length,
        Number(dels.reduce((s, d) => s + (d.hours || 0), 0).toFixed(2)),
        Number(dels.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2))]);
    }
    br.columns.forEach((c, i) => (c.width = i < 2 ? 26 : 14));

    const gr = wb.addWorksheet("GREEN_RED");
    gr.addRow(["Asset Status Board"]);
    gr.addRow(["Legend:", "UP = Running   |   DOWN = Down"]);
    gr.addRow([]);
    gr.addRow(["Status", "Asset #"]);
    gr.getRow(4).font = HEAD;
    for (const a of assets) {
      const dels = delays.filter((d) => d.assetId === a.id);
      gr.addRow([dels.some((d) => d.open) ? "DOWN" : "UP", a.name]);
    }
    gr.columns.forEach((c, i) => (c.width = i === 0 ? 10 : 34));

    const am = wb.addWorksheet("ASSET");
    am.addRow(["Asset Master List"]);
    am.addRow(["Asset #", "$ / Hour Down", "Cost Center", "Activity Type", "Active"]);
    am.getRow(2).font = HEAD;
    for (const a of assets) am.addRow([a.name, a.ratePerHour, a.costCenter, a.activityType, a.active ? "Yes" : "No"]);
    am.columns.forEach((c, i) => (c.width = i === 0 ? 34 : 16));

    const em = wb.addWorksheet("OPERATORS");
    em.addRow(["Operator Roster & Assignments"]);
    em.addRow(["Operator", "Active", "Asset (Shift)"]);
    em.getRow(2).font = HEAD;
    const asg = await storage.listAssignments();
    for (const e of employees) {
      const mine = asg.filter((a) => a.employeeId === e.id)
        .map((a) => `${assets.find((x) => x.id === a.assetId)?.code || "?"} (S${a.shift})`).join(", ");
      em.addRow([e.name, e.active ? "Yes" : "No", mine]);
    }
    em.columns.forEach((c, i) => (c.width = i === 0 ? 22 : i === 2 ? 30 : 10));

    const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const sc = wb.addWorksheet("SCHEDULE");
    sc.addRow(["Working-Hour Schedule"]);
    sc.addRow([`DLH %: ${await storage.getDlhPercent()}   (cost = chargeable hours × DLH% × rate)`]);
    sc.addRow([]);
    sc.addRow(["Day", "Scheduled Hours", "Start Hour (24h)", "Window"]);
    sc.getRow(4).font = HEAD;
    const schedRows = await storage.listSchedule();
    for (const s of schedRows) {
      const startH = Math.floor(s.startHour);
      const startM = Math.round((s.startHour - startH) * 60);
      const endHour = s.startHour + s.hours;
      const endH = Math.floor(endHour);
      const endM = Math.round((endHour - endH) * 60);
      const win = s.hours > 0 ? `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}–${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}` : "—";
      sc.addRow([DOW_NAMES[s.dow], s.hours, s.startHour, win]);
    }
    sc.addRow(["Weekly total", schedRows.reduce((t, s) => t + s.hours, 0)]);
    sc.columns.forEach((c, i) => (c.width = i === 0 ? 16 : 18));

    const hl = wb.addWorksheet("HOLIDAYS");
    hl.addRow(["Holidays (non-working)"]);
    hl.addRow([]);
    hl.addRow(["Date", "Holiday (EN)", "Holiday (ES)"]);
    hl.getRow(3).font = HEAD;
    for (const h of await storage.listHolidays()) hl.addRow([h.date, h.labelEn, h.labelEs]);
    hl.columns.forEach((c, i) => (c.width = i === 0 ? 14 : 30));

    const ls = wb.addWorksheet("LISTS");
    ls.addRow(["Reason (EN)", "Reason (ES)"]);
    ls.getRow(1).font = HEAD;
    for (const r of reasons) ls.addRow([r.labelEn, r.labelEs]);
    ls.columns.forEach((c) => (c.width = 26));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="asset-downtime-${year}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  });

  // ---- SAFETY CONCERNS ----
  // PUBLIC list of OPEN (unresponded) concerns for the TV. No PII (contact info) is returned.
  app.get("/api/safety/open-concerns", async (_req, res) => {
    const list = await storage.listSafetyConcerns();
    const items = list
      .filter((c) => c.status === "open" && !(c.response && c.response.trim()))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((c) => ({
        id: c.id,
        message: c.message,
        submitterName: c.submitterName || "",
        createdAt: c.createdAt,
      }));
    res.json(items);
  });
  // PUBLIC list of last N responded concerns for the TV (before the gated list).
  app.get("/api/safety/recent-responses", async (_req, res) => {
    const list = await storage.recentRespondedConcerns(3);
    const items = list.map((c) => ({
      id: c.id,
      message: c.message,
      response: c.response,
      respondedBy: c.respondedBy,
      respondedAt: c.respondedAt,
      status: c.status,
    }));
    res.json(items);
  });
  // Full list — Plant/Production only.
  app.get("/api/safety/concerns", requireRole(MANAGERS), async (_req, res) => {
    res.json(await storage.listSafetyConcerns());
  });
  // PUBLIC submission (no auth). Rate-limited per IP.
  app.post("/api/safety/concerns", async (req, res) => {
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    if (!safetyRateOk(ip)) {
      return res.status(429).json({ message: "Too many submissions. Please try again later. / Demasiados env\u00edos. Intente m\u00e1s tarde." });
    }
    const message = (req.body?.message || "").toString().trim();
    if (message.length < 10) return res.status(400).json({ message: "Message must be at least 10 characters." });
    if (message.length > 1000) return res.status(400).json({ message: "Message must be 1000 characters or fewer." });
    const created = await storage.createSafetyConcern({
      message,
      submitterName: (req.body?.submitterName || "").toString().trim().slice(0, 120),
      submitterContact: (req.body?.submitterContact || "").toString().trim().slice(0, 200),
      response: "",
      respondedBy: "",
      status: "open",
      createdAt: new Date().toISOString(),
      respondedAt: "",
    });
    res.status(201).json({ id: created.id, ok: true });
  });
  app.patch("/api/safety/concerns/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getSafetyConcern(id);
    if (!existing) return res.status(404).json({ message: "Concern not found." });
    const patch: any = {};
    if (req.body.response !== undefined) patch.response = String(req.body.response);
    if (req.body.respondedBy !== undefined) patch.respondedBy = String(req.body.respondedBy);
    if (req.body.status !== undefined) {
      const s = String(req.body.status);
      patch.status = ["open", "reviewed", "closed"].includes(s) ? s : existing.status;
    }
    // Stamp respondedAt the first time a non-empty response is saved.
    if (patch.response && patch.response.trim() && !existing.respondedAt) {
      patch.respondedAt = new Date().toISOString();
    }
    const c = await storage.updateSafetyConcern(id, patch);
    res.json(c);
  });
  app.delete("/api/safety/concerns/:id", requireRole("plant_manager"), async (req, res) => {
    await storage.deleteSafetyConcern(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });

  // ---- BIRTHDAYS ----
  app.get("/api/birthdays", async (_req, res) => res.json(await storage.listBirthdays()));
  app.get("/api/birthdays/upcoming", async (_req, res) => res.json(await storage.getUpcomingBirthdays(30)));
  // NOTE: photo upload disabled (no persistent filesystem on Vercel) — see TODO at top of file.
  app.post("/api/birthdays", requireRole(MANAGERS), memoryUpload.single("photo"), async (req, res) => {
    const name = (req.body?.name || "").toString().trim();
    const month = Number(req.body?.month);
    const day = Number(req.body?.day);
    if (!name) return res.status(400).json({ message: "Name required." });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ message: "Month must be 1-12." });
    if (!(day >= 1 && day <= 31)) return res.status(400).json({ message: "Day must be 1-31." });
    const created = await storage.createBirthday({
      name, month, day,
      photoPath: "", // uploads disabled in this deployment — see TODO above
    });
    res.status(201).json(created);
  });
  app.patch("/api/birthdays/:id", requireRole(MANAGERS), memoryUpload.single("photo"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getBirthday(id);
    if (!existing) return res.status(404).json({ message: "Birthday not found." });
    const patch: any = {};
    if (req.body.name !== undefined) patch.name = String(req.body.name).trim();
    if (req.body.month !== undefined) patch.month = Number(req.body.month);
    if (req.body.day !== undefined) patch.day = Number(req.body.day);
    // Photo uploads disabled in this deployment — see TODO above. Existing
    // photoPath (if any) is left untouched.
    const b = await storage.updateBirthday(id, patch);
    res.json(b);
  });
  app.delete("/api/birthdays/:id", requireRole("plant_manager"), async (req, res) => {
    await storage.deleteBirthday(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });

  // ---- DISTRESS ALERTS (panic button) ----
  // Replaced the WebSocket/SSE broadcaster with plain DB-backed polling.
  // The client polls GET /api/distress/active every ~10s (see
  // distress-broadcaster.tsx) instead of holding an EventSource/WS open.

  // Non-stream fetch used for polling. Kept at the same path as the old
  // fallback endpoint so the client didn't need a new route.
  app.get("/api/distress/active", async (_req, res) => {
    res.json(await storage.listActiveDistressAlerts());
  });

  // Full history — managers only.
  app.get("/api/distress", requireRole(MANAGERS), async (_req, res) => {
    res.json(await storage.listDistressAlerts());
  });

  // PUBLIC create. No auth so an operator in distress doesn't need to sign in.
  app.post("/api/distress", async (req, res) => {
    const reason = String(req.body?.reason || "other").toLowerCase();
    const allowed = ["medical", "injury", "fire", "equipment", "other"];
    const reasonOk = allowed.includes(reason) ? reason : "other";
    const location = String(req.body?.location || "").trim().slice(0, 120);
    const reporter = String(req.body?.reporter || "").trim().slice(0, 80);
    const created = await storage.createDistressAlert({ reason: reasonOk, location, reporter });
    res.status(201).json(created);
  });

  // Acknowledge — signed-in user claims they are responding. Any logged-in role can respond.
  app.post("/api/distress/:id/respond", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getDistressAlert(id);
    if (!existing) return res.status(404).json({ message: "Alert not found." });
    if (existing.status === "resolved") return res.status(400).json({ message: "Alert already resolved." });
    const responderName = String(req.body?.responderName || req.session?.role || "responder").trim().slice(0, 80);
    const updated = await storage.respondDistressAlert(id, responderName);
    res.json(updated);
  });

  // Resolve — mark cleared, optionally with a note.
  app.post("/api/distress/:id/resolve", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getDistressAlert(id);
    if (!existing) return res.status(404).json({ message: "Alert not found." });
    if (existing.status === "resolved") return res.json(existing);
    const note = String(req.body?.note || "").trim().slice(0, 500);
    const responderName = String(req.body?.responderName || req.session?.role || "responder").trim().slice(0, 80);
    const updated = await storage.resolveDistressAlert(id, note, responderName);
    res.json(updated);
  });

  // ---- TOOLBOX TALK ----
  app.get("/api/toolbox", async (_req, res) => res.json((await storage.getToolboxTalk()) || null));
  // NOTE: image upload disabled (no persistent filesystem on Vercel) — see TODO at top of file.
  app.put("/api/toolbox", requireRole(MANAGERS), memoryUpload.single("image"), async (req, res) => {
    const patch: any = { updatedAt: new Date().toISOString() };
    if (req.body.title !== undefined) patch.title = String(req.body.title);
    if (req.body.presenter !== undefined) patch.presenter = String(req.body.presenter);
    if (req.body.notes !== undefined) patch.notes = String(req.body.notes);
    if (req.body.weekOf !== undefined) patch.weekOf = String(req.body.weekOf);
    // Image uploads disabled in this deployment — see TODO above. Existing
    // imagePath (if any) is left untouched.
    const tb = await storage.updateToolboxTalk(patch);
    res.json(tb);
  });

  return httpServer;
}
