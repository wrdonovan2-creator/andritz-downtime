import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

// Shop hours for background polling, in plant local time (America/Chicago).
// Outside this window, unattended screens (break-room TV, idle browsers) stop
// calling the API so the Neon database can suspend and stop billing compute.
// Mon–Fri 07:00–17:00 (set by Plant Manager 2026-10-28 to keep the tracker
// within Neon free-plan compute limits). Saturday and Sunday are closed, and
// so are the plant holidays maintained on the admin page (/api/holidays).
// The holiday list is cached in localStorage and refreshed at most once a
// day, and only during would-be shop hours, so it never wakes the database
// at night or on weekends.
export const SHOP_TZ = "America/Chicago";
export const SHOP_OPEN_HOUR = 7;
export const SHOP_CLOSE_HOUR = 17;

const HOLIDAY_CACHE_KEY = "shopHolidays.v1";

type HolidayCache = { fetchedOn: string; dates: string[] };

function readHolidayCache(): HolidayCache | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(HOLIDAY_CACHE_KEY) : null;
    return raw ? (JSON.parse(raw) as HolidayCache) : null;
  } catch {
    return null;
  }
}

let holidayDates = new Set<string>(readHolidayCache()?.dates ?? []);

/** YYYY-MM-DD for the given instant in plant local time. */
export function shopDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isShopHoliday(d: Date = new Date()): boolean {
  return holidayDates.has(shopDateKey(d));
}

/** Weekday + clock check only (ignores holidays). */
function isShopClockHours(d: Date): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (weekday === "Sat" || weekday === "Sun") return false;
  return hour >= SHOP_OPEN_HOUR && hour < SHOP_CLOSE_HOUR;
}

export function isShopHours(d: Date = new Date()): boolean {
  return isShopClockHours(d) && !isShopHoliday(d);
}

/**
 * Refresh the cached holiday list if it wasn't fetched today. Only runs
 * during weekday shop-clock hours so it can't wake the database off-hours.
 */
async function refreshHolidaysIfStale(apiBase: string): Promise<void> {
  const now = new Date();
  if (!isShopClockHours(now)) return;
  const today = shopDateKey(now);
  if (readHolidayCache()?.fetchedOn === today) return;
  try {
    const res = await fetch(`${apiBase}/api/holidays`);
    if (!res.ok) return;
    const list = (await res.json()) as Array<{ date: string }>;
    const dates = list.map((h) => h.date);
    holidayDates = new Set(dates);
    localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify({ fetchedOn: today, dates }));
  } catch {
    // Keep the previous cache on network errors.
  }
}

/** Re-evaluates once a minute; returns true while the shop is open. */
export function useShopHours(): boolean {
  const [open, setOpen] = useState(() => isShopHours());
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      await refreshHolidaysIfStale(API_BASE);
      if (!cancelled) setOpen(isShopHours());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return open;
}

/** Returns true while the browser tab is visible. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
