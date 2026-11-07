import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock(
  "../src/config/prisma",
  async () => await import("./helpers/prismaMock")
);
import app from "../src/app";

const expectValidationError = (res: request.Response) => {
  expect(res.status).toBe(400);
  expect(res.body.success).toBe(false);
  expect(res.body.error.code).toBe("VALIDATION_ERROR");
};

describe("validation and error format", () => {
  it("GET /api/v1/health", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" } });
  });

  it("unknown route -> 404 NOT_FOUND", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("markets/nearby requires lat and lon", async () => {
    expectValidationError(await request(app).get("/api/v1/markets/nearby"));
  });

  it("markets/nearby rejects non-numeric lat", async () => {
    expectValidationError(
      await request(app).get("/api/v1/markets/nearby?lat=abc&lon=107.6")
    );
  });

  it("markets/nearby rejects unknown type", async () => {
    expectValidationError(
      await request(app).get(
        "/api/v1/markets/nearby?lat=-6.9&lon=107.6&type=FOO"
      )
    );
  });

  it("commodities/:id rejects non-numeric id", async () => {
    expectValidationError(await request(app).get("/api/v1/commodities/abc"));
  });

  it("history only accepts days=7 or 30", async () => {
    expectValidationError(
      await request(app).get("/api/v1/commodities/1/history?days=14")
    );
  });

  it("commodity markets needs lat and lon together", async () => {
    expectValidationError(
      await request(app).get("/api/v1/commodities/1/markets?lat=-6.9")
    );
  });

  it("events rejects invalid range", async () => {
    expectValidationError(await request(app).get("/api/v1/events?range=year"));
  });

  it("malformed JSON body -> 400", async () => {
    const res = await request(app)
      .post("/api/v1/reports")
      .set("Content-Type", "application/json")
      .send("{bad");
    expectValidationError(res);
  });
});
