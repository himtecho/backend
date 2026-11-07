import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock(
  "../src/config/prisma",
  async () => await import("./helpers/prismaMock")
);
import app from "../src/app";
import { prisma } from "./helpers/prismaMock";

const m = (
  id: number,
  lat: number,
  lon: number,
  openHours: string | null = null
) => ({
  id,
  name: `Pasar ${id}`,
  type: "TRADITIONAL",
  address: null,
  latitude: lat,
  longitude: lon,
  openHours,
});

describe("GET /api/v1/markets/nearby", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.price.findMany.mockResolvedValue([]);
    prisma.commodity.findMany.mockResolvedValue([]);
  });

  it("sorts by distance, drops markets outside the radius, isOpenNow null when unknown", async () => {
    prisma.market.findMany.mockResolvedValue([
      m(2, -6.91, 107.6), // ~1.1 km
      m(3, -7.5, 107.6), // ~67 km, outside radius
      m(1, -6.905, 107.605), // ~0.8 km
    ]);
    const res = await request(app).get(
      "/api/v1/markets/nearby?lat=-6.9&lon=107.6&radius=5"
    );
    expect(res.status).toBe(200);
    expect(res.body.data.map((x: { id: number }) => x.id)).toEqual([1, 2]);
    expect(
      res.body.data.map((x: { distanceKm: number }) => x.distanceKm)
    ).toEqual([0.8, 1.1]);
    expect(res.body.data[0].isOpenNow).toBeNull();
    expect(res.body.meta).toEqual({ count: 2, radiusKm: 5 });
  });

  it("topPrices has at most 3 commodities", async () => {
    prisma.market.findMany.mockResolvedValue([m(1, -6.905, 107.605)]);
    prisma.commodity.findMany.mockResolvedValue(
      [1, 2, 3, 4].map((id) => ({
        id,
        name: `C${id}`,
        unit: "kg",
        iconUrl: null,
      }))
    );
    const seed = [1, 2, 3, 4].map((c) => ({
      marketId: 1,
      commodityId: c,
      price: 1000 * c,
      source: "SEED",
      date: new Date("2026-11-07T00:00:00Z"),
    }));
    prisma.price.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(seed);

    const res = await request(app).get(
      "/api/v1/markets/nearby?lat=-6.9&lon=107.6"
    );
    expect(res.body.data[0].topPrices).toHaveLength(3);
  });
});
