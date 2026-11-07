/** "HH:MM-HH:MM" in Asia/Jakarta local time. null when unknown or malformed. */
export function isOpenNow(
  openHours: string | null,
  now = new Date()
): boolean | null {
  if (!openHours) return null;
  const m = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(openHours);
  if (!m) return null;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  const jakarta = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
  );
  const cur = jakarta.getHours() * 60 + jakarta.getMinutes();
  return start <= end ? cur >= start && cur <= end : cur >= start || cur <= end; // handles past-midnight
}
