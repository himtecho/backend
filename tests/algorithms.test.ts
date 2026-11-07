import { describe, expect, it } from "vitest";
import { changePercent, toTrend } from "../src/algorithms/trend";
import { median } from "../src/algorithms/median";
import { haversineKm } from "../src/algorithms/geo";
import { isOpenNow } from "../src/algorithms/openHours";

describe("trend", () => {
  it("rounds change to 1 decimal", () =>
    expect(changePercent(74550, 69000)).toBe(8));
  it("classifies at +-1% thresholds", () => {
    expect(toTrend(1)).toBe("UP");
    expect(toTrend(-1)).toBe("DOWN");
    expect(toTrend(0.9)).toBe("STABLE");
  });
  it("handles zero previous", () => expect(changePercent(10, 0)).toBe(0));
});

describe("median", () => {
  it("odd count", () => expect(median([3, 1, 2])).toBe(2));
  it("even count rounds", () => expect(median([1, 2, 3, 4])).toBe(3));
});

describe("haversineKm", () => {
  it("is 0 for same point", () =>
    expect(haversineKm(-6.9, 107.6, -6.9, 107.6)).toBe(0));
  it("~111 km per degree latitude", () =>
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.2, 0));
});

describe("isOpenNow", () => {
  // 03:00 UTC = 10:00 Jakarta
  const now = new Date("2026-11-07T03:00:00Z");
  it("open inside range", () =>
    expect(isOpenNow("05:00-14:00", now)).toBe(true));
  it("closed outside range", () =>
    expect(isOpenNow("11:00-14:00", now)).toBe(false));
  it("null when unknown", () => expect(isOpenNow(null, now)).toBeNull());
});
