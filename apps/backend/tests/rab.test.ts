import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole, AhspComponentType, RabItemMode, RabStatus } from "@rab/shared-types";

const stores: Record<string, Map<string, Record<string, unknown>>> = {
  admins: new Map(),
  company_settings: new Map(),
  units: new Map(),
  projects: new Map(),
  ahsp: new Map(),
  ahsp_components: new Map(),
  rab_documents: new Map(),
  rab_items: new Map(),
  budget_realizations: new Map(),
  file_metadata: new Map(),
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

describe("RAB Management API", () => {
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

    stores.units.set("u-m3", { id: "u-m3", code: "M3", name: "Meter Kubik", symbol: "m3" });

    stores.projects.set("prj-1", {
      id: "prj-1",
      code: "PRJ-2026-0001",
      name: "Pembangunan Gudang",
      location: "Bekasi",
      ownerName: "PT Logistik",
      picName: "Hendra",
      status: "IN_PROGRESS",
    });

    stores.ahsp.set("ahsp-1", {
      id: "ahsp-1",
      code: "AHSP-COR",
      workItemId: "work-1",
      name: "Pengecoran Beton K-250",
      unitId: "u-m3",
      version: 1,
      materialTotal: 500000,
      laborTotal: 200000,
      equipmentTotal: 100000,
      unitPriceTotal: 800000,
      isActive: true,
    });

    stores.ahsp_components.set("comp-1", {
      id: "comp-1",
      ahspId: "ahsp-1",
      componentType: AhspComponentType.MATERIAL,
      referenceId: "mat-semen",
      referenceCode: "SMN",
      referenceName: "Semen 50kg",
      unitId: "u-sak",
      unitSymbol: "sak",
      coefficient: 7,
      unitPrice: 70000,
      subtotal: 490000,
    });
  });

  it("creates dual-mode RAB, preserves snapshots despite AHSP changes, enforces immutability on finalize, and handles revisions", async () => {
    const createRes = await request(app)
      .post("/api/v1/rab")
      .set(authHeader)
      .send({
        projectId: "prj-1",
        title: "RAB Pembangunan Gudang",
        documentDate: "2026-04-01",
        overheadPercent: 10,
        profitPercent: 5,
        taxPercent: 11,
        additionalCosts: [{ name: "Mobilisasi", amount: 500000 }],
        items: [
          {
            sectionName: "Persiapan",
            order: 1,
            mode: RabItemMode.MANUAL,
            name: "Pembersihan Area",
            volume: 1,
            unitSnapshot: "ls",
            unitPriceSnapshot: 2000000,
          },
          {
            sectionName: "Struktur",
            order: 2,
            mode: RabItemMode.AHSP,
            ahspId: "ahsp-1",
            volume: 10,
          },
        ],
      });

    expect(createRes.status).toBe(201);
    const rab1Id = createRes.body.data.id as string;
    // Subtotal = 2,000,000 + (10 * 800,000) = 10,000,000
    // Overhead 10% = 1,000,000; Profit 5% = 500,000; Add = 500,000 -> base 12,000,000
    // Tax 11% = 1,320,000 -> Grand Total = 13,320,000
    expect(createRes.body.data.subtotal).toBe(10000000);
    expect(createRes.body.data.grandTotal).toBe(13320000);
    expect(createRes.body.data.resourceSummary[0].totalQuantity).toBe(70);

    // Mutate AHSP unitPriceTotal afterwards -> existing RAB must NOT change
    const ahspData = stores.ahsp.get("ahsp-1")!;
    stores.ahsp.set("ahsp-1", { ...ahspData, unitPriceTotal: 1500000 });

    const fetchedAfterCatalogChange = await request(app)
      .get(`/api/v1/rab/${rab1Id}`)
      .set(authHeader);
    expect(fetchedAfterCatalogChange.body.data.grandTotal).toBe(13320000);
    expect(fetchedAfterCatalogChange.body.data.items[1].unitPriceSnapshot).toBe(800000);

    // Finalize RAB v1
    const finalRes = await request(app).post(`/api/v1/rab/${rab1Id}/finalize`).set(authHeader);
    expect(finalRes.status).toBe(200);
    expect(finalRes.body.data.status).toBe(RabStatus.FINAL);

    // Attempt direct edit or delete on FINAL RAB -> 409 IMMUTABLE_RAB_DOCUMENT
    const editFinalRes = await request(app)
      .put(`/api/v1/rab/${rab1Id}`)
      .set(authHeader)
      .send({ title: "Ubah Paksa" });
    expect(editFinalRes.status).toBe(409);

    const deleteFinalRes = await request(app).delete(`/api/v1/rab/${rab1Id}`).set(authHeader);
    expect(deleteFinalRes.status).toBe(409);

    // Create Revision v2 from FINAL v1
    const revRes = await request(app).post(`/api/v1/rab/${rab1Id}/revisions`).set(authHeader);
    expect(revRes.status).toBe(201);
    expect(revRes.body.data.version).toBe(2);
    expect(revRes.body.data.status).toBe(RabStatus.DRAFT);
    expect(revRes.body.data.parentRabId).toBe(rab1Id);
    expect(revRes.body.data.items).toHaveLength(2);

    // Finalizing v2 archives v1
    const rab2Id = revRes.body.data.id as string;
    const finalizeRevRes = await request(app)
      .post(`/api/v1/rab/${rab2Id}/finalize`)
      .set(authHeader);
    expect(finalizeRevRes.status).toBe(200);
    expect(stores.rab_documents.get(rab1Id)?.status).toBe(RabStatus.ARCHIVED);
  });
});
