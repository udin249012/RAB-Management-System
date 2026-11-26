import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole, ProjectStatus, RabStatus } from "@rab/shared-types";

const stores: Record<string, Map<string, Record<string, unknown>>> = {
  admins: new Map(),
  projects: new Map(),
  rab_documents: new Map(),
  budget_realizations: new Map(),
  activity_logs: new Map(),
};

let seq = 0;

function makeQuery(collectionName: string, filters: Array<{ field: string; value: unknown }> = []) {
  const applyFilters = () => {
    const entries = Array.from(stores[collectionName]?.values() ?? []);
    return entries.filter((doc) => filters.every((f) => doc[f.field] === f.value));
  };

  const makeLimitOrOrder = (docsList: Record<string, unknown>[]) => ({
    limit: (n: number) => ({
      get: async () => ({
        empty: docsList.length === 0,
        docs: docsList.slice(0, n).map((d) => ({ id: String(d.id), data: () => d })),
      }),
    }),
    get: async () => ({
      empty: docsList.length === 0,
      docs: docsList.map((d) => ({ id: String(d.id), data: () => d })),
    }),
  });

  return {
    where: (field: string, _op: string, value: unknown) =>
      makeQuery(collectionName, [...filters, { field, value }]),
    orderBy: (field: string, dir: "asc" | "desc" = "asc") => {
      const sorted = applyFilters().sort((a, b) => {
        const av = String(a[field] ?? "");
        const bv = String(b[field] ?? "");
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      return makeLimitOrOrder(sorted);
    },
    limit: (n: number) => makeLimitOrOrder(applyFilters()).limit(n),
    get: async () => makeLimitOrOrder(applyFilters()).get(),
  };
}

vi.mock("../src/config/firebase.js", () => ({
  getFirebaseAuth: () => ({
    verifyIdToken: vi.fn(async () => ({ uid: "admin-1", email: "admin@company.co.id" })),
  }),
  getFirestoreDb: () => ({
    collection: (name: string) => ({
      ...makeQuery(name),
      doc: (id?: string) => {
        const docId = id ?? `${name}-${++seq}`;
        return {
          id: docId,
          get: async () => {
            const data = stores[name]?.get(docId);
            return { exists: Boolean(data), id: docId, data: () => data };
          },
          set: async (payload: Record<string, unknown>) => {
            stores[name]?.set(docId, payload);
          },
          update: async (fields: Record<string, unknown>) => {
            const existing = stores[name]?.get(docId);
            if (existing) {
              stores[name]?.set(docId, { ...existing, ...fields });
            }
          },
          delete: async () => {
            stores[name]?.delete(docId);
          },
        };
      },
    }),
  }),
}));

import { createApp } from "../src/app.js";

describe("Budget Monitoring & Dashboard API", () => {
  const app = createApp();
  const authHeader = { Authorization: "Bearer valid-admin-token" };

  beforeEach(() => {
    seq = 0;
    for (const store of Object.values(stores)) {
      store.clear();
    }
    stores.admins.set("admin-1", {
      id: "admin-1",
      uid: "admin-1",
      email: "admin@company.co.id",
      displayName: "Admin",
      role: AdminRole.ADMIN,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "system",
      updatedBy: "system",
    });

    stores.projects.set("prj-1", {
      id: "prj-1",
      code: "PRJ-2026-0001",
      name: "Pembangunan Gedung A",
      status: ProjectStatus.IN_PROGRESS,
      updatedAt: "2026-04-01T00:00:00.000Z",
    });
    stores.projects.set("prj-2", {
      id: "prj-2",
      code: "PRJ-2026-0002",
      name: "Renovasi Gudang",
      status: ProjectStatus.COMPLETED,
      updatedAt: "2026-04-02T00:00:00.000Z",
    });

    stores.rab_documents.set("rab-draft", {
      id: "rab-draft",
      documentNumber: "RAB/2026/04/0001",
      projectId: "prj-1",
      title: "RAB Draft",
      documentDate: "2026-04-01",
      status: RabStatus.DRAFT,
      grandTotal: 50000000,
      updatedAt: "2026-04-01T00:00:00.000Z",
    });

    stores.rab_documents.set("rab-final", {
      id: "rab-final",
      documentNumber: "RAB/2026/04/0002",
      projectId: "prj-1",
      title: "RAB Final Gedung A",
      documentDate: "2026-04-05",
      status: RabStatus.FINAL,
      grandTotal: 100000000,
      updatedAt: "2026-04-05T00:00:00.000Z",
    });
  });

  it("rejects realizations linked to non-FINAL RABs", async () => {
    const res = await request(app).post("/api/v1/realizations").set(authHeader).send({
      projectId: "prj-1",
      rabDocumentId: "rab-draft",
      category: "Material",
      transactionDate: "2026-04-10",
      description: "Beli Semen",
      amount: 10000000,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_RAB_STATUS");
  });

  it("records realizations against FINAL RAB, calculates variance & dashboard summary accurately", async () => {
    const r1 = await request(app).post("/api/v1/realizations").set(authHeader).send({
      projectId: "prj-1",
      rabDocumentId: "rab-final",
      category: "Material",
      transactionDate: "2026-04-10",
      description: "Pembelian Besi & Semen",
      amount: 60000000,
    });
    expect(r1.status).toBe(201);

    const r2 = await request(app).post("/api/v1/realizations").set(authHeader).send({
      projectId: "prj-1",
      rabDocumentId: "rab-final",
      category: "Tenaga Kerja",
      transactionDate: "2026-04-15",
      description: "Upah Tukang Minggu 1-2",
      amount: 50000000,
    });
    expect(r2.status).toBe(201);

    const summaryRes = await request(app).get("/api/v1/monitoring/summary").set(authHeader);
    expect(summaryRes.status).toBe(200);
    // Planned = 100,000,000 (only FINAL RAB!), Actual = 110,000,000, Remaining = -10,000,000
    expect(summaryRes.body.data.totalPlannedBudget).toBe(100000000);
    expect(summaryRes.body.data.totalActualRealization).toBe(110000000);
    expect(summaryRes.body.data.totalRemainingBudget).toBe(-10000000);
    expect(summaryRes.body.data.overallAbsorptionPercent).toBe(110);
    expect(summaryRes.body.data.projects[0].isOverBudget).toBe(true);
    expect(summaryRes.body.data.categoryBreakdown).toHaveLength(2);

    const dashRes = await request(app).get("/api/v1/monitoring/dashboard").set(authHeader);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.totalProjects).toBe(2);
    expect(dashRes.body.data.activeProjects).toBe(1);
    expect(dashRes.body.data.completedProjects).toBe(1);
    expect(dashRes.body.data.totalRabDocuments).toBe(2);
    expect(dashRes.body.data.totalPlannedBudget).toBe(100000000);
    expect(dashRes.body.data.totalRealizedCost).toBe(110000000);
    expect(dashRes.body.data.monthlyChart).toHaveLength(1);
    expect(dashRes.body.data.monthlyChart[0].month).toBe("2026-04");
    expect(dashRes.body.data.recentActivities.length).toBeGreaterThanOrEqual(2);
  });
});
