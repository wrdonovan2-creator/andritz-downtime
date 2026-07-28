// Shared API base + helpers for the Downtime Tracker.
export const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

// For multipart/form-data uploads (photo on a delay). apiRequest sets JSON
// content-type which breaks multipart, so we use a dedicated helper here.
export async function apiUpload(url: string, form: FormData): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, { method: "POST", body: form });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

// Resolve a stored /uploads path to an absolute URL through the proxy.
export function assetUrl(p?: string | null): string | undefined {
  if (!p) return undefined;
  return `${API_BASE}${p}`;
}

// ---- shared types ----
export type Role = "operator" | "production_manager" | "plant_manager";
export type Lang = "en" | "es";

export interface Asset {
  id: number;
  code: string;
  name: string;
  ratePerHour: number;
  costCenter: string;
  activityType: string;
  active: number;
}

export interface Reason {
  id: number;
  labelEn: string;
  labelEs: string;
}

export interface Employee {
  id: number;
  name: string;
  active: number;
}

export interface Assignment {
  id: number;
  assetId: number;
  shift: number;
  employeeId: number | null;
}

export interface Delay {
  id: number;
  assetId: number;
  reasonId: number | null;
  description: string;
  dateDown: string;
  timeDown: string;
  dateUp: string | null;
  timeUp: string | null;
  shift: number | null;
  employeeId: number | null;
  correctiveActions: string;
  photoPath: string | null;
  createdByUser: string;
  createdAt: string;
  // enriched
  assetName: string;
  reasonLabelEn: string;
  reasonLabelEs: string;
  employeeName: string;
  ratePerHour: number;
  dlhPercent: number;
  hoursRaw: number | null;
  hours: number | null;
  chargeableHours: number | null;
  cost: number | null;
  open: boolean;
}

export interface Schedule {
  dow: number; // 0=Sun..6=Sat
  hours: number;
  startHour: number;
}

export interface Holiday {
  id: number;
  date: string; // YYYY-MM-DD
  labelEn: string;
  labelEs: string;
}

export interface DashboardRow {
  assetId: number;
  assetName: string;
  ratePerHour: number;
  costCenter: string;
  activityType: string;
  events: number;
  downHours: number;
  cost: number;
  status: "UP" | "DOWN";
}

export interface TopOperator {
  name: string;
  hours: number;
  events: number;
}

export interface DashboardData {
  rows: DashboardRow[];
  totals: {
    ytdCost: number;
    totalHours: number;
    totalEvents: number;
    assetsDownNow: number;
    assetCount: number;
  };
  topOperators: TopOperator[];
}

export interface WeeklyRow {
  week: number;
  weekStart: string;
  weekEnd: string;
  events: number;
  downHours: number;
  cost: number;
}

export interface ReasonRow {
  reasonId: number;
  reasonEn: string;
  reasonEs: string;
  events: number;
  downHours: number;
  cost: number;
}

export interface SafetyConcern {
  id: number;
  message: string;
  submitterName: string;
  submitterContact: string;
  response: string;
  respondedBy: string;
  status: "open" | "reviewed" | "closed";
  createdAt: string;
  respondedAt: string;
}

export interface SafetyResponse {
  id: number;
  message: string;
  response: string;
  respondedBy: string;
  respondedAt: string;
  status: string;
}

export interface OpenSafetyConcern {
  id: number;
  message: string;
  submitterName: string;
  createdAt: string;
}

export interface Birthday {
  id: number;
  name: string;
  month: number;
  day: number;
  photoPath: string;
}

export interface UpcomingBirthday extends Birthday {
  daysUntil: number;
  isToday: boolean;
}

export interface ToolboxTalk {
  id: number;
  weekOf: string;
  title: string;
  imagePath: string;
  notes: string;
  updatedAt: string;
}
