import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler } from "../src/middlewares/errorHandler.js";
import { AppError } from "../src/utils/AppError.js";

vi.mock("../src/config/firebase.js", () => ({
  getFirebaseAuth: () => ({
    verifyIdToken: vi.fn(async () => {
      throw new Error("invalid");
    }),
  }),
  getFirestoreDb: () => ({}),
}));

import { createApp } from "../src/app.js";

describe("Security & Centralized Error Handling", () => {
  const app = createApp();
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("blocks unauthenticated requests (401) across all protected API modules", async () => {
    const protectedGets = [
      "/api/v1/auth/me",
      "/api/v1/units",
      "/api/v1/material-categories",
      "/api/v1/materials",
      "/api/v1/work-categories",
      "/api/v1/work-items",
      "/api/v1/ahsp",
      "/api/v1/projects",
      "/api/v1/files/archives",
      "/api/v1/rab",
      "/api/v1/realizations",
      "/api/v1/monitoring/summary",
      "/api/v1/monitoring/dashboard",
      "/api/v1/reports/rab",
      "/api/v1/settings",
      "/api/v1/users/admins",
    ];

    for (const path of protectedGets) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("formats ZodError, AppError, and hides internal error messages in production", async () => {
    const testApp = express();

    testApp.get("/zod-err", (_req: Request, _res: Response, next: NextFunction) => {
      const schema = z.object({ count: z.number().positive() });
      const parsed = schema.safeParse({ count: -1 });
      if (!parsed.success) {
        next(parsed.error);
      }
    });

    testApp.get("/app-err", (_req: Request, _res: Response, next: NextFunction) => {
      next(new AppError("Akses ditolak", 403, "FORBIDDEN"));
    });

    testApp.get("/unexpected-err", (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error("Sensitive internal database connection trace"));
    });

    testApp.use(errorHandler);

    const zodRes = await request(testApp).get("/zod-err");
    expect(zodRes.status).toBe(400);
    expect(zodRes.body.error.code).toBe("VALIDATION_ERROR");
    expect(zodRes.body.error.details[0].field).toBe("count");

    const appRes = await request(testApp).get("/app-err");
    expect(appRes.status).toBe(403);
    expect(appRes.body.error.code).toBe("FORBIDDEN");

    process.env.NODE_ENV = "production";
    const prodErrRes = await request(testApp).get("/unexpected-err");
    expect(prodErrRes.status).toBe(500);
    expect(prodErrRes.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(prodErrRes.body.error.message).toBe("Terjadi kesalahan pada server");
  });
});
