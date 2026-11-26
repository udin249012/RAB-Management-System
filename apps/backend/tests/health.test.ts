import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("Backend foundation endpoints", () => {
  const app = createApp();

  it("GET /api/v1/health returns healthy status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.service).toBe("rab-management-backend");
  });

  it("returns standardized 404 JSON error for unknown routes", async () => {
    const response = await request(app).get("/api/v1/non-existent");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
