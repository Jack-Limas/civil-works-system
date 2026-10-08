/**
 * Business time zone: America/Bogota (UTC-5, no daylight saving time).
 * "Today", day boundaries and @db.Date values are computed here instead of in
 * the server's time zone (Render/Railway run in UTC, so midnight UTC would be
 * 7 p.m. of the previous day in Colombia).
 */
export const BUSINESS_TIME_ZONE = "America/Bogota";
const OFFSET_HOURS = 5; // Bogota = UTC-5 all year
const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" of the given instant as seen in Bogota. */
export function businessDateKey(instant: Date = new Date()): string {
  const shifted = new Date(instant.getTime() - OFFSET_HOURS * 3_600_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** UTC instants [start, end) covering the Bogota calendar day "YYYY-MM-DD". */
export function businessDayRange(dateKey: string): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, OFFSET_HOURS, 0, 0));
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** UTC instant of the first moment of the current Bogota month. */
export function businessMonthStart(instant: Date = new Date()): Date {
  const [y, m] = businessDateKey(instant).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, OFFSET_HOURS, 0, 0));
}

/**
 * A "YYYY-MM-DD" business date as the Date Prisma stores in a @db.Date column
 * (midnight UTC of that calendar date, which Postgres keeps as a plain DATE).
 */
export function dateKeyToDbDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Inverse of dateKeyToDbDate. */
export function dbDateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return dbDateToKey(dateKeyToDbDate(value)) === value;
}

export function daysAgo(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - days * DAY_MS);
}
