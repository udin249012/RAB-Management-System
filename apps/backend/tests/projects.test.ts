import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole, ProjectStatus, StorageProvider } from "@rab/shared-types";

const stores: Record<string, Map<string, Record<string, unknown>>> = {
  admins: new Map(),
  company_settings: new Map(),
  projects: new Map(),
  file_metadata: new Map(),
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

describe("Projects & Files Metadata API", () => {
  const app = createApp();
  const authHeader = { Authorization: "Bearer valid-admin-token" };
  const currentYear = new Date().getFullYear();

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

  it("generates sequential project codes, filters projects, attaches file metadata, and guards deletion", async () => {
    const p1 = await request(app).post("/api/v1/projects").set(authHeader).send({
      name: "Renovasi Kantor Pusat",
      location: "Jakarta",
      ownerName: "PT A",
      picName: "Budi",
      startDate: "2026-02-01",
      targetEndDate: "2026-06-30",
      status: ProjectStatus.IN_PROGRESS,
    });
    expect(p1.status).toBe(201);
    expect(p1.body.data.code).toBe(`PRJ-${currentYear}-0001`);

    const p2 = await request(app).post("/api/v1/projects").set(authHeader).send({
      name: "Gudang Logistik",
      location: "Surabaya",
      ownerName: "PT B",
      picName: "Siti",
      startDate: "2026-03-01",
      targetEndDate: "2026-09-30",
      status: ProjectStatus.PLANNING,
    });
    expect(p2.status).toBe(201);
    expect(p2.body.data.code).toBe(`PRJ-${currentYear}-0002`);

    const filteredRes = await request(app)
      .get("/api/v1/projects?status=IN_PROGRESS&search=Jakarta")
      .set(authHeader);
    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body.data).toHaveLength(1);
    expect(filteredRes.body.data[0].id).toBe(p1.body.data.id);

    // Register file metadata & attach to project 1
    const fileRes = await request(app).post("/api/v1/files/metadata").set(authHeader).send({
      storageProvider: StorageProvider.FIREBASE_STORAGE,
      storagePath: "projects/documents/p1/site-plan.pdf",
      url: "https://storage.googleapis.com/example/site-plan.pdf",
      originalName: "site-plan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 204800,
      entityType: "projects",
      entityId: p1.body.data.id,
    });
    expect(fileRes.status).toBe(201);

    await request(app)
      .put(`/api/v1/projects/${p1.body.data.id}`)
      .set(authHeader)
      .send({ documentFileIds: [fileRes.body.data.id] });

    const detailRes = await request(app).get(`/api/v1/projects/${p1.body.data.id}`).set(authHeader);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.documents).toHaveLength(1);
    expect(detailRes.body.data.documents[0].originalName).toBe("site-plan.pdf");

    // Block deletion when RAB document exists
    stores.rab_documents.set("rab-1", { id: "rab-1", projectId: p1.body.data.id });
    const blockedDelete = await request(app)
      .delete(`/api/v1/projects/${p1.body.data.id}`)
      .set(authHeader);
    expect(blockedDelete.status).toBe(409);

    // Allow deletion of unreferenced project 2
    const okDelete = await request(app)
      .delete(`/api/v1/projects/${p2.body.data.id}`)
      .set(authHeader);
    expect(okDelete.status).toBe(200);
  });

  it("rejects invalid project dates on create and update", async () => {
    const badCreate = await request(app).post("/api/v1/projects").set(authHeader).send({
      name: "Proyek Invalid",
      location: "Depok",
      ownerName: "PT X",
      picName: "Rudi",
      startDate: "2026-06-10",
      targetEndDate: "2026-05-01",
    });
    expect(badCreate.status).toBe(400);

    const goodCreate = await request(app).post("/api/v1/projects").set(authHeader).send({
      name: "Proyek Valid",
      location: "Depok",
      ownerName: "PT X",
      picName: "Rudi",
      startDate: "2026-06-10",
      targetEndDate: "2026-07-01",
    });
    const badUpdate = await request(app)
      .put(`/api/v1/projects/${goodCreate.body.data.id}`)
      .set(authHeader)
      .send({ targetEndDate: "2026-05-01" });
    expect(badUpdate.status).toBe(400);
  });
});
