// Working-hour schedule math.
// Down-hours and cost are counted ONLY during scheduled working hours.
// Each day has a working window: [startHour, startHour + scheduledHours).
// Sundays, scheduled-0 days, and holidays contribute 0 chargeable hours.

const MS_PER_HOUR = 1000 * 60 * 60;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Local YYYY-MM-DD for a Date (uses local time, matching how delays are stored).
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function computeChargeableHours(
  startISO: Date,
  endISO: Date,
  schedule: { dow: number; hours: number; startHour: number }[],
  holidayDates: Set<string>,
): number {
  if (!startISO || !endISO) return 0;
  const startMs = startISO.getTime();
  const endMs = endISO.getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return 0;

  const byDow = new Map<number, { hours: number; startHour: number }>();
  for (const s of schedule) byDow.set(s.dow, { hours: s.hours, startHour: s.startHour });

  let total = 0;

  // Walk day-by-day from start's date to end's date (inclusive).
  const cursor = new Date(startISO.getFullYear(), startISO.getMonth(), startISO.getDate());
  const lastDay = new Date(endISO.getFullYear(), endISO.getMonth(), endISO.getDate());

  while (cursor.getTime() <= lastDay.getTime()) {
    const dow = cursor.getDay(); // 0=Sun..6=Sat
    const dateStr = localDateStr(cursor);
    const sched = byDow.get(dow);
    const hoursScheduled = sched?.hours ?? 0;
    const startHour = sched?.startHour ?? 6;

    // Skip Sundays, scheduled-0 days, and holidays.
    if (dow !== 0 && hoursScheduled > 0 && !holidayDates.has(dateStr)) {
      // Working window for this day, in ms.
      const windowStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
      windowStart.setHours(0, 0, 0, 0);
      const winStartMs = windowStart.getTime() + startHour * MS_PER_HOUR;
      const winEndMs = winStartMs + hoursScheduled * MS_PER_HOUR;

      // Clip [startMs, endMs] to [winStartMs, winEndMs].
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
