"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// api/_src/index.ts
var import_express = __toESM(require("express"));
var import_express_session = __toESM(require("express-session"));
var import_connect_pg_simple = __toESM(require("connect-pg-simple"));
var import_pg = __toESM(require("pg"));

// server/routes.ts
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_exceljs = __toESM(require("exceljs"), 1);
var import_multer = __toESM(require("multer"), 1);

// shared/schema.ts
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  username: (0, import_pg_core.text)("username").notNull().unique(),
  password: (0, import_pg_core.text)("password").notNull(),
  role: (0, import_pg_core.text)("role").notNull().default("employee"),
  // 'employee' | 'admin'
  createdAt: (0, import_pg_core.text)("created_at").notNull().default("")
});
var settings = (0, import_pg_core.pgTable)("settings", {
  key: (0, import_pg_core.text)("key").primaryKey(),
  value: (0, import_pg_core.text)("value").notNull()
});
var assets = (0, import_pg_core.pgTable)("assets", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  code: (0, import_pg_core.text)("code").notNull().default(""),
  name: (0, import_pg_core.text)("name").notNull(),
  ratePerHour: (0, import_pg_core.real)("rate_per_hour").notNull().default(0),
  costCenter: (0, import_pg_core.text)("cost_center").notNull().default(""),
  activityType: (0, import_pg_core.text)("activity_type").notNull().default(""),
  active: (0, import_pg_core.integer)("active").notNull().default(1)
  // 1 = active, 0 = inactive
});
var employees = (0, import_pg_core.pgTable)("employees", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  active: (0, import_pg_core.integer)("active").notNull().default(1)
});
var assignments = (0, import_pg_core.pgTable)("assignments", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  assetId: (0, import_pg_core.integer)("asset_id").notNull(),
  shift: (0, import_pg_core.integer)("shift").notNull(),
  // 1 | 2
  employeeId: (0, import_pg_core.integer)("employee_id")
});
var reasons = (0, import_pg_core.pgTable)("reasons", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  labelEn: (0, import_pg_core.text)("label_en").notNull(),
  labelEs: (0, import_pg_core.text)("label_es").notNull()
});
var delays = (0, import_pg_core.pgTable)("delays", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  assetId: (0, import_pg_core.integer)("asset_id").notNull(),
  reasonId: (0, import_pg_core.integer)("reason_id"),
  description: (0, import_pg_core.text)("description").notNull().default(""),
  descriptionEs: (0, import_pg_core.text)("description_es").notNull().default(""),
  // auto-translated cache of description for the Spanish TV panel
  correctiveActionsEs: (0, import_pg_core.text)("corrective_actions_es").notNull().default(""),
  // auto-translated cache of corrective_actions
  dateDown: (0, import_pg_core.text)("date_down").notNull(),
  // YYYY-MM-DD
  timeDown: (0, import_pg_core.text)("time_down").notNull(),
  // HH:MM
  dateUp: (0, import_pg_core.text)("date_up"),
  // YYYY-MM-DD | null (open)
  timeUp: (0, import_pg_core.text)("time_up"),
  // HH:MM | null (open)
  shift: (0, import_pg_core.integer)("shift"),
  // 1 | 2
  employeeId: (0, import_pg_core.integer)("employee_id"),
  correctiveActions: (0, import_pg_core.text)("corrective_actions").notNull().default(""),
  photoPath: (0, import_pg_core.text)("photo_path"),
  createdByUser: (0, import_pg_core.text)("created_by_user").notNull().default(""),
  createdAt: (0, import_pg_core.text)("created_at").notNull().default("")
});
var schedule = (0, import_pg_core.pgTable)("schedule", {
  dow: (0, import_pg_core.integer)("dow").primaryKey(),
  // 0=Sun ... 6=Sat
  hours: (0, import_pg_core.real)("hours").notNull(),
  // scheduled hours that day
  startHour: (0, import_pg_core.real)("start_hour").notNull().default(6)
  // 24h clock, editable
});
var holidays = (0, import_pg_core.pgTable)("holidays", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  date: (0, import_pg_core.text)("date").notNull(),
  // YYYY-MM-DD
  labelEn: (0, import_pg_core.text)("label_en").notNull(),
  labelEs: (0, import_pg_core.text)("label_es").notNull()
});
var safetyConcerns = (0, import_pg_core.pgTable)("safety_concerns", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  concernType: (0, import_pg_core.text)("concern_type").notNull().default("safety"),
  // 'safety' | 'operations' | 'quality' | 'other'
  message: (0, import_pg_core.text)("message").notNull(),
  submitterName: (0, import_pg_core.text)("submitter_name").notNull().default(""),
  // optional; "" = anonymous
  submitterContact: (0, import_pg_core.text)("submitter_contact").notNull().default(""),
  // optional phone/email
  response: (0, import_pg_core.text)("response").notNull().default(""),
  // Bill/Frank response after Safety Team meeting
  respondedBy: (0, import_pg_core.text)("responded_by").notNull().default(""),
  status: (0, import_pg_core.text)("status").notNull().default("open"),
  // 'open' | 'reviewed' | 'closed'
  createdAt: (0, import_pg_core.text)("created_at").notNull().default(""),
  // ISO timestamp
  respondedAt: (0, import_pg_core.text)("responded_at").notNull().default("")
});
var birthdays = (0, import_pg_core.pgTable)("birthdays", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  month: (0, import_pg_core.integer)("month").notNull(),
  // 1-12
  day: (0, import_pg_core.integer)("day").notNull(),
  // 1-31
  photoPath: (0, import_pg_core.text)("photo_path").notNull().default("")
  // optional /uploads/birthdays/xxx.jpg
});
var toolboxTalk = (0, import_pg_core.pgTable)("toolbox_talk", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  noteType: (0, import_pg_core.text)("note_type").notNull().default("safety"),
  // 'safety' | 'visitor' | 'event' | 'reminder' | 'other'
  weekOf: (0, import_pg_core.text)("week_of").notNull().default(""),
  // YYYY-MM-DD (Monday of the week)
  title: (0, import_pg_core.text)("title").notNull().default(""),
  presenter: (0, import_pg_core.text)("presenter").notNull().default("Frank Eneman"),
  imagePath: (0, import_pg_core.text)("image_path").notNull().default(""),
  // /uploads/toolbox/xxx.jpg
  notes: (0, import_pg_core.text)("notes").notNull().default(""),
  updatedAt: (0, import_pg_core.text)("updated_at").notNull().default("")
});
var insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).pick({
  username: true,
  password: true,
  role: true
});
var insertAssetSchema = (0, import_drizzle_zod.createInsertSchema)(assets).omit({ id: true });
var insertReasonSchema = (0, import_drizzle_zod.createInsertSchema)(reasons).omit({ id: true });
var insertDelaySchema = (0, import_drizzle_zod.createInsertSchema)(delays).omit({ id: true });
var insertEmployeeSchema = (0, import_drizzle_zod.createInsertSchema)(employees).omit({ id: true });
var insertAssignmentSchema = (0, import_drizzle_zod.createInsertSchema)(assignments).omit({ id: true });
var insertScheduleSchema = (0, import_drizzle_zod.createInsertSchema)(schedule);
var insertHolidaySchema = (0, import_drizzle_zod.createInsertSchema)(holidays).omit({ id: true });
var insertSafetyConcernSchema = (0, import_drizzle_zod.createInsertSchema)(safetyConcerns).omit({ id: true });
var insertBirthdaySchema = (0, import_drizzle_zod.createInsertSchema)(birthdays).omit({ id: true });
var insertToolboxTalkSchema = (0, import_drizzle_zod.createInsertSchema)(toolboxTalk).omit({ id: true });
var distressAlerts = (0, import_pg_core.pgTable)("distress_alerts", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  reason: (0, import_pg_core.text)("reason").notNull().default("other"),
  // medical | injury | fire | equipment | other
  location: (0, import_pg_core.text)("location").notNull().default(""),
  reporter: (0, import_pg_core.text)("reporter").notNull().default(""),
  createdAt: (0, import_pg_core.text)("created_at").notNull().default(""),
  status: (0, import_pg_core.text)("status").notNull().default("active"),
  // active | responding | resolved
  responderName: (0, import_pg_core.text)("responder_name").notNull().default(""),
  respondedAt: (0, import_pg_core.text)("responded_at").notNull().default(""),
  resolvedAt: (0, import_pg_core.text)("resolved_at").notNull().default(""),
  resolutionNote: (0, import_pg_core.text)("resolution_note").notNull().default("")
});
var insertDistressAlertSchema = (0, import_drizzle_zod.createInsertSchema)(distressAlerts).omit({ id: true, createdAt: true });

// server/storage.ts
var import_neon_http = require("drizzle-orm/neon-http");
var import_serverless = require("@neondatabase/serverless");
var import_drizzle_orm = require("drizzle-orm");
var import_bcryptjs = __toESM(require("bcryptjs"), 1);

