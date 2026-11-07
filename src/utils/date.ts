const jakartaFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "YYYY-MM-DD" in Asia/Jakarta */
export const jakartaDateStr = (d = new Date()) => jakartaFmt.format(d);

/** "YYYY-MM-DD" of a @db.Date value (stored as UTC midnight) */
export const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

export const toDbDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

export const addDays = (d: Date, n: number) =>
  new Date(d.getTime() + n * 86_400_000);

/** Whole days from date string a to date string b */
export const diffDays = (a: string, b: string) =>
  Math.round((toDbDate(b).getTime() - toDbDate(a).getTime()) / 86_400_000);

/** ISO 8601 with +07:00 offset, e.g. 2026-11-07T08:30:00+07:00 */
export const toJakartaIso = (d: Date) =>
  `${new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 19)}+07:00`;
