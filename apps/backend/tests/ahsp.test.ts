import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole, AhspComponentType } from "@rab/shared-types";

const stores: Record<string, Map<string, Record<string, unknown>>> = {
  admins: new Map(),
  units: new Map(),
  material_categories: new Map(),
  materials: new Map(),
  work_categories: new Map(),
  work_items: new Map(),
  ahsp: new Map(),
  ahsp_components: new Map(),
  rab_items: new Map(),
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

describe("AHSP API", () => {
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

    stores.units.set("u-m3", {
      id: "u-m3",
      code: "M3",
      name: "Meter Kubik",
      symbol: "m3",
      isActive: true,
    });
    stores.units.set("u-sak", {
      id: "u-sak",
      code: "SAK",
      name: "Sak",
      symbol: "sak",
      isActive: true,
    });
    stores.units.set("u-oh", {
      id: "u-oh",
      code: "OH",
      name: "Orang Hari",
      symbol: "OH",
      isActive: true,
    });
    stores.units.set("u-jam", {
      id: "u-jam",
      code: "JAM",
      name: "Jam",
      symbol: "jam",
      isActive: true,
    });

    stores.materials.set("mat-semen", {
      id: "mat-semen",
      code: "SMN",
      name: "Semen 50kg",
      categoryId: "cat-1",
      unitId: "u-sak",
      unitPrice: 70000,
      isActive: true,
    });
    stores.materials.set("eq-molen", {
      id: "eq-molen",
      code: "EQ-MLN",
      name: "Sewa Concrete Mixer",
      categoryId: "cat-eq",
      unitId: "u-jam",
      unitPrice: 100000,
      isActive: true,
    });

    stores.work_items.set("work-cor", {
      id: "work-cor",
      code: "STR-01",
      name: "Pengecoran Beton K-250",
      categoryId: "wc-1",
      unitId: "u-m3",
      isActive: true,
    });
    stores.work_items.set("labor-tukang", {
      id: "labor-tukang",
      code: "TK-01",
      name: "Tukang Batu",
      categoryId: "wc-labor",
      unitId: "u-oh",
      basePrice: 150000,
      isActive: true,
    });
    stores.work_items.set("labor-no-price", {
      id: "labor-no-price",
      code: "TK-02",
      name: "Pekerja Tanpa Harga",
      categoryId: "wc-labor",
      unitId: "u-oh",
      isActive: true,
    });
  });

  it("creates AHSP, calculates totals from catalog, links work item, recalculates, copies, and guards deletion", async () => {
    const createRes = await request(app)
      .post("/api/v1/ahsp")
      .set(authHeader)
      .send({
        code: "AHSP-STR-01",
        workItemId: "work-cor",
        name: "Analisa Beton K-250",
        sourceReference: "SNI 7394:2008",
        components: [
          { componentType: AhspComponentType.MATERIAL, referenceId: "mat-semen", coefficient: 7 },
          { componentType: AhspComponentType.LABOR, referenceId: "labor-tukang", coefficient: 0.5 },
          {
            componentType: AhspComponentType.EQUIPMENT,
            referenceId: "eq-molen",
            coefficient: 0.25,
          },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.materialTotal).toBe(490000);
    expect(createRes.body.data.laborTotal).toBe(75000);
    expect(createRes.body.data.equipmentTotal).toBe(25000);
    expect(createRes.body.data.unitPriceTotal).toBe(590000);
    expect(createRes.body.data.version).toBe(1);
    expect(stores.work_items.get("work-cor")?.ahspId).toBe(createRes.body.data.id);

    const ahspId = createRes.body.data.id as string;

    // Update catalog price and recalculate
    const currentMat = stores.materials.get("mat-semen")!;
    stores.materials.set("mat-semen", { ...currentMat, unitPrice: 80000 });

    const recalcRes = await request(app).post(`/api/v1/ahsp/${ahspId}/recalculate`).set(authHeader);

    expect(recalcRes.status).toBe(200);
    expect(recalcRes.body.data.materialTotal).toBe(560000);
    expect(recalcRes.body.data.unitPriceTotal).toBe(660000);
    expect(recalcRes.body.data.version).toBe(2);
    expect(recalcRes.body.data.revisionHistory).toHaveLength(2);

    // Copy AHSP
    const copyRes = await request(app)
      .post(`/api/v1/ahsp/${ahspId}/copy`)
      .set(authHeader)
      .send({ code: "AHSP-STR-02", name: "Analisa Beton K-250 Copy" });
    expect(copyRes.status).toBe(201);
    expect(copyRes.body.data.version).toBe(1);
    expect(copyRes.body.data.components).toHaveLength(3);

    // Block deletion when referenced in RAB
    stores.rab_items.set("rab-item-1", { id: "rab-item-1", ahspId });
    const blockedDelete = await request(app).delete(`/api/v1/ahsp/${ahspId}`).set(authHeader);
    expect(blockedDelete.status).toBe(409);

    // Allow deletion when not referenced
    const copyId = copyRes.body.data.id as string;
    const allowedDelete = await request(app).delete(`/api/v1/ahsp/${copyId}`).set(authHeader);
    expect(allowedDelete.status).toBe(200);
  });

  it("rejects labor component without basePrice", async () => {
    const res = await request(app)
      .post("/api/v1/ahsp")
      .set(authHeader)
      .send({
        code: "AHSP-BAD",
        workItemId: "work-cor",
        name: "Invalid Labor",
        components: [
          { componentType: AhspComponentType.LABOR, referenceId: "labor-no-price", coefficient: 1 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_BASE_PRICE");
  });
});
