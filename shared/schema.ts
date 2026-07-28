import { pgTable, text, integer, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// USERS — kept minimal; auth is via shared passwords stored in settings.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"), // 'employee' | 'admin'
  createdAt: text("created_at").notNull().default(""),
});

// SETTINGS — single-row-ish key/value store (bcrypt password hashes, etc.)
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ASSETS — machines with real cost-center rates.
// `code` is the shop-floor asset number (e.g. "2654"); `id` is the DB PK.
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().default(""),
  name: text("name").notNull(),
  ratePerHour: real("rate_per_hour").notNull().default(0),
  costCenter: text("cost_center").notNull().default(""),
  activityType: text("activity_type").notNull().default(""),
  active: integer("active").notNull().default(1), // 1 = active, 0 = inactive
});

// EMPLOYEES — operator roster.
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: integer("active").notNull().default(1),
});

// ASSIGNMENTS — default operator per asset per shift.
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  shift: integer("shift").notNull(), // 1 | 2
  employeeId: integer("employee_id"),
});

// REASONS — 10 downtime reasons, bilingual.
export const reasons = pgTable("reasons", {
  id: serial("id").primaryKey(),
  labelEn: text("label_en").notNull(),
  labelEs: text("label_es").notNull(),
});

// DELAYS — one downtime event. Open when dateUp/timeUp are null.
export const delays = pgTable("delays", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  reasonId: integer("reason_id"),
  description: text("description").notNull().default(""),
  dateDown: text("date_down").notNull(), // YYYY-MM-DD
  timeDown: text("time_down").notNull(), // HH:MM
  dateUp: text("date_up"), // YYYY-MM-DD | null (open)
  timeUp: text("time_up"), // HH:MM | null (open)
  shift: integer("shift"), // 1 | 2
  employeeId: integer("employee_id"),
  correctiveActions: text("corrective_actions").notNull().default(""),
  photoPath: text("photo_path"),
  createdByUser: text("created_by_user").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
});

// SCHEDULE — working hours per day of week. dow 0=Sun..6=Sat.
export const schedule = pgTable("schedule", {
  dow: integer("dow").primaryKey(), // 0=Sun ... 6=Sat
  hours: real("hours").notNull(), // scheduled hours that day
  startHour: real("start_hour").notNull().default(6), // 24h clock, editable
});

// HOLIDAYS — non-working calendar dates, bilingual labels.
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  labelEn: text("label_en").notNull(),
  labelEs: text("label_es").notNull(),
});

// SAFETY CONCERNS — anonymous or attributed submissions from the team.
export const safetyConcerns = pgTable("safety_concerns", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  submitterName: text("submitter_name").notNull().default(""), // optional; "" = anonymous
  submitterContact: text("submitter_contact").notNull().default(""), // optional phone/email
  response: text("response").notNull().default(""), // Bill/Frank response after Safety Team meeting
  respondedBy: text("responded_by").notNull().default(""),
  status: text("status").notNull().default("open"), // 'open' | 'reviewed' | 'closed'
  createdAt: text("created_at").notNull().default(""), // ISO timestamp
  respondedAt: text("responded_at").notNull().default(""),
});

// EMPLOYEE BIRTHDAYS — for the Birthdays slide.
export const birthdays = pgTable("birthdays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  month: integer("month").notNull(), // 1-12
  day: integer("day").notNull(), // 1-31
  photoPath: text("photo_path").notNull().default(""), // optional /uploads/birthdays/xxx.jpg
});

// TOOLBOX TALK — the current week's safety topic (photo uploaded weekly).
// Single-row table by convention (id=1).
export const toolboxTalk = pgTable("toolbox_talk", {
  id: serial("id").primaryKey(),
  weekOf: text("week_of").notNull().default(""), // YYYY-MM-DD (Monday of the week)
  title: text("title").notNull().default(""),
  presenter: text("presenter").notNull().default("Frank Eneman"),
  imagePath: text("image_path").notNull().default(""), // /uploads/toolbox/xxx.jpg
  notes: text("notes").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(""),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({ id: true });
export const insertReasonSchema = createInsertSchema(reasons).omit({ id: true });
export const insertDelaySchema = createInsertSchema(delays).omit({ id: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export const insertAssignmentSchema = createInsertSchema(assignments).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Reason = typeof reasons.$inferSelect;
export type InsertReason = z.infer<typeof insertReasonSchema>;
export type Delay = typeof delays.$inferSelect;
export type InsertDelay = z.infer<typeof insertDelaySchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Setting = typeof settings.$inferSelect;

export const insertScheduleSchema = createInsertSchema(schedule);
export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true });
export type Schedule = typeof schedule.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

export const insertSafetyConcernSchema = createInsertSchema(safetyConcerns).omit({ id: true });
export type SafetyConcern = typeof safetyConcerns.$inferSelect;
export type InsertSafetyConcern = z.infer<typeof insertSafetyConcernSchema>;

export const insertBirthdaySchema = createInsertSchema(birthdays).omit({ id: true });
export type Birthday = typeof birthdays.$inferSelect;
export type InsertBirthday = z.infer<typeof insertBirthdaySchema>;

export const insertToolboxTalkSchema = createInsertSchema(toolboxTalk).omit({ id: true });
export type ToolboxTalk = typeof toolboxTalk.$inferSelect;
export type InsertToolboxTalk = z.infer<typeof insertToolboxTalkSchema>;

// DISTRESS ALERTS — shop-floor "REQUEST HELP" panic button broadcasts.
export const distressAlerts = pgTable("distress_alerts", {
  id: serial("id").primaryKey(),
  reason: text("reason").notNull().default("other"), // medical | injury | fire | equipment | other
  location: text("location").notNull().default(""),
  reporter: text("reporter").notNull().default(""),
  createdAt: text("created_at").notNull().default(""),
  status: text("status").notNull().default("active"), // active | responding | resolved
  responderName: text("responder_name").notNull().default(""),
  respondedAt: text("responded_at").notNull().default(""),
  resolvedAt: text("resolved_at").notNull().default(""),
  resolutionNote: text("resolution_note").notNull().default(""),
});
export const insertDistressAlertSchema = createInsertSchema(distressAlerts).omit({ id: true, createdAt: true });
export type DistressAlert = typeof distressAlerts.$inferSelect;
export type InsertDistressAlert = z.infer<typeof insertDistressAlertSchema>;
