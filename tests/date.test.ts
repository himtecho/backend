import { describe, expect, it } from "vitest";
import {
  dateOnly,
  diffDays,
  jakartaDateStr,
  toJakartaIso,
} from "../src/utils/date";

describe("date utils", () => {
  it("jakartaDateStr rolls over at 17:00 UTC", () => {
    expect(jakartaDateStr(new Date("2026-11-06T16:59:00Z"))).toBe("2026-11-06");
    expect(jakartaDateStr(new Date("2026-11-06T17:00:00Z"))).toBe("2026-11-07");
  });
  it("toJakartaIso uses +07:00", () => {
    expect(toJakartaIso(new Date("2026-11-07T01:30:00Z"))).toBe(
      "2026-11-07T08:30:00+07:00"
    );
  });
  it("diffDays and dateOnly", () => {
    expect(diffDays("2026-11-07", "2026-11-12")).toBe(5);
    expect(dateOnly(new Date("2026-11-07T00:00:00Z"))).toBe("2026-11-07");
  });
});
