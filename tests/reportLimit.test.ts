import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock(
  "../src/config/prisma",
  async () => await import("./helpers/prismaMock")
);
import app from "../src/app";

describe("report rate limit", () => {
  it("returns 400 for invalid body (decimal price, zod) and 429 on the 6th request", async () => {
    const send = () =>
      request(app)
        .post("/api/v1/reports")
        .send({ marketId: 1, commodityId: 1, price: 100.5 });

    for (let i = 0; i < 5; i++) {
      const res = await send();
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
    const limited = await send();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
  });
});
