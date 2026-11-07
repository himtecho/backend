import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../src/config/prisma",
  async () => await import("./helpers/prismaMock")
);
import { prisma } from "./helpers/prismaMock";
import {
  getEffectivePrices,
  getReference,
} from "../src/services/price.service";
import { priceSummary } from "../src/services/commodity.service";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("getReference", () => {
  beforeEach(() => vi.resetAllMocks());

  it("computes 7-day change and trend", async () => {
    prisma.price.findFirst
      .mockResolvedValueOnce({
        price: 74550,
        source: "PIHPS",
        date: d("2026-11-07"),
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        price: 69000,
        source: "PIHPS",
        date: d("2026-10-31"),
        createdAt: new Date(),
      });
    const ref = await getReference(1);
    expect(ref).toMatchObject({
      price: 74550,
      previousPrice: 69000,
      changePercent: 8,
      trend: "UP",
    });
    expect(ref?.sourceLabel).toBe("Harga acuan kota (PIHPS BI)");
  });

  it("returns null without data; STABLE when no previous price", async () => {
    prisma.price.findFirst.mockResolvedValueOnce(null);
    expect(await getReference(1)).toBeNull();

    prisma.price.findFirst
      .mockResolvedValueOnce({
        price: 100,
        source: "PIHPS",
        date: d("2026-11-07"),
        createdAt: new Date(),
      })
      .mockResolvedValueOnce(null);
    expect(await getReference(1)).toMatchObject({
      changePercent: 0,
      trend: "STABLE",
      previousPrice: null,
    });
  });
});

describe("getEffectivePrices", () => {
  beforeEach(() => vi.resetAllMocks());

  it("uses median of citizen reports, falls back to SEED, newest SEED wins", async () => {
    const cit = (price: number, min: number) => ({
      marketId: 1,
      commodityId: 1,
      price,
      source: "CITIZEN",
      date: d("2026-11-07"),
      createdAt: new Date(Date.UTC(2026, 10, 7, 3, 0) - min * 60_000),
    });
    prisma.price.findMany
      .mockResolvedValueOnce([cit(74000, 0), cit(72500, 5), cit(71000, 10)]) // citizen, newest first
      .mockResolvedValueOnce([
        {
          marketId: 1,
          commodityId: 1,
          price: 70000,
          source: "SEED",
          date: d("2026-11-07"),
        },
        {
          marketId: 2,
          commodityId: 1,
          price: 69000,
          source: "SEED",
          date: d("2026-11-07"),
        },
        {
          marketId: 2,
          commodityId: 1,
          price: 50000,
          source: "SEED",
          date: d("2026-10-01"),
        }, // older, ignored
      ]);

    const eff = await getEffectivePrices([1, 2], 1);
    expect(eff.get(1)?.get(1)).toMatchObject({
      price: 72500,
      source: "CITIZEN",
    });
    expect(eff.get(2)?.get(1)).toEqual({
      price: 69000,
      source: "SEED",
      date: "2026-11-07",
    });
  });

  it("returns empty map for no markets", async () => {
    expect((await getEffectivePrices([])).size).toBe(0);
  });
});

describe("priceSummary", () => {
  beforeEach(() => vi.resetAllMocks());

  it("builds items, topRisers and topFallers", async () => {
    prisma.commodity.findMany.mockResolvedValue([
      { id: 1, name: "Cabai", unit: "kg", iconUrl: null },
      { id: 2, name: "Ayam", unit: "kg", iconUrl: null },
      { id: 3, name: "Beras", unit: "kg", iconUrl: null },
    ]);
    const latest: Record<number, number> = { 1: 74550, 2: 30000, 3: 13800 };
    const prev: Record<number, number> = { 1: 69000, 2: 31000, 3: 13800 };
    prisma.price.findFirst.mockImplementation(
      async (args: { where: { commodityId: number; date?: unknown } }) => {
        const id = args.where.commodityId;
        return {
          price: args.where.date ? prev[id] : latest[id],
          source: "PIHPS",
          date: d("2026-11-07"),
          createdAt: new Date("2026-11-07T01:30:00Z"),
        };
      }
    );

    const s = await priceSummary();
    expect(s.items).toHaveLength(3);
    expect(s.items[0]).toMatchObject({
      commodityId: 1,
      changePercent: 8,
      trend: "UP",
      previousPrice: 69000,
    });
    expect(s.topRisers.map((i) => i.commodityId)).toEqual([1]);
    expect(s.topFallers.map((i) => i.commodityId)).toEqual([2]);
    expect(s.items[2].trend).toBe("STABLE");
    expect(s.updatedAt).toBe("2026-11-07T08:30:00+07:00");
  });
});
