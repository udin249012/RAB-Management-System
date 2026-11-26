import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole, MaterialCategoryGroup, WorkCategoryType } from "@rab/shared-types";

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

describe("Catalog & Master Data API", () => {
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
  });

  it("creates, rejects duplicate code, and protects referenced units from deletion", async () => {
    const unitRes = await request(app)
      .post("/api/v1/units")
      .set(authHeader)
      .send({ code: "SAK", name: "Sak 50kg", symbol: "sak" });

    expect(unitRes.status).toBe(201);
    const unitId = unitRes.body.data.id as string;

    const dupRes = await request(app)
      .post("/api/v1/units")
      .set(authHeader)
      .send({ code: "SAK", name: "Duplikat", symbol: "sak" });
    expect(dupRes.status).toBe(409);

    const catRes = await request(app)
      .post("/api/v1/material-categories")
      .set(authHeader)
      .send({ code: "MAT-STR", name: "Material Struktur", group: MaterialCategoryGroup.MATERIAL });
    expect(catRes.status).toBe(201);
    const categoryId = catRes.body.data.id as string;

    const matRes = await request(app).post("/api/v1/materials").set(authHeader).send({
      code: "SMN-50",
      name: "Semen Portland",
      categoryId,
      unitId,
      unitPrice: 70000,
    });
    expect(matRes.status).toBe(201);

    const deleteUnitRes = await request(app).delete(`/api/v1/units/${unitId}`).set(authHeader);
    expect(deleteUnitRes.status).toBe(409);
  });

  it("tracks material price history on update, filters list, and exports Excel", async () => {
    const unitRes = await request(app)
      .post("/api/v1/units")
      .set(authHeader)
      .send({ code: "M3", name: "Meter Kubik", symbol: "m3" });
    const catRes = await request(app)
      .post("/api/v1/material-categories")
      .set(authHeader)
      .send({ code: "MAT-AG", name: "Agregat", group: MaterialCategoryGroup.MATERIAL });

    const matRes = await request(app).post("/api/v1/materials").set(authHeader).send({
      code: "PSR-01",
      name: "Pasir Beton",
      categoryId: catRes.body.data.id,
      unitId: unitRes.body.data.id,
      unitPrice: 280000,
      brand: "Lokal",
    });

    const matId = matRes.body.data.id as string;
    expect(matRes.body.data.priceHistory).toHaveLength(1);

    const updateRes = await request(app).put(`/api/v1/materials/${matId}`).set(authHeader).send({
      unitPrice: 310000,
      priceChangeReason: "Kenaikan ongkos angkut",
    });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.unitPrice).toBe(310000);
    expect(updateRes.body.data.priceHistory).toHaveLength(2);
    expect(updateRes.body.data.priceHistory[0].previousPrice).toBe(280000);
    expect(updateRes.body.data.priceHistory[0].newPrice).toBe(310000);

    const listRes = await request(app)
      .get("/api/v1/materials?search=Pasir&page=1&limit=10")
      .set(authHeader);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.meta.total).toBe(1);

    const exportRes = await request(app)
      .get("/api/v1/materials/export")
      .set(authHeader)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers["content-type"]).toContain("spreadsheetml.sheet");
    expect((exportRes.body as Buffer).subarray(0, 2).toString()).toBe("PK");
  });

  it("creates, lists, and deletes work categories and work items", async () => {
    const unitRes = await request(app)
      .post("/api/v1/units")
      .set(authHeader)
      .send({ code: "M2", name: "Meter Persegi", symbol: "m2" });
    const wCatRes = await request(app)
      .post("/api/v1/work-categories")
      .set(authHeader)
      .send({ code: "PKJ-DND", name: "Pekerjaan Dinding", type: WorkCategoryType.CONSTRUCTION });

    expect(wCatRes.status).toBe(201);

    const workRes = await request(app).post("/api/v1/work-items").set(authHeader).send({
      code: "DND-01",
      name: "Pasangan Bata Merah 1:4",
      categoryId: wCatRes.body.data.id,
      unitId: unitRes.body.data.id,
      basePrice: 145000,
    });
    expect(workRes.status).toBe(201);

    const listRes = await request(app).get("/api/v1/work-items").set(authHeader);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const delRes = await request(app)
      .delete(`/api/v1/work-items/${workRes.body.data.id}`)
      .set(authHeader);
    expect(delRes.status).toBe(200);
  });
});
