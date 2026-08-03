import { users, settings, assets, reasons, delays, employees, assignments, schedule, holidays, safetyConcerns, birthdays, toolboxTalk, distressAlerts } from "@shared/schema";
import type {
  User, InsertUser, Asset, InsertAsset, Reason, InsertReason,
  Delay, InsertDelay, Employee, InsertEmployee, Assignment, InsertAssignment,
  Schedule, Holiday, InsertHoliday,
  SafetyConcern, InsertSafetyConcern, Birthday, InsertBirthday, ToolboxTalk, InsertToolboxTalk,
  DistressAlert,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { computeChargeableHours } from "./schedule";

// ---- Postgres (Neon) connection ----
// DATABASE_URL is provided by Vercel Postgres / Neon integration.
if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set — database calls will fail until it is configured in Vercel env vars.");
}
const sql = neon(process.env.DATABASE_URL || "");
export { sql };
export const db = drizzle(sql);

// Table creation is handled by `drizzle-kit push` (see package.json db:push /
// MIGRATION_NOTES.md). We still guard bootstrap() with a best-effort
// CREATE TABLE IF NOT EXISTS pass so a fresh Postgres database can boot the
// app even before the first `drizzle-kit push` is run.
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
  // Migration: add concern_type to legacy databases that predate the rename.
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
  // Migration: add presenter column to existing toolbox_talk table if missing.
  try {
    await sql`ALTER TABLE toolbox_talk ADD COLUMN IF NOT EXISTS presenter TEXT NOT NULL DEFAULT 'Frank Eneman'`;
  } catch (e) {
    console.warn("toolbox_talk presenter migration:", e);
  }
  // Migration: add note_type column for the "Note of the Week" rename.
  try {
    await sql`ALTER TABLE toolbox_talk ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'safety'`;
  } catch (e) {
    console.warn("toolbox_talk note_type migration:", e);
  }
}

// ---- Seed data ----
const STRAIGHT_RATE = 150.62;
const ROTARY_RATE = 125.59;
const STRAIGHT_CC = "CV492310";
const ROTARY_CC = "CV492320";
const ACTIVITY = "6034";

// code, name, rate, cost center, activity, active
const SEED_ASSETS: (InsertAsset & { code: string })[] = [
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
  { code: "2658", name: "2658 Rotary | Mattison Slitter", ratePerHour: ROTARY_RATE, costCenter: ROTARY_CC, activityType: ACTIVITY, active: 1 },
];

const SEED_REASONS: [string, string][] = [
  ["Mechanical", "Mec\u00e1nico"],
  ["Electrical", "El\u00e9ctrico"],
  ["Hydraulic", "Hidr\u00e1ulico"],
  ["PLC/Controls", "PLC/Controles"],
  ["Tooling/Wheel Change", "Cambio de herramienta/rueda"],
  ["Operator", "Operador"],
  ["Material", "Material"],
  ["PM/Scheduled", "Mantenimiento programado"],
  ["Waiting Parts", "Esperando repuestos"],
  ["Other", "Otro"],
];

const SEED_EMPLOYEES = [
  "Ruiz Pablo", "Fonseca Arturo", "Munoz Manuel", "Munoz Juan", "Guzman Raul",
  "Plascencia Edgar", "Hudson Curtis", "Guzman Ramon", "Tejeda Jesus",
  "Tillman Michael", "Gutierrez Efrain", "Forbes Joe", "Ruiz Juan",
];

// [assetCode, shift, employeeName]
const SEED_ASSIGNMENTS: [string, number, string][] = [
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
  ["2610", 2, "Ruiz Juan"],
];

// [dow, hours, startHour] — Mon-Thu 10h, Fri 8h, Sat 4h, Sun 0.
const SEED_SCHEDULE: [number, number, number][] = [
  [0, 0, 6],  // Sun
  [1, 10, 6], // Mon
  [2, 10, 6], // Tue
  [3, 10, 6], // Wed
  [4, 10, 6], // Thu
  [5, 8, 6],  // Fri
  [6, 4, 6],  // Sat
];

// [date, EN, ES] — 2026 holidays.
const SEED_HOLIDAYS: [string, string, string][] = [
  ["2026-01-01", "New Year's Day Observed", "A\u00f1o Nuevo (Observado)"],
  ["2026-04-03", "Good Friday", "Viernes Santo"],
  ["2026-05-25", "Memorial Day", "D\u00eda de los Ca\u00eddos"],
  ["2026-07-03", "Independence Day", "D\u00eda de la Independencia"],
  ["2026-09-07", "Labor Day", "D\u00eda del Trabajo"],
  ["2026-11-26", "Thanksgiving Day", "D\u00eda de Acci\u00f3n de Gracias"],
  ["2026-11-27", "Day after Thanksgiving", "D\u00eda despu\u00e9s de Acci\u00f3n de Gracias"],
  ["2026-12-24", "Christmas Eve Observed", "Nochebuena (Observada)"],
  ["2026-12-25", "Christmas Day", "Navidad"],
  ["2026-12-31", "New Year's Eve Observed", "Nochevieja (Observada)"],
];

