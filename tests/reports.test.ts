import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock(
  "../src/config/prisma",
  async () => await import("./helpers/prismaMock")
);
import app from "../src/app";
import { prisma } from "./helpers/prismaMock";

// NOTE: the report rate limiter allows 5 requests/hour/IP per test file. Keep this file at <= 5 requests.
describe("POST /api/v1/reports", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.market.findUnique.mockResolvedValue({ id: 3 });
    prisma.commodity.findUnique.mockResolvedValue({ id: 1 });
    prisma.price.findFirst.mockImplementation(
      async (args: { where: { date?: unknown } }) =>
        args.where.date
          ? null
          : {
              price: 74550,
              source: "PIHPS",
              date: new Date("2026-11-07T00:00:00Z"),
              createdAt: new Date(),
            }
    );
  });

  const post = (body: object) =>
    request(app).post("/api/v1/reports").send(body);

  it("404 when market does not exist", async () => {
    prisma.market.findUnique.mockResolvedValue(null);
    const res = await post({ marketId: 999, commodityId: 1, price: 72500 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("404 when commodity does not exist", async () => {
    prisma.commodity.findUnique.mockResolvedValue(null);
    const res = await post({ marketId: 3, commodityId: 999, price: 72500 });
    expect(res.status).toBe(404);
  });

  it("422 when price is below 50% / above 200% of the reference", async () => {
    const res = await post({ marketId: 3, commodityId: 1, price: 100 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("PRICE_OUT_OF_RANGE");
    expect(prisma.price.create).not.toHaveBeenCalled();
  });

  it("201 stores a CITIZEN report", async () => {
    prisma.price.create.mockResolvedValue({
      id: 101,
      marketId: 3,
      commodityId: 1,
      price: 72500,
      source: "CITIZEN",
      createdAt: new Date("2026-11-07T02:15:00Z"),
    });
    const res = await post({ marketId: 3, commodityId: 1, price: 72500 });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: 101,
      marketId: 3,
      commodityId: 1,
      price: 72500,
      source: "CITIZEN",
      createdAt: "2026-11-07T09:15:00+07:00",
    });
    expect(prisma.price.create.mock.calls[0][0].data.source).toBe("CITIZEN");
  });
});
