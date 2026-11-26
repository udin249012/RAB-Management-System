import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole, ProjectStatus, RabItemMode, RabStatus } from "@rab/shared-types";

const stores: Record<string, Map<string, Record<string, unknown>>> = {
  admins: new Map(),
  company_settings: new Map(),
  projects: new Map(),
  material_categories: new Map(),
  materials: new Map(),
  work_categories: new Map(),
  work_items: new Map(),
  units: new Map(),
  ahsp: new Map(),
  rab_documents: new Map(),
  rab_items: new Map(),
  budget_realizations: new Map(),
  activity_logs: new Map(),
};

let seq = 0;

function makeQuery(collectionName: string, filters: Array<{ field: string; value: unknown }> = []) {
  const applyFilters = () => {
    const entries = Array.from(stores[collectionName]?.values() ?? []);
    return entries.filter((doc) => filters.every((f) => doc[f.field] === f.value));
  };

  return {
    where: (field: string, _op: string, value: unknown) =>
      makeQuery(collectionName, [...filters, { field, value }]),
    orderBy: (field: string, dir: "asc" | "desc" = "asc") => ({
      get: async () => {
        const docs = applyFilters().sort((a, b) => {
          const av = String(a[field] ?? "");
          const bv = String(b[field] ?? "");
          return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        });
        return {
          empty: docs.length === 0,
          docs: docs.map((d) => ({ id: String(d.id), data: () => d })),
        };
      },
    }),
    limit: (n: number) => ({
      get: async () => {
        const docs = applyFilters().slice(0, n);
        return {
          empty: docs.length === 0,
          docs: docs.map((d) => ({ id: String(d.id), data: () => d })),
        };
      },
    }),
    get: async () => {
      const docs = applyFilters();
      return {
        empty: docs.length === 0,
        docs: docs.map((d) => ({ id: String(d.id), data: () => d })),
      };
    },
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
        };
      },
    }),
  }),
}));

import { createApp } from "../src/app.js";

function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (err: Error | null, data: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

describe("Reports & Export PDF/Excel API", () => {
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
      name: "Pembangunan Jalan",
      location: "Semarang",
      ownerName: "Pemda",
      picName: "Andi",
      startDate: "2026-01-01",
      targetEndDate: "2026-08-01",
      status: ProjectStatus.IN_PROGRESS,
      updatedAt: "2026-04-01T00:00:00.000Z",
    });

    stores.rab_documents.set("rab-1", {
      id: "rab-1",
      documentNumber: "RAB/2026/04/0001",
      projectId: "prj-1",
      title: "RAB Jalan Utama",
      documentDate: "2026-04-01",
      version: 1,
      status: RabStatus.FINAL,
      subtotal: 100000000,
      overheadPercent: 10,
      overheadAmount: 10000000,
      profitPercent: 5,
      profitAmount: 5000000,
      taxPercent: 11,
      taxAmount: 12650000,
      additionalCosts: [],
      additionalCostsTotal: 0,
      grandTotal: 127650000,
      updatedAt: "2026-04-01T00:00:00.000Z",
    });

    stores.rab_items.set("item-1", {
      id: "item-1",
      rabId: "rab-1",
      sectionName: "Perkerasan",
      order: 1,
      mode: RabItemMode.MANUAL,
      name: "Aspal Hotmix",
      volume: 100,
      unitSnapshot: "m2",
      unitPriceSnapshot: 1000000,
      subtotal: 100000000,
    });

    stores.budget_realizations.set("real-1", {
      id: "real-1",
      projectId: "prj-1",
      rabDocumentId: "rab-1",
      category: "Material",
      transactionDate: "2026-04-12",
      description: "Pembelian Aspal",
      amount: 45000000,
    });
  });

  it("returns JSON datasets for all 8 report types", async () => {
    const reportTypes = [
      "rab",
      "projects",
      "materials",
      "work-items",
      "ahsp",
      "realizations",
      "budget-comparison",
      "rab-revisions",
    ];

    for (const type of reportTypes) {
      const res = await request(app).get(`/api/v1/reports/${type}`).set(authHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportType).toBe(type);
      expect(Array.isArray(res.body.data.columns)).toBe(true);
      expect(Array.isArray(res.body.data.rows)).toBe(true);
    }
  });

  it("exports report and single RAB as valid PDF and Excel buffers", async () => {
    const pdfReport = await request(app)
      .get("/api/v1/reports/budget-comparison?format=pdf")
      .set(authHeader)
      .buffer(true)
      .parse(binaryParser);
    expect(pdfReport.status).toBe(200);
    expect(pdfReport.headers["content-type"]).toContain("application/pdf");
    expect((pdfReport.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");

    const xlsxReport = await request(app)
      .get("/api/v1/reports/rab?format=excel")
      .set(authHeader)
      .buffer(true)
      .parse(binaryParser);
    expect(xlsxReport.status).toBe(200);
    expect(xlsxReport.headers["content-type"]).toContain("spreadsheetml.sheet");
    expect((xlsxReport.body as Buffer).subarray(0, 2).toString()).toBe("PK");

    const singleRabPdf = await request(app)
      .get("/api/v1/reports/rab/rab-1/export?format=pdf")
      .set(authHeader)
      .buffer(true)
      .parse(binaryParser);
    expect(singleRabPdf.status).toBe(200);
    expect((singleRabPdf.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");

    const singleRabExcel = await request(app)
      .get("/api/v1/reports/rab/rab-1/export?format=excel")
      .set(authHeader)
      .buffer(true)
      .parse(binaryParser);
    expect(singleRabExcel.status).toBe(200);
    expect((singleRabExcel.body as Buffer).subarray(0, 2).toString()).toBe("PK");
  });
});