const DEFAULT_DLH_PERCENT = "75";

const DEFAULT_OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD || "15600";
const DEFAULT_PROD_PASSWORD = process.env.PROD_PASSWORD || "prod2026";
const DEFAULT_PLANT_PASSWORD = process.env.PLANT_PASSWORD || "plant2026";

export interface IStorage {
  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  listAssets(): Promise<Asset[]>;
  getAsset(id: number): Promise<Asset | undefined>;
  getAssetByCode(code: string): Promise<Asset | undefined>;
  createAsset(a: InsertAsset): Promise<Asset>;
  updateAsset(id: number, patch: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: number): Promise<void>;
  listReasons(): Promise<Reason[]>;
  createReason(r: InsertReason): Promise<Reason>;
  getReason(id: number): Promise<Reason | undefined>;
  updateReason(id: number, patch: Partial<InsertReason>): Promise<Reason | undefined>;
  deleteReason(id: number): Promise<void>;
  listDelays(): Promise<Delay[]>;
  getDelay(id: number): Promise<Delay | undefined>;
  createDelay(d: InsertDelay): Promise<Delay>;
  updateDelay(id: number, patch: Partial<InsertDelay>): Promise<Delay | undefined>;
  deleteDelay(id: number): Promise<void>;
  listEmployees(): Promise<Employee[]>;
  createEmployee(e: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, patch: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: number): Promise<void>;
  listAssignments(): Promise<Assignment[]>;
  findAssignment(assetId: number, shift: number): Promise<Assignment | undefined>;
  upsertAssignment(assetId: number, shift: number, employeeId: number | null): Promise<Assignment>;
  listSchedule(): Promise<Schedule[]>;
  updateSchedule(dow: number, patch: { hours?: number; startHour?: number }): Promise<Schedule | undefined>;
  listHolidays(): Promise<Holiday[]>;
  createHoliday(h: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, patch: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<void>;
  getDlhPercent(): Promise<number>;
  setDlhPercent(v: number): Promise<void>;
  getChargeableHours(d: Delay): Promise<number>;
  // Safety concerns
  listSafetyConcerns(): Promise<SafetyConcern[]>;
  getSafetyConcern(id: number): Promise<SafetyConcern | undefined>;
  createSafetyConcern(input: InsertSafetyConcern): Promise<SafetyConcern>;
  updateSafetyConcern(id: number, patch: Partial<InsertSafetyConcern>): Promise<SafetyConcern | undefined>;
  deleteSafetyConcern(id: number): Promise<void>;
  recentRespondedConcerns(limit: number): Promise<SafetyConcern[]>;
  // Birthdays
  listBirthdays(): Promise<Birthday[]>;
  getBirthday(id: number): Promise<Birthday | undefined>;
  createBirthday(input: InsertBirthday): Promise<Birthday>;
  updateBirthday(id: number, patch: Partial<InsertBirthday>): Promise<Birthday | undefined>;
  deleteBirthday(id: number): Promise<void>;
  getBirthdaysNext7Days(): Promise<Birthday[]>;
  getBirthdaysThisMonth(): Promise<Birthday[]>;
  getUpcomingBirthdays(days: number): Promise<(Birthday & { daysUntil: number; isToday: boolean })[]>;
  // Toolbox talk
  getToolboxTalk(): Promise<ToolboxTalk | undefined>;
  updateToolboxTalk(patch: Partial<InsertToolboxTalk>): Promise<ToolboxTalk>;
  // Distress alerts
  listDistressAlerts(): Promise<DistressAlert[]>;
  listActiveDistressAlerts(): Promise<DistressAlert[]>;
  getDistressAlert(id: number): Promise<DistressAlert | undefined>;
  createDistressAlert(input: { reason: string; location: string; reporter: string }): Promise<DistressAlert>;
  respondDistressAlert(id: number, responderName: string): Promise<DistressAlert | undefined>;
  resolveDistressAlert(id: number, note: string, responderName: string): Promise<DistressAlert | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getSetting(key: string) {
    const rows = await db.select().from(settings).where(eq(settings.key, key));
    return rows[0]?.value;
  }
  async setSetting(key: string, value: string) {
    const rows = await db.select().from(settings).where(eq(settings.key, key));
    if (rows[0]) await db.update(settings).set({ value }).where(eq(settings.key, key));
    else await db.insert(settings).values({ key, value });
  }
  async listAssets() { return db.select().from(assets).orderBy(assets.id); }
  async getAsset(id: number) {
    const rows = await db.select().from(assets).where(eq(assets.id, id));
    return rows[0];
  }
  async getAssetByCode(code: string) {
    const rows = await db.select().from(assets).where(eq(assets.code, code));
    return rows[0];
  }
  async createAsset(a: InsertAsset) {
    const rows = await db.insert(assets).values(a).returning();
    return rows[0];
  }
  async updateAsset(id: number, patch: Partial<InsertAsset>) {
    await db.update(assets).set(patch).where(eq(assets.id, id));
    return this.getAsset(id);
  }
  async deleteAsset(id: number) {
    // Also clean up any assignments referencing this asset
    await db.delete(assignments).where(eq(assignments.assetId, id));
    await db.delete(assets).where(eq(assets.id, id));
  }
  async listReasons() { return db.select().from(reasons).orderBy(reasons.id); }
  async createReason(r: InsertReason) {
    const rows = await db.insert(reasons).values(r).returning();
    return rows[0];
  }
  async getReason(id: number) {
    const rows = await db.select().from(reasons).where(eq(reasons.id, id));
    return rows[0];
  }
  async updateReason(id: number, patch: Partial<InsertReason>) {
    await db.update(reasons).set(patch).where(eq(reasons.id, id));
    return this.getReason(id);
  }
  async deleteReason(id: number) { await db.delete(reasons).where(eq(reasons.id, id)); }
  async listDelays() { return db.select().from(delays).orderBy(delays.id); }
  async getDelay(id: number) {
    const rows = await db.select().from(delays).where(eq(delays.id, id));
    return rows[0];
  }
  async createDelay(d: InsertDelay) {
    const rows = await db.insert(delays).values(d).returning();
    return rows[0];
  }
  async updateDelay(id: number, patch: Partial<InsertDelay>) {
    await db.update(delays).set(patch).where(eq(delays.id, id));
    return this.getDelay(id);
  }
  async deleteDelay(id: number) { await db.delete(delays).where(eq(delays.id, id)); }
  async listEmployees() { return db.select().from(employees).orderBy(employees.id); }
  async createEmployee(e: InsertEmployee) {
    const rows = await db.insert(employees).values(e).returning();
    return rows[0];
  }
  async updateEmployee(id: number, patch: Partial<InsertEmployee>) {
    await db.update(employees).set(patch).where(eq(employees.id, id));
    const rows = await db.select().from(employees).where(eq(employees.id, id));
    return rows[0];
  }
  async deleteEmployee(id: number) { await db.delete(employees).where(eq(employees.id, id)); }
  async listAssignments() { return db.select().from(assignments).orderBy(assignments.id); }
  async findAssignment(assetId: number, shift: number) {
    const list = await this.listAssignments();
    return list.find((a) => a.assetId === assetId && a.shift === shift);
  }
  async upsertAssignment(assetId: number, shift: number, employeeId: number | null) {
    const existing = await this.findAssignment(assetId, shift);
    if (existing) {
      await db.update(assignments).set({ employeeId }).where(eq(assignments.id, existing.id));
      const rows = await db.select().from(assignments).where(eq(assignments.id, existing.id));
      return rows[0]!;
    }
    const rows = await db.insert(assignments).values({ assetId, shift, employeeId }).returning();
    return rows[0];
  }

  async listSchedule() { return db.select().from(schedule).orderBy(schedule.dow); }
  async updateSchedule(dow: number, patch: { hours?: number; startHour?: number }) {
    await db.update(schedule).set(patch).where(eq(schedule.dow, dow));
    const rows = await db.select().from(schedule).where(eq(schedule.dow, dow));
    return rows[0];
  }
  async listHolidays() { return db.select().from(holidays).orderBy(holidays.date); }
  async createHoliday(h: InsertHoliday) {
    const rows = await db.insert(holidays).values(h).returning();
    return rows[0];
  }
  async updateHoliday(id: number, patch: Partial<InsertHoliday>) {
    await db.update(holidays).set(patch).where(eq(holidays.id, id));
    const rows = await db.select().from(holidays).where(eq(holidays.id, id));
    return rows[0];
  }
  async deleteHoliday(id: number) { await db.delete(holidays).where(eq(holidays.id, id)); }
  async getDlhPercent() {
    const v = await this.getSetting("dlh_percent");
    const n = v !== undefined ? Number(v) : 75;
    return isNaN(n) ? 75 : n;
  }
  async setDlhPercent(v: number) { await this.setSetting("dlh_percent", String(v)); }

  // ---- SAFETY CONCERNS ----
  async listSafetyConcerns() {
    return db.select().from(safetyConcerns).orderBy(desc(safetyConcerns.id));
  }
  async getSafetyConcern(id: number) {
    const rows = await db.select().from(safetyConcerns).where(eq(safetyConcerns.id, id));
    return rows[0];
  }
  async createSafetyConcern(input: InsertSafetyConcern) {
    const rows = await db.insert(safetyConcerns).values(input).returning();
    return rows[0];
  }
  async updateSafetyConcern(id: number, patch: Partial<InsertSafetyConcern>) {
    await db.update(safetyConcerns).set(patch).where(eq(safetyConcerns.id, id));
    return this.getSafetyConcern(id);
  }
  async deleteSafetyConcern(id: number) {
    await db.delete(safetyConcerns).where(eq(safetyConcerns.id, id));
  }
  async recentRespondedConcerns(limit: number) {
    const list = await this.listSafetyConcerns();
    return list
      .filter((c) => c.response && c.response.trim().length > 0)
      .sort((a, b) => (a.respondedAt < b.respondedAt ? 1 : -1))
      .slice(0, limit);
  }

  // ---- DISTRESS ALERTS (panic button) ----
  async listDistressAlerts() {
    return db.select().from(distressAlerts).orderBy(desc(distressAlerts.id));
  }
  async listActiveDistressAlerts() {
    const list = await this.listDistressAlerts();
    return list.filter((a) => a.status !== "resolved");
  }
  async getDistressAlert(id: number) {
    const rows = await db.select().from(distressAlerts).where(eq(distressAlerts.id, id));
    return rows[0];
  }
  async createDistressAlert(input: { reason: string; location: string; reporter: string }) {
    const rows = await db
      .insert(distressAlerts)
      .values({
        reason: input.reason || "other",
        location: input.location || "",
        reporter: input.reporter || "",
        createdAt: new Date().toISOString(),
        status: "active",
      })
      .returning();
    return rows[0];
  }
  async respondDistressAlert(id: number, responderName: string) {
    await db.update(distressAlerts)
      .set({ status: "responding", responderName, respondedAt: new Date().toISOString() })
      .where(eq(distressAlerts.id, id));
    return this.getDistressAlert(id);
  }
  async resolveDistressAlert(id: number, note: string, responderName: string) {
    const now = new Date().toISOString();
    // If nobody had claimed it, use the resolver name as the responder too.
    const existing = await this.getDistressAlert(id);
    const responder = existing?.responderName || responderName;
    await db.update(distressAlerts)
      .set({
        status: "resolved",
        resolvedAt: now,
        resolutionNote: note || "",
        responderName: responder,
        respondedAt: existing?.respondedAt || now,
      })
      .where(eq(distressAlerts.id, id));
    return this.getDistressAlert(id);
  }

  // ---- BIRTHDAYS ----
  async listBirthdays() {
    return db.select().from(birthdays).orderBy(birthdays.month, birthdays.day);
  }
  async getBirthday(id: number) {
    const rows = await db.select().from(birthdays).where(eq(birthdays.id, id));
    return rows[0];
  }
  async createBirthday(input: InsertBirthday) {
    const rows = await db.insert(birthdays).values(input).returning();
    return rows[0];
  }
  async updateBirthday(id: number, patch: Partial<InsertBirthday>) {
    await db.update(birthdays).set(patch).where(eq(birthdays.id, id));
    return this.getBirthday(id);
  }
  async deleteBirthday(id: number) {
    await db.delete(birthdays).where(eq(birthdays.id, id));
  }
  async getBirthdaysNext7Days() {
    return this.getUpcomingBirthdays(7);
  }
  async getBirthdaysThisMonth() {
    const m = new Date().getMonth() + 1;
    const list = await this.listBirthdays();
    return list.filter((b) => b.month === m);
  }
  // Upcoming within `days`, wrapping the year boundary. Sorted by nearest.
  async getUpcomingBirthdays(days: number) {
    // Anchor "today" to the plant's local calendar day (America/Chicago),
    // not the server's UTC day, so a birthday is treated as today at the
    // right local time regardless of where the server runs.
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }),
    );
    const todayDoy = dayOfYear(now.getMonth() + 1, now.getDate(), now.getFullYear());
    const yearLen = isLeap(now.getFullYear()) ? 366 : 365;
    const list = await this.listBirthdays();
    return list
      .map((b) => {
        const bDoy = dayOfYear(b.month, b.day, now.getFullYear());
        let diff = bDoy - todayDoy;
        if (diff < 0) diff += yearLen; // wrap to next year
        return { ...b, daysUntil: diff, isToday: diff === 0 };
      })
      .filter((b) => b.daysUntil <= days)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // ---- TOOLBOX TALK (single row id=1) ----
  async getToolboxTalk() {
    const rows = await db.select().from(toolboxTalk).where(eq(toolboxTalk.id, 1));
    return rows[0];
  }
  async updateToolboxTalk(patch: Partial<InsertToolboxTalk>) {
    const existing = await this.getToolboxTalk();
    if (existing) {
      await db.update(toolboxTalk).set(patch).where(eq(toolboxTalk.id, 1));
    } else {
      await db.insert(toolboxTalk).values({ ...(patch as any) });
    }
    return (await this.getToolboxTalk())!;
  }

  // Per-request cache: schedule + holidays are pulled once, then reused.
  private _schedCache: { dow: number; hours: number; startHour: number }[] | null = null;
  private _holidayCache: Set<string> | null = null;
  private _cacheStamp = 0;
  private async ensureScheduleCache() {
    // Refresh at most every 2s to keep repeated rollup calls cheap while
    // still reflecting admin edits quickly.
    const now = Date.now();
    if (this._schedCache && this._holidayCache && now - this._cacheStamp < 2000) return;
    const sched = await this.listSchedule();
    const hols = await this.listHolidays();
    this._schedCache = sched.map((s) => ({ dow: s.dow, hours: s.hours, startHour: s.startHour }));
    this._holidayCache = new Set(hols.map((h) => h.date));
    this._cacheStamp = now;
  }
  // Invalidate the cache after schedule/holiday edits.
  invalidateScheduleCache() { this._schedCache = null; this._holidayCache = null; }
  async getChargeableHours(d: Delay): Promise<number> {
    if (!d.dateUp || !d.timeUp) return 0;
    await this.ensureScheduleCache();
    const start = parseLocal(d.dateDown, d.timeDown);
    const end = parseLocal(d.dateUp, d.timeUp);
    if (!start || !end) return 0;
    return computeChargeableHours(start, end, this._schedCache!, this._holidayCache!);
  }

}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function dayOfYear(month: number, day: number, year: number): number {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let doy = cum[Math.max(0, Math.min(11, month - 1))] + day;
  if (month > 2 && isLeap(year)) doy += 1;
  return doy;
}

