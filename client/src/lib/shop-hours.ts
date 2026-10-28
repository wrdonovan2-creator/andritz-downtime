import { useEffect, useState } from "react";

// Shop hours for background polling, in plant local time (America/Chicago).
// Outside this window, unattended screens (break-room TV, idle browsers) stop
// calling the API so the Neon database can suspend and stop billing compute.
// Mon–Fri 07:00–17:00, Sat 07:00–12:00 (set by Plant Manager 2026-10-28 to
// keep the tracker within Neon free-plan compute limits). Sunday is closed.
export const SHOP_TZ = "America/Chicago";
export const SHOP_OPEN_HOUR = 7;
export const SHOP_CLOSE_HOUR = 17;
export const SATURDAY_CLOSE_HOUR = 12;

export function isShopHours(d: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  if (weekday === "Sun") return false;
  const close = weekday === "Sat" ? SATURDAY_CLOSE_HOUR : SHOP_CLOSE_HOUR;
  return hour >= SHOP_OPEN_HOUR && hour < close;
}

/** Re-evaluates once a minute; returns true while the shop is open. */
export function useShopHours(): boolean {
  const [open, setOpen] = useState(() => isShopHours());
  useEffect(() => {
    const id = setInterval(() => setOpen(isShopHours()), 60_000);
    return () => clearInterval(id);
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