// server/schedule.ts
var MS_PER_HOUR = 1e3 * 60 * 60;
function pad(n) {
  return String(n).padStart(2, "0");
}
function localDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function computeChargeableHours(startISO, endISO, schedule2, holidayDates) {
  if (!startISO || !endISO) return 0;
  const startMs = startISO.getTime();
  const endMs = endISO.getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return 0;
  const byDow = /* @__PURE__ */ new Map();
  for (const s of schedule2) byDow.set(s.dow, { hours: s.hours, startHour: s.startHour });
  let total = 0;
  const cursor = new Date(startISO.getFullYear(), startISO.getMonth(), startISO.getDate());
  const lastDay = new Date(endISO.getFullYear(), endISO.getMonth(), endISO.getDate());
  while (cursor.getTime() <= lastDay.getTime()) {
    const dow = cursor.getDay();
    const dateStr = localDateStr(cursor);
    const sched = byDow.get(dow);
    const hoursScheduled = sched?.hours ?? 0;
    const startHour = sched?.startHour ?? 6;
    if (dow !== 0 && hoursScheduled > 0 && !holidayDates.has(dateStr)) {
      const windowStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      windowStart.setHours(0, 0, 0, 0);
      const winStartMs = windowStart.getTime() + startHour * MS_PER_HOUR;
      const winEndMs = winStartMs + hoursScheduled * MS_PER_HOUR;
      const overlapStart = Math.max(startMs, winStartMs);
      const overlapEnd = Math.min(endMs, winEndMs);
      if (overlapEnd > overlapStart) {
        total += (overlapEnd - overlapStart) / MS_PER_HOUR;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

// server/storage.ts
if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set \u2014 database calls will fail until it is configured in Vercel env vars.");
}
var sql = (0, import_serverless.neon)(process.env.DATABASE_URL || "");
var db = (0, import_neon_http.drizzle)(sql);
async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      rate_per_hour REAL NOT NULL DEFAULT 0,
      cost_center TEXT NOT NULL DEFAULT '',
      activity_type TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER NOT NULL,
      shift INTEGER NOT NULL,
      employee_id INTEGER
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reasons (
      id SERIAL PRIMARY KEY,
      label_en TEXT NOT NULL,
      label_es TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS delays (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER NOT NULL,
      reason_id INTEGER,
      description TEXT NOT NULL DEFAULT '',
      description_es TEXT NOT NULL DEFAULT '',
      corrective_actions_es TEXT NOT NULL DEFAULT '',
      date_down TEXT NOT NULL,
      time_down TEXT NOT NULL,
      date_up TEXT,
      time_up TEXT,
      shift INTEGER,
      employee_id INTEGER,
      corrective_actions TEXT NOT NULL DEFAULT '',
      photo_path TEXT,
      created_by_user TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS schedule (
      dow INTEGER PRIMARY KEY,
      hours REAL NOT NULL,
      start_hour REAL NOT NULL DEFAULT 6
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS holidays (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      label_en TEXT NOT NULL,
      label_es TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS safety_concerns (
      id SERIAL PRIMARY KEY,
      concern_type TEXT NOT NULL DEFAULT 'safety',
      message TEXT NOT NULL,
      submitter_name TEXT NOT NULL DEFAULT '',
      submitter_contact TEXT NOT NULL DEFAULT '',
      response TEXT NOT NULL DEFAULT '',
      responded_by TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT '',
      responded_at TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`ALTER TABLE safety_concerns ADD COLUMN IF NOT EXISTS concern_type TEXT NOT NULL DEFAULT 'safety'`;
  await sql`
    CREATE TABLE IF NOT EXISTS birthdays (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      month INTEGER NOT NULL,
      day INTEGER NOT NULL,
      photo_path TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS toolbox_talk (
      id SERIAL PRIMARY KEY,
      note_type TEXT NOT NULL DEFAULT 'safety',
      week_of TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      presenter TEXT NOT NULL DEFAULT 'Frank Eneman',
      image_path TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS distress_alerts (
      id SERIAL PRIMARY KEY,
      reason TEXT NOT NULL DEFAULT 'other',
      location TEXT NOT NULL DEFAULT '',
      reporter TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      responder_name TEXT NOT NULL DEFAULT '',
      responded_at TEXT NOT NULL DEFAULT '',
      resolved_at TEXT NOT NULL DEFAULT '',
      resolution_note TEXT NOT NULL DEFAULT ''
    )
  `;
  try {
    await sql`ALTER TABLE toolbox_talk ADD COLUMN IF NOT EXISTS presenter TEXT NOT NULL DEFAULT 'Frank Eneman'`;
  } catch (e) {
    console.warn("toolbox_talk presenter migration:", e);
  }
  try {
    await sql`ALTER TABLE toolbox_talk ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'safety'`;
  } catch (e) {
    console.warn("toolbox_talk note_type migration:", e);
  }
  try {
    await sql`ALTER TABLE delays ADD COLUMN IF NOT EXISTS description_es TEXT NOT NULL DEFAULT ''`;
    await sql`ALTER TABLE delays ADD COLUMN IF NOT EXISTS corrective_actions_es TEXT NOT NULL DEFAULT ''`;
  } catch (e) {
    console.warn("delays translation cache migration:", e);
  }
}
var STRAIGHT_RATE = 150.62;
var ROTARY_RATE = 125.59;
var STRAIGHT_CC = "CV492310";
var ROTARY_CC = "CV492320";
var ACTIVITY = "6034";
var SEED_ASSETS = [
  // Straight (flatbeds + curves) $150.62
  { code: "2654", name: "2654 Straight | Flatbed", ratePerHour: STRAIGHT_RATE, costCenter: STRAIGHT_CC, activityType: ACTIVITY, active: 1 },
  { code: "2555", name: "2555 Straight | Curve", ratePerHour: STRAIGHT_RATE, costCenter: STRAIGHT_CC, activityType: ACTIVITY, active: 1 },
  { code: "2655", name: "2655 Straight | Curve", ratePerHour: STRAIGHT_RATE, costCenter: STRAIGHT_CC, activityType: ACTIVITY, active: 1 },
  { code: "2659", name: "2659 Straight | Curve", ratePerHour: STRAIGHT_RATE, costCenter: STRAIGHT_CC, activityType: ACTIVITY, active: 1 },
  { code: "2661", name: "2661 Straight | Flatbed", ratePerHour: STRAIGHT_RATE, costCenter: STRAIGHT_CC, activityType: ACTIVITY, active: 1 },
  { code: "2662", name: "2662 Straight | Flatbed", ratePerHour: STRAIGHT_RATE, costCenter: STRAIGHT_CC, activityType: ACTIVITY, active: 1 },
  // Rotary (peripheral / rotating table) $125.59
  { code: "2603", name: "2603 Rotary | Slitter, SM", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2606", name: "2606 Rotary | Slitter, LG", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2607", name: "2607 Rotary | Scrap Chopper", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2619", name: "2619 Rotary | Rubber", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2627", name: "2627 Rotary | Rubber", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2618", name: "2618 Rotary | Flat Polisher", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2664", name: "2664 Rotary | Flat Polisher (2)", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2610", name: "2610 Rotary | Flat Blancher", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
  { code: "2658", name: "2658 Rotary | Mattison Slitter", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 }
];
var SEED_REASONS = [
  ["Mechanical", "Mec\xE1nico"],
  ["Electrical", "El\xE9ctrico"],
  ["Hydraulic", "Hidr\xE1ulico"],
  ["PLC/Controls", "PLC/Controles"],
  ["Tooling/Wheel Change", "Cambio de herramienta/rueda"],
  ["Operator", "Operador"],
  ["Material", "Material"],
  ["PM/Scheduled", "Mantenimiento programado"],
  ["Waiting Parts", "Esperando repuestos"],
  ["Other", "Otro"]
];
var SEED_EMPLOYEES = [
  "Ruiz Pablo",
  "Fonseca Arturo",
  "Munoz Manuel",
  "Munoz Juan",
  "Guzman Raul",
  "Plascencia Edgar",
  "Hudson Curtis",
  "Guzman Ramon",
  "Tejeda Jesus",
  "Tillman Michael",
  "Gutierrez Efrain",
  "Forbes Joe",
  "Ruiz Juan"
];
var SEED_ASSIGNMENTS = [
  ["2654", 1, "Ruiz Pablo"],
  ["2555", 1, "Fonseca Arturo"],
  ["2659", 1, "Munoz Manuel"],
  ["2661", 1, "Munoz Juan"],
  ["2661", 2, "Guzman Raul"],
  ["2662", 1, "Plascencia Edgar"],
  ["2603", 1, "Hudson Curtis"],
  ["2606", 1, "Guzman Ramon"],
  ["2607", 1, "Tejeda Jesus"],
  ["2619", 1, "Tillman Michael"],
  ["2627", 1, "Gutierrez Efrain"],
  ["2618", 1, "Forbes Joe"],
  ["2664", 2, "Guzman Raul"],
  ["2610", 2, "Ruiz Juan"]
];
var SEED_SCHEDULE = [
  [0, 0, 6],
  // Sun
  [1, 10, 6],
  // Mon
  [2, 10, 6],
  // Tue
  [3, 10, 6],
  // Wed
  [4, 10, 6],
  // Thu
  [5, 8, 6],
  // Fri
  [6, 4, 6]
  // Sat
];
var SEED_HOLIDAYS = [
  ["2026-01-01", "New Year's Day Observed", "A\xF1o Nuevo (Observado)"],
  ["2026-04-03", "Good Friday", "Viernes Santo"],
  ["2026-05-25", "Memorial Day", "D\xEDa de los Ca\xEDdos"],
  ["2026-07-03", "Independence Day", "D\xEDa de la Independencia"],
  ["2026-09-07", "Labor Day", "D\xEDa del Trabajo"],
  ["2026-11-26", "Thanksgiving Day", "D\xEDa de Acci\xF3n de Gracias"],
  ["2026-11-27", "Day after Thanksgiving", "D\xEDa despu\xE9s de Acci\xF3n de Gracias"],
  ["2026-12-24", "Christmas Eve Observed", "Nochebuena (Observada)"],
  ["2026-12-25", "Christmas Day", "Navidad"],
  ["2026-12-31", "New Year's Eve Observed", "Nochevieja (Observada)"]
];
var DEFAULT_DLH_PERCENT = "75";
var DEFAULT_OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || "15600";
var DEFAULT_PROD_PASSWORD = process.env.PROD_PASSWORD || "prod2026";
var DEFAULT_PLANT_PASSWORD = process.env.PLANT_PASSWORD || "plant2026";
var DatabaseStorage = class {
  async getSetting(key) {
    const rows = await db.select().from(settings).where((0, import_drizzle_orm.eq)(settings.key, key));
    return rows[0]?.value;
  }
  async setSetting(key, value) {
    const rows = await db.select().from(settings).where((0, import_drizzle_orm.eq)(settings.key, key));
    if (rows[0]) await db.update(settings).set({ value }).where((0, import_drizzle_orm.eq)(settings.key, key));
    else await db.insert(settings).values({ key, value });
  }
  async listAssets() {
    return db.select().from(assets).orderBy(assets.id);
  }
  async getAsset(id) {
    const rows = await db.select().from(assets).where((0, import_drizzle_orm.eq)(assets.id, id));
    return rows[0];
  }
  async getAssetByCode(code) {
    const rows = await db.select().from(assets).where((0, import_drizzle_orm.eq)(assets.code, code));
    return rows[0];
  }
  async createAsset(a) {
    const rows = await db.insert(assets).values(a).returning();
    return rows[0];
  }
  async updateAsset(id, patch) {
    await db.update(assets).set(patch).where((0, import_drizzle_orm.eq)(assets.id, id));
    return this.getAsset(id);
  }
  async deleteAsset(id) {
    await db.delete(assignments).where((0, import_drizzle_orm.eq)(assignments.assetId, id));
    await db.delete(assets).where((0, import_drizzle_orm.eq)(assets.id, id));
  }
  async listReasons() {
    return db.select().from(reasons).orderBy(reasons.id);
  }
  async createReason(r) {
    const rows = await db.insert(reasons).values(r).returning();
    return rows[0];
  }
  async getReason(id) {
    const rows = await db.select().from(reasons).where((0, import_drizzle_orm.eq)(reasons.id, id));
    return rows[0];
  }
  async updateReason(id, patch) {
    await db.update(reasons).set(patch).where((0, import_drizzle_orm.eq)(reasons.id, id));
    return this.getReason(id);
  }
  async deleteReason(id) {
    await db.delete(reasons).where((0, import_drizzle_orm.eq)(reasons.id, id));
  }
  async listDelays() {
    return db.select().from(delays).orderBy(delays.id);
  }
  async getDelay(id) {
    const rows = await db.select().from(delays).where((0, import_drizzle_orm.eq)(delays.id, id));
    return rows[0];
  }
  async createDelay(d) {
    const rows = await db.insert(delays).values(d).returning();
    return rows[0];
  }
  async updateDelay(id, patch) {
    await db.update(delays).set(patch).where((0, import_drizzle_orm.eq)(delays.id, id));
    return this.getDelay(id);
  }
  async deleteDelay(id) {
    await db.delete(delays).where((0, import_drizzle_orm.eq)(delays.id, id));
  }
  async listEmployees() {
    return db.select().from(employees).orderBy(employees.id);
  }
  async createEmployee(e) {
    const rows = await db.insert(employees).values(e).returning();
    return rows[0];
  }
  async updateEmployee(id, patch) {
    await db.update(employees).set(patch).where((0, import_drizzle_orm.eq)(employees.id, id));
    const rows = await db.select().from(employees).where((0, import_drizzle_orm.eq)(employees.id, id));
    return rows[0];
  }
  async deleteEmployee(id) {
    await db.delete(employees).where((0, import_drizzle_orm.eq)(employees.id, id));
  }
  async listAssignments() {
    return db.select().from(assignments).orderBy(assignments.id);
  }
  async findAssignment(assetId, shift) {
    const list = await this.listAssignments();
    return list.find((a) => a.assetId === assetId && a.shift === shift);
  }
  async upsertAssignment(assetId, shift, employeeId) {
    const existing = await this.findAssignment(assetId, shift);
    if (existing) {
      await db.update(assignments).set({ employeeId }).where((0, import_drizzle_orm.eq)(assignments.id, existing.id));
      const rows2 = await db.select().from(assignments).where((0, import_drizzle_orm.eq)(assignments.id, existing.id));
      return rows2[0];
    }
    const rows = await db.insert(assignments).values({ assetId, shift, employeeId }).returning();
    return rows[0];
  }
  async listSchedule() {
    return db.select().from(schedule).orderBy(schedule.dow);
  }
  async updateSchedule(dow, patch) {
    await db.update(schedule).set(patch).where((0, import_drizzle_orm.eq)(schedule.dow, dow));
    const rows = await db.select().from(schedule).where((0, import_drizzle_orm.eq)(schedule.dow, dow));
    return rows[0];
  }
  async listHolidays() {
    return db.select().from(holidays).orderBy(holidays.date);
  }
  async createHoliday(h) {
    const rows = await db.insert(holidays).values(h).returning();
    return rows[0];
  }
  async updateHoliday(id, patch) {
    await db.update(holidays).set(patch).where((0, import_drizzle_orm.eq)(holidays.id, id));
    const rows = await db.select().from(holidays).where((0, import_drizzle_orm.eq)(holidays.id, id));
    return rows[0];
  }
  async deleteHoliday(id) {
    await db.delete(holidays).where((0, import_drizzle_orm.eq)(holidays.id, id));
  }
  async getDlhPercent() {
    const v = await this.getSetting("dlh_percent");
    const n = v !== void 0 ? Number(v) : 75;
    return isNaN(n) ? 75 : n;
  }
  async setDlhPercent(v) {
    await this.setSetting("dlh_percent", String(v));
  }
  // ---- SAFETY CONCERNS ----
  async listSafetyConcerns() {
    return db.select().from(safetyConcerns).orderBy((0, import_drizzle_orm.desc)(safetyConcerns.id));
  }
  async getSafetyConcern(id) {
    const rows = await db.select().from(safetyConcerns).where((0, import_drizzle_orm.eq)(safetyConcerns.id, id));
    return rows[0];
  }
  async createSafetyConcern(input) {
    const rows = await db.insert(safetyConcerns).values(input).returning();
    return rows[0];
  }
  async updateSafetyConcern(id, patch) {
    await db.update(safetyConcerns).set(patch).where((0, import_drizzle_orm.eq)(safetyConcerns.id, id));
    return this.getSafetyConcern(id);
  }
  async deleteSafetyConcern(id) {
    await db.delete(safetyConcerns).where((0, import_drizzle_orm.eq)(safetyConcerns.id, id));
  }
  async recentRespondedConcerns(limit) {
    const list = await this.listSafetyConcerns();
    return list.filter((c) => c.response && c.response.trim().length > 0).sort((a, b) => a.respondedAt < b.respondedAt ? 1 : -1).slice(0, limit);
  }
  // ---- DISTRESS ALERTS (panic button) ----
  async listDistressAlerts() {
    return db.select().from(distressAlerts).orderBy((0, import_drizzle_orm.desc)(distressAlerts.id));
  }
  async listActiveDistressAlerts() {
    const list = await this.listDistressAlerts();
    return list.filter((a) => a.status !== "resolved");
  }
  async getDistressAlert(id) {
    const rows = await db.select().from(distressAlerts).where((0, import_drizzle_orm.eq)(distressAlerts.id, id));
    return rows[0];
  }
  async createDistressAlert(input) {
    const rows = await db.insert(distressAlerts).values({
      reason: input.reason || "other",
      location: input.location || "",
      reporter: input.reporter || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "active"
    }).returning();
    return rows[0];
  }
  async respondDistressAlert(id, responderName) {
    await db.update(distressAlerts).set({ status: "responding", responderName, respondedAt: (/* @__PURE__ */ new Date()).toISOString() }).where((0, import_drizzle_orm.eq)(distressAlerts.id, id));
    return this.getDistressAlert(id);
  }
  async resolveDistressAlert(id, note, responderName) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const existing = await this.getDistressAlert(id);
    const responder = existing?.responderName || responderName;
    await db.update(distressAlerts).set({
      status: "resolved",
      resolvedAt: now,
      resolutionNote: note || "",
      responderName: responder,
      respondedAt: existing?.respondedAt || now
    }).where((0, import_drizzle_orm.eq)(distressAlerts.id, id));
    return this.getDistressAlert(id);
  }
  // ---- BIRTHDAYS ----
  async listBirthdays() {
    return db.select().from(birthdays).orderBy(birthdays.month, birthdays.day);
  }
  async getBirthday(id) {
    const rows = await db.select().from(birthdays).where((0, import_drizzle_orm.eq)(birthdays.id, id));
    return rows[0];
  }
  async createBirthday(input) {
    const rows = await db.insert(birthdays).values(input).returning();
    return rows[0];
  }
  async updateBirthday(id, patch) {
    await db.update(birthdays).set(patch).where((0, import_drizzle_orm.eq)(birthdays.id, id));
    return this.getBirthday(id);
  }
  async deleteBirthday(id) {
    await db.delete(birthdays).where((0, import_drizzle_orm.eq)(birthdays.id, id));
  }
  async getBirthdaysNext7Days() {
    return this.getUpcomingBirthdays(7);
  }
  async getBirthdaysThisMonth() {
    const m = (/* @__PURE__ */ new Date()).getMonth() + 1;
    const list = await this.listBirthdays();
    return list.filter((b) => b.month === m);
  }
  // Upcoming within `days`, wrapping the year boundary. Sorted by nearest.
  async getUpcomingBirthdays(days) {
    const now = new Date(
      (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Chicago" })
    );
    const todayDoy = dayOfYear(now.getMonth() + 1, now.getDate(), now.getFullYear());
    const yearLen = isLeap(now.getFullYear()) ? 366 : 365;
    const list = await this.listBirthdays();
    return list.map((b) => {
      const bDoy = dayOfYear(b.month, b.day, now.getFullYear());
      let diff = bDoy - todayDoy;
      if (diff < 0) diff += yearLen;
      return { ...b, daysUntil: diff, isToday: diff === 0 };
    }).filter((b) => b.daysUntil <= days).sort((a, b) => a.daysUntil - b.daysUntil);
  }
  // ---- TOOLBOX TALK (single row id=1) ----
  async getToolboxTalk() {
    const rows = await db.select().from(toolboxTalk).where((0, import_drizzle_orm.eq)(toolboxTalk.id, 1));
    return rows[0];
  }
  async updateToolboxTalk(patch) {
    const existing = await this.getToolboxTalk();
    if (existing) {
      await db.update(toolboxTalk).set(patch).where((0, import_drizzle_orm.eq)(toolboxTalk.id, 1));
    } else {
      await db.insert(toolboxTalk).values({ ...patch });
    }
    return await this.getToolboxTalk();
  }
  // Per-request cache: schedule + holidays are pulled once, then reused.
  _schedCache = null;
  _holidayCache = null;
  _cacheStamp = 0;
  async ensureScheduleCache() {
    const now = Date.now();
    if (this._schedCache && this._holidayCache && now - this._cacheStamp < 2e3) return;
    const sched = await this.listSchedule();
    const hols = await this.listHolidays();
    this._schedCache = sched.map((s) => ({ dow: s.dow, hours: s.hours, startHour: s.startHour }));
    this._holidayCache = new Set(hols.map((h) => h.date));
    this._cacheStamp = now;
  }
  // Invalidate the cache after schedule/holiday edits.
  invalidateScheduleCache() {
    this._schedCache = null;
    this._holidayCache = null;
  }
  async getChargeableHours(d) {
    if (!d.dateUp || !d.timeUp) return 0;
    await this.ensureScheduleCache();
    const start = parseLocal(d.dateDown, d.timeDown);
    const end = parseLocal(d.dateUp, d.timeUp);
    if (!start || !end) return 0;
    return computeChargeableHours(start, end, this._schedCache, this._holidayCache);
  }
};
function isLeap(y) {
  return y % 4 === 0 && y % 100 !== 0 || y % 400 === 0;
}
function dayOfYear(month, day, year) {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let doy = cum[Math.max(0, Math.min(11, month - 1))] + day;
  if (month > 2 && isLeap(year)) doy += 1;
  return doy;
}
function parseLocal(date, time) {
  if (!date) return null;
  const t = time && time.length >= 4 ? time.slice(0, 5) : "00:00";
  const [y, mo, da] = date.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  if (!y || !mo || !da) return null;
  const d = new Date(y, mo - 1, da, h || 0, mi || 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}
var storage = new DatabaseStorage();
async function bootstrap() {
  await ensureTables();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if ((await storage.listAssets()).length === 0) {
    for (const a of SEED_ASSETS) await db.insert(assets).values(a);
  }
  if ((await storage.listReasons()).length === 0) {
    for (const [labelEn, labelEs] of SEED_REASONS) await db.insert(reasons).values({ labelEn, labelEs });
  }
  if ((await storage.listEmployees()).length === 0) {
    for (const name of SEED_EMPLOYEES) await db.insert(employees).values({ name, active: 1 });
  }
  if ((await storage.listAssignments()).length === 0) {
    const emps = await storage.listEmployees();
    for (const [code, shift, empName] of SEED_ASSIGNMENTS) {
      const asset = await storage.getAssetByCode(code);
      const emp = emps.find((e) => e.name === empName);
      if (asset) {
        await db.insert(assignments).values({ assetId: asset.id, shift, employeeId: emp?.id ?? null });
      }
    }
  }
  if ((await storage.listSchedule()).length === 0) {
    for (const [dow, hours, startHour] of SEED_SCHEDULE) await db.insert(schedule).values({ dow, hours, startHour });
  }
  if ((await storage.listHolidays()).length === 0) {
    for (const [date, labelEn, labelEs] of SEED_HOLIDAYS) await db.insert(holidays).values({ date, labelEn, labelEs });
  }
  if (await storage.getSetting("dlh_percent") === void 0) {
    await storage.setSetting("dlh_percent", DEFAULT_DLH_PERCENT);
  }
  if (!await storage.getSetting("operator_pw_hash")) {
    await storage.setSetting("operator_pw_hash", import_bcryptjs.default.hashSync(DEFAULT_OPERATOR_PASSWORD, 10));
  }
  if (!await storage.getSetting("prod_pw_hash")) {
    await storage.setSetting("prod_pw_hash", import_bcryptjs.default.hashSync(DEFAULT_PROD_PASSWORD, 10));
  }
  if (!await storage.getSetting("plant_pw_hash")) {
    await storage.setSetting("plant_pw_hash", import_bcryptjs.default.hashSync(DEFAULT_PLANT_PASSWORD, 10));
  }
  if (!await storage.getSetting("bootstrapped_at")) await storage.setSetting("bootstrapped_at", now);
  if ((await storage.listBirthdays()).length === 0) {
    await db.insert(birthdays).values({ name: "Bill Donovan", month: 1, day: 23, photoPath: "" });
  }
  if (!await storage.getToolboxTalk()) {
    await db.insert(toolboxTalk).values({ weekOf: "", title: "", presenter: "Frank Eneman", imagePath: "", notes: "", updatedAt: "" });
  }
}

// server/routes.ts
function parseDateTime(date, time) {
  if (!date) return null;
  const t = time && time.length >= 4 ? time.slice(0, 5) : "00:00";
  const ms = Date.parse(`${date}T${t}:00`);
  return isNaN(ms) ? null : ms;
}
function computeHours(d) {
  if (!d.dateUp || !d.timeUp) return null;
  const down = parseDateTime(d.dateDown, d.timeDown);
  const up = parseDateTime(d.dateUp, d.timeUp);
  if (down === null || up === null) return null;
  return (up - down) / (1e3 * 60 * 60);
}
function isoWeek(dateStr) {
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00Z");
  const target = new Date(d.getTime());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1e3));
  return { week, year: target.getUTCFullYear() };
}
function yearOf(dateStr) {
  return parseInt(dateStr.slice(0, 4), 10);
}
function weekStart(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4Day * 864e5);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * 864e5);
}
function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}
async function translateToSpanish(text2) {
  const trimmed = (text2 || "").trim();
  if (!trimmed) return "";
  const chunks = [];
  let buf = "";
  for (const part of trimmed.split(/(?<=[.!?。])\s+/)) {
    if ((buf + " " + part).length > 450) {
      if (buf) chunks.push(buf);
      buf = part;
    } else {
      buf = buf ? buf + " " + part : part;
    }
  }
  if (buf) chunks.push(buf);
  const results = [];
  for (const chunk of chunks) {
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|es`;
      const r = await fetch(url, { headers: { "User-Agent": "andritz-downtime/1.0" } });
      if (!r.ok) {
        results.push(chunk);
        continue;
      }
      const j = await r.json();
      const out = j?.responseData?.translatedText || chunk;
      results.push(String(out));
    } catch {
      results.push(chunk);
    }
  }
  return results.join(" ");
}
function requireAuth(req, res, next) {
  if (!req.session?.role) return res.status(401).json({ message: "Please sign in." });
  next();
}
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.session?.role) return res.status(401).json({ message: "Please sign in." });
    if (!allowed.includes(req.session.role))
      return res.status(403).json({ message: "You do not have permission for this action." });
    next();
  };
}
var MANAGERS = ["production_manager", "plant_manager"];
var memoryUpload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
var safetyRate = /* @__PURE__ */ new Map();
function safetyRateOk(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1e3;
  const hits = (safetyRate.get(ip) || []).filter((t) => now - t < windowMs);
  if (hits.length >= 5) {
    safetyRate.set(ip, hits);
    return false;
  }
  hits.push(now);
  safetyRate.set(ip, hits);
  return true;
}
async function registerRoutes(httpServer, app2) {
  await bootstrap();
  app2.set("trust proxy", 1);
  app2.post("/api/auth/login", (req, res) => {
    const { password, role } = req.body || {};
    if (!password) return res.status(400).json({ message: "Password required." });
    const map = {
      operator: "operator_pw_hash",
      production_manager: "prod_pw_hash",
      plant_manager: "plant_pw_hash"
    };
    const rolesToTry = role && map[role] ? [role] : ["plant_manager", "production_manager", "operator"];
    (async () => {
      for (const r of rolesToTry) {
        const hash = await storage.getSetting(map[r]);
        if (hash && import_bcryptjs2.default.compareSync(password, hash)) {
          req.session.role = r;
          if (!req.session.lang) req.session.lang = "en";
          return res.json({ role: r, lang: req.session.lang });
        }
      }
      return res.status(401).json({ message: "Incorrect password. Try again." });
    })().catch((e) => res.status(500).json({ message: e?.message || "Login failed." }));
  });
  app2.post("/api/auth/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
  app2.get("/api/auth/me", (req, res) => {
    if (!req.session?.role) return res.status(401).json({ message: "Not signed in." });
    res.json({ role: req.session.role, lang: req.session.lang || "en" });
  });
  app2.get("/api/prefs/lang", (req, res) => res.json({ lang: req.session?.lang || "en" }));
  app2.post("/api/prefs/lang", (req, res) => {
    const lang = req.body?.lang === "es" ? "es" : "en";
    req.session.lang = lang;
    res.json({ lang });
  });
  app2.get("/api/assets", async (_req, res) => res.json(await storage.listAssets()));
  app2.post("/api/assets", requireRole("plant_manager"), async (req, res) => {
    const code = String(req.body?.code || "").trim();
    const name = String(req.body?.name || "").trim();
    if (!code || !name) return res.status(400).json({ message: "Code and name required." });
    const existing = await storage.getAssetByCode(code);
    if (existing) return res.status(409).json({ message: `Asset code ${code} already exists.` });
    const created = await storage.createAsset({
      code,
      name,
      ratePerHour: req.body?.ratePerHour != null ? Number(req.body.ratePerHour) : 0,
      costCenter: String(req.body?.costCenter || ""),
      activityType: String(req.body?.activityType || ""),
      active: req.body?.active === false || req.body?.active === 0 ? 0 : 1
    });
    res.status(201).json(created);
  });
  app2.patch("/api/assets/:id", requireRole("plant_manager"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch = {};
    if (req.body.code !== void 0) {
      const newCode = String(req.body.code).trim();
      if (!newCode) return res.status(400).json({ message: "Code cannot be empty." });
      const clash = await storage.getAssetByCode(newCode);
      if (clash && clash.id !== id) return res.status(409).json({ message: `Asset code ${newCode} already exists.` });
      patch.code = newCode;
    }
    if (req.body.ratePerHour !== void 0) patch.ratePerHour = Number(req.body.ratePerHour);
    if (req.body.costCenter !== void 0) patch.costCenter = String(req.body.costCenter);
    if (req.body.activityType !== void 0) patch.activityType = String(req.body.activityType);
    if (req.body.name !== void 0) patch.name = String(req.body.name);
    if (req.body.active !== void 0) patch.active = req.body.active ? 1 : 0;
    const a = await storage.updateAsset(id, patch);
    if (!a) return res.status(404).json({ message: "Asset not found." });
    res.json(a);
  });
  app2.delete("/api/assets/:id", requireRole("plant_manager"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const asset = await storage.getAsset(id);
    if (!asset) return res.status(404).json({ message: "Asset not found." });
    const delayList = await storage.listDelays();
    const hasDelays = delayList.some((d) => d.assetId === id);
    if (hasDelays) return res.status(409).json({ message: "Cannot delete: asset has delay history. Deactivate instead." });
    await storage.deleteAsset(id);
    res.json({ ok: true, deleted: asset.name });
  });
  app2.post("/api/assets/preset", requireRole("plant_manager"), async (req, res) => {
    const { costCenter, ratePerHour } = req.body || {};
    if (!costCenter || ratePerHour === void 0) return res.status(400).json({ message: "costCenter and ratePerHour required." });
    let count = 0;
    for (const a of await storage.listAssets()) {
      if (a.costCenter === costCenter) {
        await storage.updateAsset(a.id, { ratePerHour: Number(ratePerHour) });
        count++;
      }
    }
    res.json({ updated: count });
  });
  app2.get("/api/reasons", async (_req, res) => res.json(await storage.listReasons()));
  app2.post("/api/reasons", requireRole(MANAGERS), async (req, res) => {
    const labelEs = (req.body?.labelEs || "").trim();
    let labelEn = (req.body?.labelEn || "").trim();
    if (!labelEs) return res.status(400).json({ message: "Spanish label required." });
    if (!labelEn) labelEn = labelEs;
    res.status(201).json(await storage.createReason({ labelEn, labelEs }));
  });
  app2.patch("/api/reasons/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch = {};
    if (req.body?.labelEn !== void 0) patch.labelEn = String(req.body.labelEn).trim();
    if (req.body?.labelEs !== void 0) patch.labelEs = String(req.body.labelEs).trim();
    const updated = await storage.updateReason(id, patch);
    if (!updated) return res.status(404).json({ message: "Reason not found." });
    res.json(updated);
  });
  app2.delete("/api/reasons/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const delayList = await storage.listDelays();
    if (delayList.some((d) => d.reasonId === id)) {
      return res.status(409).json({ message: "Cannot delete: reason has delay history." });
    }
    await storage.deleteReason(id);
    res.json({ ok: true });
  });
  app2.get("/api/employees", async (_req, res) => res.json(await storage.listEmployees()));
  app2.post("/api/employees", requireRole(MANAGERS), async (req, res) => {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name required." });
    res.status(201).json(await storage.createEmployee({ name, active: 1 }));
  });
  app2.patch("/api/employees/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch = {};
    if (req.body.name !== void 0) patch.name = String(req.body.name);
    if (req.body.active !== void 0) patch.active = req.body.active ? 1 : 0;
    const e = await storage.updateEmployee(id, patch);
    if (!e) return res.status(404).json({ message: "Employee not found." });
    res.json(e);
  });
  app2.delete("/api/employees/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const delayList = await storage.listDelays();
    if (delayList.some((d) => d.employeeId === id)) {
      return res.status(409).json({ message: "Cannot delete: employee has delay history. Set inactive instead." });
    }
    await storage.deleteEmployee(id);
    res.json({ ok: true });
  });
  app2.get("/api/assignments", async (_req, res) => res.json(await storage.listAssignments()));
  app2.post("/api/assignments", requireRole(MANAGERS), async (req, res) => {
    const { assetId, shift, employeeId } = req.body || {};
    if (!assetId || !shift) return res.status(400).json({ message: "assetId and shift required." });
    res.json(await storage.upsertAssignment(Number(assetId), Number(shift), employeeId ? Number(employeeId) : null));
  });
  app2.get("/api/assignments/resolve", async (req, res) => {
    const assetId = parseInt(String(req.query.assetId), 10);
    const shift = parseInt(String(req.query.shift), 10);
    const a = await storage.findAssignment(assetId, shift);
    res.json({ employeeId: a?.employeeId ?? null });
  });
  async function enrichDelay(d) {
    const asset = await storage.getAsset(d.assetId);
    const reason = d.reasonId ? await storage.getReason(d.reasonId) : null;
    const employeeList = d.employeeId ? await storage.listEmployees() : [];
    const employee = d.employeeId ? employeeList.find((e) => e.id === d.employeeId) : null;
    const open = !d.dateUp || !d.timeUp;
    const hoursRaw = computeHours(d);
    const chargeableHours = open ? null : await storage.getChargeableHours(d);
    const rate = asset?.ratePerHour ?? 0;
    const dlhPercent = await storage.getDlhPercent();
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
      cost,
      open
    };
  }
  app2.get("/api/delays", async (req, res) => {
    const raw = await storage.listDelays();
    let list = await Promise.all(raw.map(enrichDelay));
    if (req.query.open === "true") list = list.filter((d) => d.open);
    if (req.query.year) {
      const y = parseInt(String(req.query.year), 10);
      list = list.filter((d) => yearOf(d.dateDown) === y);
    }
    list.sort((a, b) => a.dateDown + a.timeDown < b.dateDown + b.timeDown ? 1 : -1);
    res.json(list);
  });
  app2.post("/api/delays", requireAuth, memoryUpload.single("photo"), async (req, res) => {
    const b = req.body || {};
    if (!b.assetId) return res.status(400).json({ message: "Asset required." });
    const now = /* @__PURE__ */ new Date();
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
      dateDown,
      timeDown,
      dateUp: null,
      timeUp: null,
      shift,
      employeeId,
      correctiveActions: "",
      photoPath: null,
      // uploads disabled in this deployment — see TODO above
      createdByUser: req.session.role || "",
      createdAt: now.toISOString()
    });
    res.status(201).json(await enrichDelay(created));
  });
  app2.patch("/api/delays/:id/close", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const now = /* @__PURE__ */ new Date();
    const patch = {
      dateUp: req.body?.dateUp || fmtDate(now),
      timeUp: req.body?.timeUp || now.toTimeString().slice(0, 5)
    };
    if (req.body?.correctiveActions !== void 0) patch.correctiveActions = req.body.correctiveActions;
    const d = await storage.updateDelay(id, patch);
    if (!d) return res.status(404).json({ message: "Delay not found." });
    res.json(await enrichDelay(d));
  });
  app2.patch("/api/delays/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getDelay(id);
    if (!existing) return res.status(404).json({ message: "Delay not found." });
    const role = req.session.role;
    if (role === "operator") {
      const isOpen = !existing.dateUp || !existing.timeUp;
      if (!isOpen) {
        return res.status(403).json({
          message: "This delay is closed. Ask a Production Manager to edit it. / Este paro est\xE1 cerrado. Pida al Gerente de Producci\xF3n que lo edite."
        });
      }
    }
    const patch = {};
    for (const k of ["assetId", "reasonId", "description", "dateDown", "timeDown", "dateUp", "timeUp", "correctiveActions", "shift", "employeeId"]) {
      if (req.body[k] !== void 0) patch[k] = req.body[k];
    }
    if (patch.assetId !== void 0) patch.assetId = Number(patch.assetId);
    if (patch.reasonId !== void 0) patch.reasonId = patch.reasonId ? Number(patch.reasonId) : null;
    if (patch.shift !== void 0) patch.shift = patch.shift ? Number(patch.shift) : null;
    if (patch.employeeId !== void 0) patch.employeeId = patch.employeeId ? Number(patch.employeeId) : null;
    if (patch.description !== void 0 && patch.description !== existing.description) {
      patch.descriptionEs = "";
    }
    if (patch.correctiveActions !== void 0 && patch.correctiveActions !== existing.correctiveActions) {
      patch.correctiveActionsEs = "";
    }
    const d = await storage.updateDelay(id, patch);
    if (!d) return res.status(404).json({ message: "Delay not found." });
    res.json(await enrichDelay(d));
  });
  app2.delete("/api/delays/:id", requireRole(MANAGERS), async (req, res) => {
    await storage.deleteDelay(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });
  app2.post("/api/delays/:id/translate", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getDelay(id);
    if (!existing) return res.status(404).json({ message: "Delay not found." });
    const patch = {};
    if (existing.description && !existing.descriptionEs) {
      patch.descriptionEs = await translateToSpanish(existing.description);
    }
    if (existing.correctiveActions && !existing.correctiveActionsEs) {
      patch.correctiveActionsEs = await translateToSpanish(existing.correctiveActions);
    }
    if (Object.keys(patch).length === 0) {
      return res.json(await enrichDelay(existing));
    }
    const d = await storage.updateDelay(id, patch);
    if (!d) return res.status(404).json({ message: "Delay not found." });
    res.json(await enrichDelay(d));
  });
  async function allEnriched(year) {
    const raw = await storage.listDelays();
    let list = await Promise.all(raw.map(enrichDelay));
    if (year) list = list.filter((d) => yearOf(d.dateDown) === year);
    return list;
  }
  app2.get("/api/rollups/dashboard", async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : (/* @__PURE__ */ new Date()).getFullYear();
    const assets2 = await storage.listAssets();
    const delays2 = await allEnriched(year);
    const rows = assets2.map((a) => {
      const dels = delays2.filter((d) => d.assetId === a.id);
      return {
        assetId: a.id,
        assetName: a.name,
        ratePerHour: a.ratePerHour,
        costCenter: a.costCenter,
        activityType: a.activityType,
        events: dels.length,
        downHours: dels.reduce((s, d) => s + (d.hours || 0), 0),
        cost: dels.reduce((s, d) => s + (d.cost || 0), 0),
        status: dels.some((d) => d.open) ? "DOWN" : "UP"
      };
    });
    const opMap = /* @__PURE__ */ new Map();
    for (const d of delays2) {
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
      assetCount: assets2.length
    };
    res.json({ rows, totals, topOperators });
  });
  app2.get("/api/rollups/weekly", async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : (/* @__PURE__ */ new Date()).getFullYear();
    const delays2 = await allEnriched(year);
    const rows = [];
    for (let w = 1; w <= 53; w++) {
      const start = weekStart(year, w);
      const end = new Date(start.getTime() + 6 * 864e5);
      const dels = delays2.filter((d) => {
        const iw = isoWeek(d.dateDown);
        return iw.week === w && iw.year === year;
      });
      rows.push({
        week: w,
        weekStart: fmtDate(start),
        weekEnd: fmtDate(end),
        events: dels.length,
        downHours: dels.reduce((s, d) => s + (d.hours || 0), 0),
        cost: dels.reduce((s, d) => s + (d.cost || 0), 0)
      });
    }
    res.json(rows);
  });
  app2.get("/api/rollups/by-reason", async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : (/* @__PURE__ */ new Date()).getFullYear();
    const delays2 = await allEnriched(year);
    const reasons2 = await storage.listReasons();
    const rows = reasons2.map((r) => {
      const dels = delays2.filter((d) => d.reasonId === r.id);
      return {
        reasonId: r.id,
        reasonEn: r.labelEn,
        reasonEs: r.labelEs,
        events: dels.length,
        downHours: dels.reduce((s, d) => s + (d.hours || 0), 0),
        cost: dels.reduce((s, d) => s + (d.cost || 0), 0)
      };
    });
    res.json(rows);
  });
  app2.post("/api/admin/passwords", requireRole("plant_manager"), async (req, res) => {
    const { operatorPassword, prodPassword, plantPassword } = req.body || {};
    if (operatorPassword) await storage.setSetting("operator_pw_hash", import_bcryptjs2.default.hashSync(operatorPassword, 10));
    if (prodPassword) await storage.setSetting("prod_pw_hash", import_bcryptjs2.default.hashSync(prodPassword, 10));
    if (plantPassword) await storage.setSetting("plant_pw_hash", import_bcryptjs2.default.hashSync(plantPassword, 10));
    res.json({ ok: true });
  });
  app2.get("/api/schedule", async (_req, res) => res.json(await storage.listSchedule()));
  app2.patch("/api/schedule/:dow", requireRole("plant_manager"), async (req, res) => {
    const dow = parseInt(req.params.dow, 10);
    const patch = {};
    if (req.body.hours !== void 0) patch.hours = Math.max(0, Number(req.body.hours));
    if (req.body.startHour !== void 0) patch.startHour = Math.min(23.5, Math.max(0, Number(req.body.startHour)));
    const s = await storage.updateSchedule(dow, patch);
    storage.invalidateScheduleCache?.();
    if (!s) return res.status(404).json({ message: "Schedule row not found." });
    res.json(s);
  });
  app2.get("/api/holidays", async (req, res) => {
    let list = await storage.listHolidays();
    if (req.query.year) {
      const y = String(req.query.year);
      list = list.filter((h) => h.date.slice(0, 4) === y);
    }
    list.sort((a, b) => a.date < b.date ? -1 : 1);
    res.json(list);
  });
  app2.post("/api/holidays", requireRole(MANAGERS), async (req, res) => {
    const date = (req.body?.date || "").trim();
    const labelEs = (req.body?.labelEs || "").trim();
    let labelEn = (req.body?.labelEn || "").trim();
    if (!date) return res.status(400).json({ message: "Date required." });
    if (!labelEs && !labelEn) return res.status(400).json({ message: "A label is required." });
    if (!labelEn) labelEn = labelEs;
    const created = await storage.createHoliday({ date, labelEn, labelEs: labelEs || labelEn });
    storage.invalidateScheduleCache?.();
    res.status(201).json(created);
  });
  app2.patch("/api/holidays/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const patch = {};
    if (req.body.date !== void 0) patch.date = String(req.body.date);
    if (req.body.labelEn !== void 0) patch.labelEn = String(req.body.labelEn);
    if (req.body.labelEs !== void 0) patch.labelEs = String(req.body.labelEs);
    const h = await storage.updateHoliday(id, patch);
    storage.invalidateScheduleCache?.();
    if (!h) return res.status(404).json({ message: "Holiday not found." });
    res.json(h);
  });
  app2.delete("/api/holidays/:id", requireRole(MANAGERS), async (req, res) => {
    await storage.deleteHoliday(parseInt(req.params.id, 10));
    storage.invalidateScheduleCache?.();
    res.json({ ok: true });
  });
  app2.get("/api/settings/dlh", async (_req, res) => res.json({ dlhPercent: await storage.getDlhPercent() }));
  app2.post("/api/settings/dlh", requireRole("plant_manager"), async (req, res) => {
    let v = Number(req.body?.dlhPercent);
    if (isNaN(v)) return res.status(400).json({ message: "dlhPercent must be a number." });
    v = Math.min(100, Math.max(0, v));
    await storage.setDlhPercent(v);
    res.json({ dlhPercent: v });
  });
  app2.get("/api/export/excel", requireRole(MANAGERS), async (req, res) => {
    const year = req.query.year ? parseInt(String(req.query.year), 10) : (/* @__PURE__ */ new Date()).getFullYear();
    const assets2 = await storage.listAssets();
    const reasons2 = await storage.listReasons();
    const employees2 = await storage.listEmployees();
    const delays2 = (await allEnriched(year)).slice().sort((a, b) => a.dateDown + a.timeDown > b.dateDown + b.timeDown ? 1 : -1);
    const wb = new import_exceljs.default.Workbook();
    wb.creator = "Asset Downtime Tracker";
    const HEAD = { bold: true };
    const dash = wb.addWorksheet("DASHBOARD");
    dash.addRow([`Per-Asset Dashboard \u2014 ${year}`]);
    dash.addRow([]);
    dash.addRow(["Asset #", "# Events", "Down Hours", "Cost", "Status"]);
    dash.getRow(3).font = HEAD;
    for (const a of assets2) {
      const dels = delays2.filter((d) => d.assetId === a.id);
      dash.addRow([
        a.name,
        dels.length,
        Number(dels.reduce((s, d) => s + (d.hours || 0), 0).toFixed(2)),
        Number(dels.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2)),
        dels.some((d) => d.open) ? "DOWN" : "UP"
      ]);
    }
    dash.columns.forEach((c, i) => c.width = i === 0 ? 34 : 14);
    const del = wb.addWorksheet("ASSET DELAY");
    del.addRow([`Asset Delay Log \u2014 ${year}`]);
    del.addRow([]);
    del.addRow(["Company:", "ANDRITZ METALS \u2014 V403 South Holland, IL", "", "Year Filter:", year]);
    del.addRow(["Date:", fmtDate(/* @__PURE__ */ new Date()), "", "YTD Total Cost:", Number(delays2.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2))]);
    del.addRow(["", "", "", "ASSET DOWN", "", "ASSET RUNNING", "", "Down Time"]);
    del.addRow(["ASSET #", "REASON", "Description", "Operator", "Shift", "DATE", "TIME", "DATE2", "TIME2", "Days", "Hours", "$/hr", "Cost"]);
    del.getRow(6).font = HEAD;
    for (const d of delays2) {
      del.addRow([
        d.assetName,
        d.reasonLabelEn,
        d.description,
        d.employeeName,
        d.shift || "",
        d.dateDown,
        d.timeDown,
        d.dateUp || "",
        d.timeUp || "",
        d.hours !== null ? Number((d.hours / 24).toFixed(3)) : "",
        d.hours !== null ? Number(d.hours.toFixed(2)) : "",
        d.ratePerHour,
        d.cost !== null ? Number(d.cost.toFixed(2)) : ""
      ]);
    }
    del.columns.forEach((c, i) => c.width = i === 0 ? 30 : i === 2 ? 28 : 12);
    const wk = wb.addWorksheet("WEEKLY");
    wk.addRow([`Weekly Downtime \u2014 ${year}`]);
    wk.addRow([]);
    wk.addRow(["Week", "Week Start", "Week End", "# Events", "Down Hours", "Cost"]);
    wk.getRow(3).font = HEAD;
    for (let w = 1; w <= 53; w++) {
      const start = weekStart(year, w);
      const end = new Date(start.getTime() + 6 * 864e5);
      const dels = delays2.filter((d) => {
        const iw = isoWeek(d.dateDown);
        return iw.week === w && iw.year === year;
      });
      wk.addRow([
        w,
        fmtDate(start),
        fmtDate(end),
        dels.length,
        Number(dels.reduce((s, d) => s + (d.hours || 0), 0).toFixed(2)),
        Number(dels.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2))
      ]);
    }
    wk.columns.forEach((c) => c.width = 14);
    const br = wb.addWorksheet("BY REASON");
    br.addRow([`Downtime by Reason \u2014 ${year}`]);
    br.addRow([]);
    br.addRow(["Reason", "Reason (ES)", "# Events", "Down Hours", "Cost"]);
    br.getRow(3).font = HEAD;
    for (const r of reasons2) {
      const dels = delays2.filter((d) => d.reasonId === r.id);
      br.addRow([
        r.labelEn,
        r.labelEs,
        dels.length,
        Number(dels.reduce((s, d) => s + (d.hours || 0), 0).toFixed(2)),
        Number(dels.reduce((s, d) => s + (d.cost || 0), 0).toFixed(2))
      ]);
    }
    br.columns.forEach((c, i) => c.width = i < 2 ? 26 : 14);
    const gr = wb.addWorksheet("GREEN_RED");
    gr.addRow(["Asset Status Board"]);
    gr.addRow(["Legend:", "UP = Running   |   DOWN = Down"]);
    gr.addRow([]);
    gr.addRow(["Status", "Asset #"]);
    gr.getRow(4).font = HEAD;
    for (const a of assets2) {
      const dels = delays2.filter((d) => d.assetId === a.id);
      gr.addRow([dels.some((d) => d.open) ? "DOWN" : "UP", a.name]);
    }
    gr.columns.forEach((c, i) => c.width = i === 0 ? 10 : 34);
    const am = wb.addWorksheet("ASSET");
    am.addRow(["Asset Master List"]);
    am.addRow(["Asset #", "$ / Hour Down", "Cost Center", "Activity Type", "Active"]);
    am.getRow(2).font = HEAD;
    for (const a of assets2) am.addRow([a.name, a.ratePerHour, a.costCenter, a.activityType, a.active ? "Yes" : "No"]);
    am.columns.forEach((c, i) => c.width = i === 0 ? 34 : 16);
    const em = wb.addWorksheet("OPERATORS");
    em.addRow(["Operator Roster & Assignments"]);
    em.addRow(["Operator", "Active", "Asset (Shift)"]);
    em.getRow(2).font = HEAD;
    const asg = await storage.listAssignments();
    for (const e of employees2) {
      const mine = asg.filter((a) => a.employeeId === e.id).map((a) => `${assets2.find((x) => x.id === a.assetId)?.code || "?"} (S${a.shift})`).join(", ");
      em.addRow([e.name, e.active ? "Yes" : "No", mine]);
    }
    em.columns.forEach((c, i) => c.width = i === 0 ? 22 : i === 2 ? 30 : 10);
    const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const sc = wb.addWorksheet("SCHEDULE");
    sc.addRow(["Working-Hour Schedule"]);
    sc.addRow([`DLH %: ${await storage.getDlhPercent()}   (cost = chargeable hours \xD7 DLH% \xD7 rate)`]);
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
      const win = s.hours > 0 ? `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}\u2013${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}` : "\u2014";
      sc.addRow([DOW_NAMES[s.dow], s.hours, s.startHour, win]);
    }
    sc.addRow(["Weekly total", schedRows.reduce((t, s) => t + s.hours, 0)]);
    sc.columns.forEach((c, i) => c.width = i === 0 ? 16 : 18);
    const hl = wb.addWorksheet("HOLIDAYS");
    hl.addRow(["Holidays (non-working)"]);
    hl.addRow([]);
    hl.addRow(["Date", "Holiday (EN)", "Holiday (ES)"]);
    hl.getRow(3).font = HEAD;
    for (const h of await storage.listHolidays()) hl.addRow([h.date, h.labelEn, h.labelEs]);
    hl.columns.forEach((c, i) => c.width = i === 0 ? 14 : 30);
    const ls = wb.addWorksheet("LISTS");
    ls.addRow(["Reason (EN)", "Reason (ES)"]);
    ls.getRow(1).font = HEAD;
    for (const r of reasons2) ls.addRow([r.labelEn, r.labelEs]);
    ls.columns.forEach((c) => c.width = 26);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="asset-downtime-${year}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  });
  app2.get("/api/safety/open-concerns", async (_req, res) => {
    const list = await storage.listSafetyConcerns();
    const items = list.filter((c) => c.status === "open" && !(c.response && c.response.trim())).sort((a, b) => a.createdAt < b.createdAt ? 1 : -1).map((c) => ({
      id: c.id,
      message: c.message,
      submitterName: c.submitterName || "",
      createdAt: c.createdAt
    }));
    res.json(items);
  });
  app2.get("/api/safety/recent-responses", async (_req, res) => {
    const list = await storage.recentRespondedConcerns(3);
    const items = list.map((c) => ({
      id: c.id,
      message: c.message,
      response: c.response,
      respondedBy: c.respondedBy,
      respondedAt: c.respondedAt,
      status: c.status
    }));
    res.json(items);
  });
  app2.get("/api/safety/concerns", requireRole(MANAGERS), async (_req, res) => {
    res.json(await storage.listSafetyConcerns());
  });
  app2.post("/api/safety/concerns", async (req, res) => {
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    if (!safetyRateOk(ip)) {
      return res.status(429).json({ message: "Too many submissions. Please try again later. / Demasiados env\xEDos. Intente m\xE1s tarde." });
    }
    const message = (req.body?.message || "").toString().trim();
    if (message.length < 10) return res.status(400).json({ message: "Message must be at least 10 characters." });
    if (message.length > 1e3) return res.status(400).json({ message: "Message must be 1000 characters or fewer." });
    const rawType = (req.body?.concernType || "safety").toString().toLowerCase();
    const concernType = ["safety", "operations", "quality", "other"].includes(rawType) ? rawType : "safety";
    const created = await storage.createSafetyConcern({
      concernType,
      message,
      submitterName: (req.body?.submitterName || "").toString().trim().slice(0, 120),
      submitterContact: (req.body?.submitterContact || "").toString().trim().slice(0, 200),
      response: "",
      respondedBy: "",
      status: "open",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      respondedAt: ""
    });
    res.status(201).json({ id: created.id, ok: true });
  });
  app2.patch("/api/safety/concerns/:id", requireRole(MANAGERS), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getSafetyConcern(id);
    if (!existing) return res.status(404).json({ message: "Concern not found." });
    const patch = {};
    if (req.body.response !== void 0) patch.response = String(req.body.response);
    if (req.body.respondedBy !== void 0) patch.respondedBy = String(req.body.respondedBy);
    if (req.body.status !== void 0) {
      const s = String(req.body.status);
      patch.status = ["open", "reviewed", "closed"].includes(s) ? s : existing.status;
    }
    if (patch.response && patch.response.trim() && !existing.respondedAt) {
      patch.respondedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    const c = await storage.updateSafetyConcern(id, patch);
    res.json(c);
  });
  app2.delete("/api/safety/concerns/:id", requireRole("plant_manager"), async (req, res) => {
    await storage.deleteSafetyConcern(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });
  app2.get("/api/birthdays", async (_req, res) => res.json(await storage.listBirthdays()));
  app2.get("/api/birthdays/upcoming", async (_req, res) => res.json(await storage.getUpcomingBirthdays(30)));
  app2.post("/api/birthdays", requireRole(MANAGERS), memoryUpload.single("photo"), async (req, res) => {
    const name = (req.body?.name || "").toString().trim();
    const month = Number(req.body?.month);
    const day = Number(req.body?.day);
    if (!name) return res.status(400).json({ message: "Name required." });
    if (!(month >= 1 && month <= 12)) return res.status(400).json({ message: "Month must be 1-12." });
    if (!(day >= 1 && day <= 31)) return res.status(400).json({ message: "Day must be 1-31." });
    const created = await storage.createBirthday({
      name,
      month,
      day,
      photoPath: ""
      // uploads disabled in this deployment — see TODO above
    });
    res.status(201).json(created);
  });
  app2.patch("/api/birthdays/:id", requireRole(MANAGERS), memoryUpload.single("photo"), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getBirthday(id);
    if (!existing) return res.status(404).json({ message: "Birthday not found." });
    const patch = {};
    if (req.body.name !== void 0) patch.name = String(req.body.name).trim();
    if (req.body.month !== void 0) patch.month = Number(req.body.month);
    if (req.body.day !== void 0) patch.day = Number(req.body.day);
    const b = await storage.updateBirthday(id, patch);
    res.json(b);
  });
  app2.delete("/api/birthdays/:id", requireRole("plant_manager"), async (req, res) => {
    await storage.deleteBirthday(parseInt(req.params.id, 10));
    res.json({ ok: true });
  });
  app2.get("/api/production-orders", async (_req, res) => {
    const rows = await sql`SELECT id, row_num as "rowNum", shop_status as "shopStatus", sales_order as "salesOrder", doc_date as "docDate", po_status as "poStatus", material_num as "materialNum", material_desc as "materialDesc", ship_to_party as "shipToParty", city, co, unit, qty, incoterms FROM production_orders ORDER BY id`;
    res.json(rows);
  });
  app2.post("/api/production-orders/import", requireRole(MANAGERS), async (req, res) => {
    const text2 = (req.body?.text || "").trim();
    if (!text2) return res.status(400).json({ message: "No paste content." });
    const lines = text2.split(/\r?\n/).filter((l) => l.trim());
    const parsed = [];
    for (const line of lines) {
      const cells = line.includes("	") ? line.split("	") : line.split(/\s{2,}/);
      if (cells.length < 8) continue;
      const first = cells[0].trim();
      const rowNum = /^\d+$/.test(first) ? parseInt(first, 10) : null;
      if (rowNum == null) continue;
      const shopStatus = (cells[1] || "").trim();
      if (!["IN PROCESS", "READY", "COMPLETE"].includes(shopStatus)) continue;
      parsed.push({
        rowNum,
        shopStatus,
        salesOrder: (cells[2] || "").trim(),
        docDate: (cells[3] || "").trim(),
        poStatus: (cells[4] || "").trim().toUpperCase(),
        materialNum: (cells[5] || "").trim(),
        materialDesc: (cells[6] || "").trim(),
        shipToParty: (cells[7] || "").trim(),
        city: (cells[8] || "").trim(),
        co: (cells[9] || "").trim(),
        unit: (cells[10] || "").trim(),
        qty: parseInt((cells[11] || "0").trim(), 10) || 0,
        incoterms: (cells[12] || "").trim()
      });
    }
    if (parsed.length === 0) return res.status(400).json({ message: "Could not parse any rows." });
    await sql`TRUNCATE production_orders RESTART IDENTITY`;
    for (const p of parsed) {
      await sql`INSERT INTO production_orders (row_num, shop_status, sales_order, doc_date, po_status, material_num, material_desc, ship_to_party, city, co, unit, qty, incoterms) VALUES (${p.rowNum}, ${p.shopStatus}, ${p.salesOrder}, ${p.docDate}, ${p.poStatus}, ${p.materialNum}, ${p.materialDesc}, ${p.shipToParty}, ${p.city}, ${p.co}, ${p.unit}, ${p.qty}, ${p.incoterms})`;
    }
    res.json({ ok: true, count: parsed.length });
  });
  app2.get("/api/otd", async (req, res) => {
    const year = parseInt(String(req.query.year || (/* @__PURE__ */ new Date()).getFullYear()), 10);
    const goalRow = await sql`SELECT goal_percent FROM otd_goals WHERE year=${year}`;
    const monthRows = await sql`SELECT month, percent FROM otd_monthly WHERE year=${year} ORDER BY month`;
    res.json({
      year,
      goal: goalRow[0]?.goal_percent != null ? Number(goalRow[0].goal_percent) : null,
      months: monthRows.map((r) => ({ month: r.month, percent: r.percent != null ? Number(r.percent) : null }))
    });
  });
  app2.post("/api/otd", requireRole(MANAGERS), async (req, res) => {
    const year = parseInt(String(req.body?.year || 0), 10);
    if (!year) return res.status(400).json({ message: "Year required." });
    const goal = req.body?.goal;
    const months = req.body?.months || [];
    if (goal == null) {
      await sql`DELETE FROM otd_goals WHERE year=${year}`;
    } else {
      await sql`INSERT INTO otd_goals (year, goal_percent) VALUES (${year}, ${Number(goal)}) ON CONFLICT (year) DO UPDATE SET goal_percent=EXCLUDED.goal_percent`;
    }
    for (const m of months) {
      if (m.month < 1 || m.month > 12) continue;
      if (m.percent == null) {
        await sql`DELETE FROM otd_monthly WHERE year=${year} AND month=${m.month}`;
      } else {
        await sql`INSERT INTO otd_monthly (year, month, percent) VALUES (${year}, ${m.month}, ${Number(m.percent)}) ON CONFLICT (year, month) DO UPDATE SET percent=EXCLUDED.percent`;
      }
    }
    res.json({ ok: true });
  });
  app2.get("/api/productivity", async (_req, res) => {
    const rows = await sql`SELECT * FROM productivity_kpi WHERE id=1`;
    const r = rows[0] || {};
    const n = (v) => v == null ? null : Number(v);
    res.json({
      target: n(r.target_percent) ?? 85,
      ytd: { ope: r.ytd_ope, planned: n(r.ytd_planned), confirmed: n(r.ytd_confirmed), productivity: n(r.ytd_productivity) },
      l30: { ope: r.l30_ope, planned: n(r.l30_planned), confirmed: n(r.l30_confirmed), productivity: n(r.l30_productivity) },
      l7: { ope: r.l7_ope, planned: n(r.l7_planned), confirmed: n(r.l7_confirmed), productivity: n(r.l7_productivity) },
      updatedAt: r.updated_at
    });
  });
  app2.post("/api/productivity", requireRole(MANAGERS), async (req, res) => {
    const b = req.body || {};
    const num = (v) => v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v);
    const target = num(b.target) ?? 85;
    const y = b.ytd || {}, m = b.l30 || {}, w = b.l7 || {};
    await sql`
      UPDATE productivity_kpi SET
        target_percent = ${target},
        ytd_ope = ${num(y.ope)}, ytd_planned = ${num(y.planned)}, ytd_confirmed = ${num(y.confirmed)}, ytd_productivity = ${num(y.productivity)},
        l30_ope = ${num(m.ope)}, l30_planned = ${num(m.planned)}, l30_confirmed = ${num(m.confirmed)}, l30_productivity = ${num(m.productivity)},
        l7_ope  = ${num(w.ope)}, l7_planned  = ${num(w.planned)}, l7_confirmed  = ${num(w.confirmed)}, l7_productivity  = ${num(w.productivity)},
        updated_at = ${(/* @__PURE__ */ new Date()).toISOString()}
      WHERE id = 1
    `;
    res.json({ ok: true });
  });
  app2.get("/api/distress/active", async (_req, res) => {
    res.json(await storage.listActiveDistressAlerts());
  });
  app2.get("/api/distress", requireRole(MANAGERS), async (_req, res) => {
    res.json(await storage.listDistressAlerts());
  });
  app2.post("/api/distress", async (req, res) => {
    const reason = String(req.body?.reason || "other").toLowerCase();
    const allowed = ["medical", "injury", "fire", "equipment", "other"];
    const reasonOk = allowed.includes(reason) ? reason : "other";
    const location = String(req.body?.location || "").trim().slice(0, 120);
    const reporter = String(req.body?.reporter || "").trim().slice(0, 80);
    const created = await storage.createDistressAlert({ reason: reasonOk, location, reporter });
    res.status(201).json(created);
  });
  app2.post("/api/distress/:id/respond", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getDistressAlert(id);
    if (!existing) return res.status(404).json({ message: "Alert not found." });
    if (existing.status === "resolved") return res.status(400).json({ message: "Alert already resolved." });
    const responderName = String(req.body?.responderName || req.session?.role || "responder").trim().slice(0, 80);
    const updated = await storage.respondDistressAlert(id, responderName);
    res.json(updated);
  });
  app2.post("/api/distress/:id/resolve", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = await storage.getDistressAlert(id);
    if (!existing) return res.status(404).json({ message: "Alert not found." });
    if (existing.status === "resolved") return res.json(existing);
    const note = String(req.body?.note || "").trim().slice(0, 500);
    const responderName = String(req.body?.responderName || req.session?.role || "responder").trim().slice(0, 80);
    const updated = await storage.resolveDistressAlert(id, note, responderName);
    res.json(updated);
  });
  app2.get("/api/toolbox", async (_req, res) => res.json(await storage.getToolboxTalk() || null));
  app2.put("/api/toolbox", requireRole(MANAGERS), async (req, res) => {
    const patch = { updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    if (req.body?.noteType !== void 0) {
      const nt = String(req.body.noteType).toLowerCase();
      patch.noteType = ["safety", "visitor", "event", "reminder", "other"].includes(nt) ? nt : "safety";
    }
    if (req.body?.title !== void 0) patch.title = String(req.body.title);
    if (req.body?.presenter !== void 0) patch.presenter = String(req.body.presenter);
    if (req.body?.notes !== void 0) patch.notes = String(req.body.notes);
    if (req.body?.weekOf !== void 0) patch.weekOf = String(req.body.weekOf);
    const tb = await storage.updateToolboxTalk(patch);
    res.json(tb);
  });
  return httpServer;
}

// api/_src/index.ts
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "5mb" }));
var PgStore = (0, import_connect_pg_simple.default)(import_express_session.default);
var sessionPool = new import_pg.default.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1
  // serverless: one connection per instance is plenty
});
app.use(
  (0, import_express_session.default)({
    store: new PgStore({
      pool: sessionPool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 3600 * 1e3
    }
  })
);
app.use("/uploads", (_req, res) => res.status(410).json({ error: "File uploads disabled in this deployment" }));
var ready = null;
async function ensureReady() {
  if (!ready) ready = registerRoutesAsync(app);
  return ready;
}
async function registerRoutesAsync(app2) {
  await registerRoutes({ on: () => {
  } }, app2);
}
module.exports = async function handler(req, res) {
  await ensureReady();
  return app(req, res);
};
