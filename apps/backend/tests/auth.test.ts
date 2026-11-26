import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole } from "@rab/shared-types";

const mockVerifyIdToken = vi.fn();
const mockAdminsStore = new Map<string, Record<string, unknown>>();
const mockActivityLogs: Record<string, unknown>[] = [];

vi.mock("../src/config/firebase.js", () => ({
  getFirebaseAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
  getFirestoreDb: () => ({
    collection: (name: string) => {
      if (name === "admins") {
        return {
          doc: (id: string) => ({
            id,
            get: async () => {
              const data = mockAdminsStore.get(id);
              return {
                exists: Boolean(data),
                id,
                data: () => data,
              };
            },
            update: async (fields: Record<string, unknown>) => {
              const current = mockAdminsStore.get(id);
              if (current) {
                mockAdminsStore.set(id, { ...current, ...fields });
              }
            },
          }),
        };
      }
      if (name === "activity_logs") {
        return {
          doc: () => {
            const id = `log-${mockActivityLogs.length + 1}`;
            return {
              id,
              set: async (payload: Record<string, unknown>) => {
                mockActivityLogs.push(payload);
              },
            };
          },
        };
      }
      throw new Error(`Unexpected collection: ${name}`);
    },
  }),
}));

import { createApp } from "../src/app.js";

describe("Authentication & Admin Authorization API", () => {
  const app = createApp();

  beforeEach(() => {
    mockVerifyIdToken.mockReset();
    mockAdminsStore.clear();
    mockActivityLogs.length = 0;
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when Firebase token verification fails", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

    const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer bad-token");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 403 when authenticated user is not registered in admins collection", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "user-123", email: "user@test.com" });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 403 when admin account is inactive", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "admin-inactive", email: "old@test.com" });
    mockAdminsStore.set("admin-inactive", {
      uid: "admin-inactive",
      email: "old@test.com",
      displayName: "Inactive Admin",
      role: AdminRole.ADMIN,
      isActive: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "system",
      updatedBy: "system",
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("verifies active admin session on POST /api/v1/auth/verify and logs activity", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "admin-1", email: "admin@company.co.id" });
    mockAdminsStore.set("admin-1", {
      uid: "admin-1",
      email: "admin@company.co.id",
      displayName: "Primary Admin",
      role: AdminRole.ADMIN,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "system",
      updatedBy: "system",
    });

    const res = await request(app)
      .post("/api/v1/auth/verify")
      .set("Authorization", "Bearer valid-admin-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.admin.uid).toBe("admin-1");
    expect(res.body.data.admin.lastLoginAt).toBeDefined();
    expect(mockActivityLogs).toHaveLength(1);
    expect(mockActivityLogs[0]?.action).toBe("ADMIN_SESSION_VERIFIED");
  });

  it("returns current active admin profile on GET /api/v1/auth/me", async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: "admin-1", email: "admin@company.co.id" });
    mockAdminsStore.set("admin-1", {
      uid: "admin-1",
      email: "admin@company.co.id",
      displayName: "Primary Admin",
      role: AdminRole.ADMIN,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "system",
      updatedBy: "system",
    });

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer valid-admin-token");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.admin.email).toBe("admin@company.co.id");
  });
});
