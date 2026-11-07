import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../src/config/prisma",
  async () => await import("./helpers/prismaMock")
);
import { prisma } from "./helpers/prismaMock";
import { getEvent, listEvents } from "../src/services/event.service";

const market = {
  id: 9,
  name: "Lapangan X",
  address: "Jl. X",
  latitude: -6.91,
  longitude: 107.61,
};
const ev = (id: number, start: string, end: string) => ({
  id,
  title: `Event ${id}`,
  organizer: null,
  description: null,
  startAt: new Date(start),
  endAt: new Date(end),
  marketId: 9,
  market,
});

describe("events", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T03:00:00Z")); // 10:00 Jakarta
  });
  afterEach(() => vi.useRealTimers());

  it("ONGOING today -> daysUntil 0", async () => {
    prisma.marketEvent.findUnique.mockResolvedValue(
      ev(1, "2026-11-07T01:00:00Z", "2026-11-07T06:00:00Z")
    );
    const e = await getEvent(1);
    expect(e).toMatchObject({
      status: "ONGOING",
      daysUntil: 0,
      startAt: "2026-11-07T08:00:00+07:00",
    });
  });

  it("UPCOMING in 5 days", async () => {
    prisma.marketEvent.findUnique.mockResolvedValue(
      ev(2, "2026-11-12T01:00:00Z", "2026-11-12T05:00:00Z")
    );
    expect(await getEvent(2)).toMatchObject({
      status: "UPCOMING",
      daysUntil: 5,
    });
  });

  it("ENDED -> daysUntil null", async () => {
    prisma.marketEvent.findUnique.mockResolvedValue(
      ev(3, "2026-11-05T01:00:00Z", "2026-11-05T05:00:00Z")
    );
    expect(await getEvent(3)).toMatchObject({
      status: "ENDED",
      daysUntil: null,
    });
  });

  it("404 for unknown event", async () => {
    prisma.marketEvent.findUnique.mockResolvedValue(null);
    await expect(getEvent(99)).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("list filters by status and fills distance only with lat/lon", async () => {
    prisma.marketEvent.findMany.mockResolvedValue([
      ev(1, "2026-11-07T01:00:00Z", "2026-11-07T06:00:00Z"),
      ev(2, "2026-11-12T01:00:00Z", "2026-11-12T05:00:00Z"),
    ]);
    const base = { range: "month" as const, radius: 10, limit: 20 };

    const upcoming = await listEvents({ ...base, status: "UPCOMING" });
    expect(upcoming.map((e) => e.id)).toEqual([2]);
    expect(upcoming[0].distanceKm).toBeNull();

    const near = await listEvents({ ...base, lat: -6.9, lon: 107.6 });
    expect(near).toHaveLength(2);
    expect(near[0].distanceKm).toBeGreaterThan(0);

    const far = await listEvents({
      ...base,
      lat: -6.2,
      lon: 106.8,
      radius: 10,
    });
    expect(far).toHaveLength(0);
  });
});
