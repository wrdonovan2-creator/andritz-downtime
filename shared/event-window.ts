// Shared date-window logic for TV "event" slides (birthdays + holidays).
//
// One definition of the window is used by the API (/api/events/active) and the
// break-room TV so the two can never disagree. The window is 3 calendar days:
//   day before (-1)  →  day of (0)  →  day after (+1)
// All dates are plant-local calendar days (America/Chicago), expressed as
// ISO "YYYY-MM-DD" strings, so server UTC time never shifts the window.

export const PLANT_TIME_ZONE = "America/Chicago";
export const EVENT_DAYS_BEFORE = 1;
export const EVENT_DAYS_AFTER = 1;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** True when `s` is a real calendar date in YYYY-MM-DD form. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Today's plant-local calendar date as YYYY-MM-DD. */
export function plantToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PLANT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUtcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Add whole calendar days to an ISO date (DST-safe: works in UTC). */
export function addDays(iso: string, days: number): string {
  return fromUtcMs(toUtcMs(iso) + days * DAY_MS);
}

/** Signed whole-day difference: eventDate − today. */
export function diffDays(eventIso: string, todayIso: string): number {
  return Math.round((toUtcMs(eventIso) - toUtcMs(todayIso)) / DAY_MS);
}

/** Every date in [center − before, center + after], in order. */
export function dateWindow(
  centerIso: string,
  before: number = EVENT_DAYS_BEFORE,
  after: number = EVENT_DAYS_AFTER,
): string[] {
  const out: string[] = [];
  for (let i = -before; i <= after; i++) out.push(addDays(centerIso, i));
  return out;
}

/** True when an event dated `eventIso` should show on `todayIso`. */
export function isInEventWindow(
  eventIso: string,
  todayIso: string,
  before: number = EVENT_DAYS_BEFORE,
  after: number = EVENT_DAYS_AFTER,
): boolean {
  // Event is `before` days ahead (show the day before) through `after` days
  // past (show the day after).
  const d = diffDays(eventIso, todayIso);
  return d <= before && d >= -after;
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * The calendar date a recurring birthday (month/day) falls on in `year`.
 * Feb 29 birthdays are observed on Feb 28 in non-leap years.
 */
export function birthdayDateInYear(month: number, day: number, year: number): string {
  const d = month === 2 && day === 29 && !isLeap(year) ? 28 : day;
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Signed offset (days) from today to the nearest occurrence of a recurring
 * birthday — checks last, this and next year so Dec 31 / Jan 1 wrap correctly
 * (e.g. a Jan 1 birthday is +1 on Dec 31, a Dec 31 birthday is −1 on Jan 1).
 */
export function birthdayOffset(month: number, day: number, todayIso: string): number {
  const y = Number(todayIso.slice(0, 4));
  let best = Infinity;
  for (const yr of [y - 1, y, y + 1]) {
    const off = diffDays(birthdayDateInYear(month, day, yr), todayIso);
    if (Math.abs(off) < Math.abs(best)) best = off;
  }
  return best;
}

export type WindowTag = "before" | "today" | "after";

/** Label an in-window offset: −1 → after (yesterday), 0 → today, +1 → before (tomorrow). */
export function windowTag(offset: number): WindowTag {
  return offset === 0 ? "today" : offset > 0 ? "before" : "after";
}

/** Holidays whose date falls inside the window around `todayIso`, nearest first. */
export function activeHolidays<T extends { date: string }>(
  list: T[],
  todayIso: string,
  before: number = EVENT_DAYS_BEFORE,
  after: number = EVENT_DAYS_AFTER,
): (T & { offset: number; tag: WindowTag })[] {
  return list
    .filter((h) => isIsoDate(h.date) && isInEventWindow(h.date, todayIso, before, after))
    .map((h) => {
      const offset = diffDays(h.date, todayIso);
      return { ...h, offset, tag: windowTag(offset) };
    })
    .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset) || a.offset - b.offset);
}

/** Birthdays whose next/last occurrence falls inside the window, nearest first. */
export function activeBirthdays<T extends { month: number; day: number }>(
  list: T[],
  todayIso: string,
  before: number = EVENT_DAYS_BEFORE,
  after: number = EVENT_DAYS_AFTER,
): (T & { offset: number; tag: WindowTag; date: string })[] {
  return list
    .map((b) => {
      const offset = birthdayOffset(b.month, b.day, todayIso);
      return { ...b, offset, tag: windowTag(offset), date: addDays(todayIso, offset) };
    })
    .filter((b) => b.offset <= before && b.offset >= -after)
    .sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset) || a.offset - b.offset);
}
