import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("app", () => {
  it("GET / returns the health message", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
