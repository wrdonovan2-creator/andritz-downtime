import { useEffect, useState } from "react";

// Shop hours for background polling, in plant local time (America/Chicago).
// Outside this window, unattended screens (break-room TV, idle browsers) stop
// calling the API so the Neon database can suspend and stop billing compute.
// Mon–Sat 04:00–20:00 covers the Mon–Thu 10h / Fri 8h / Sat 4h schedule with
// margin on both ends. Sunday is closed.
export const SHOP_TZ = "America/Chicago";
export const SHOP_OPEN_HOUR = 4;
export const SHOP_CLOSE_HOUR = 20;

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
  return hour >= SHOP_OPEN_HOUR && hour < SHOP_CLOSE_HOUR;
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
