export type Trend = "UP" | "DOWN" | "STABLE";

export function changePercent(current: number, previous: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10; // 1 decimal
}

export function toTrend(pct: number): Trend {
  if (pct >= 1) return "UP";
  if (pct <= -1) return "DOWN";
  return "STABLE";
}