function parseLocal(date: string, time: string): Date | null {
  if (!date) return null;
  const t = time && time.length >= 4 ? time.slice(0, 5) : "00:00";
  const [y, mo, da] = date.split("-").map(Number);
  const [h, mi] = t.split(":").map(Number);
  if (!y || !mo || !da) return null;
  const d = new Date(y, mo - 1, da, h || 0, mi || 0, 0, 0);
  return isNaN(d.getTime()) ? null : d;
}

export const storage = new DatabaseStorage();

export async function bootstrap() {
  await ensureTables();
  const now = new Date().toISOString();

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
  if ((await storage.getSetting("dlh_percent")) === undefined) {
    await storage.setSetting("dlh_percent", DEFAULT_DLH_PERCENT);
  }
  if (!(await storage.getSetting("operator_pw_hash"))) {
    await storage.setSetting("operator_pw_hash", bcrypt.hashSync(DEFAULT_OPERATOR_PASSWORD, 10));
  }
  if (!(await storage.getSetting("prod_pw_hash"))) {
    await storage.setSetting("prod_pw_hash", bcrypt.hashSync(DEFAULT_PROD_PASSWORD, 10));
  }
  if (!(await storage.getSetting("plant_pw_hash"))) {
    await storage.setSetting("plant_pw_hash", bcrypt.hashSync(DEFAULT_PLANT_PASSWORD, 10));
  }
  if (!(await storage.getSetting("bootstrapped_at"))) await storage.setSetting("bootstrapped_at", now);

  // Birthdays — seed Bill Donovan (Plant Manager, 01/23). Others added via admin.
  if ((await storage.listBirthdays()).length === 0) {
    await db.insert(birthdays).values({ name: "Bill Donovan", month: 1, day: 23, photoPath: "" });
  }
  // Toolbox talk — ensure a single empty row (id=1) exists for weekly uploads.
  if (!(await storage.getToolboxTalk())) {
    await db.insert(toolboxTalk).values({ weekOf: "", title: "", presenter: "Frank Eneman", imagePath: "", notes: "", updatedAt: "" });
  }
  // Safety concerns — left empty; real submissions populate it.
}
