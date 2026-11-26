import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminRole, StorageProvider } from "@rab/shared-types";

const mockBlobPut = vi.fn();
const mockBlobDel = vi.fn();

vi.mock("@vercel/blob", () => ({
  put: (...args: unknown[]) => mockBlobPut(...args),
  del: (...args: unknown[]) => mockBlobDel(...args),
}));

const stores: Record<string, Map<string, Record<string, unknown>>> = {
  admins: new Map(),
  company_settings: new Map(),
  file_metadata: new Map(),
  projects: new Map(),
  rab_documents: new Map(),
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

function binaryParser(
  res: NodeJS.ReadableStream,
  callback: (err: Error | null, data: Buffer) => void,
) {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}

describe("Settings, Users & Vercel Blob Storage Integration", () => {
  const app = createApp();
  const authHeader = { Authorization: "Bearer valid-admin-token" };
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    seq = 0;
    mockBlobPut.mockReset();
    mockBlobDel.mockReset();
    for (const store of Object.values(stores)) {
      store.clear();
    }
    stores.admins.set("admin-1", {
      id: "admin-1",
      uid: "admin-1",
      email: "admin@company.co.id",
      displayName: "Admin Awal",
      role: AdminRole.ADMIN,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      createdBy: "system",
      updatedBy: "system",
    });
  });

  afterEach(() => {
    if (originalBlobToken === undefined) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    } else {
      process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
    }
  });

  it("updates company settings with logo metadata and updates admin profile", async () => {
    const logoMeta = await request(app).post("/api/v1/files/metadata").set(authHeader).send({
      storageProvider: StorageProvider.FIREBASE_STORAGE,
      storagePath: "company/logo/logo.png",
      url: "https://storage.googleapis.com/demo/logo.png",
      originalName: "logo.png",
      mimeType: "image/png",
      sizeBytes: 12000,
      entityType: "company_settings",
      entityId: "default",
    });
    expect(logoMeta.status).toBe(201);

    const updateSettings = await request(app).put("/api/v1/settings").set(authHeader).send({
      companyName: "PT Nusantara Konstruksi",
      address: "Jl. Gatot Subroto Kav. 5",
      phone: "021-888999",
      email: "corp@nusantara.co.id",
      logoFileId: logoMeta.body.data.id,
      currency: "IDR",
      projectCodeFormat: "NK-{YYYY}-{SEQ}",
      rabNumberFormat: "RAB/NK/{YYYY}/{SEQ}",
      defaultTaxPercent: 11,
      defaultOverheadPercent: 12,
      defaultProfitPercent: 6,
    });
    expect(updateSettings.status).toBe(200);
    expect(updateSettings.body.data.companyName).toBe("PT Nusantara Konstruksi");
    expect(updateSettings.body.data.logoUrl).toBe("https://storage.googleapis.com/demo/logo.png");

    const profileRes = await request(app)
      .patch("/api/v1/users/me")
      .set(authHeader)
      .send({ displayName: "Direktur Anggaran" });
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.displayName).toBe("Direktur Anggaran");

    const adminsRes = await request(app).get("/api/v1/users/admins").set(authHeader);
    expect(adminsRes.status).toBe(200);
    expect(adminsRes.body.data).toHaveLength(1);
  });

  it("archives exported PDF to Vercel Blob when BLOB_READ_WRITE_TOKEN is configured and lists/deletes archive", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    mockBlobPut.mockResolvedValueOnce({
      url: "https://blob.vercel-storage.com/exports/reports/laporan-rab-abc.pdf",
      pathname: "exports/reports/laporan-rab-abc.pdf",
    });
    mockBlobDel.mockResolvedValueOnce(undefined);

    const exportRes = await request(app)
      .get("/api/v1/reports/rab?format=pdf")
      .set(authHeader)
      .buffer(true)
      .parse(binaryParser);

    expect(exportRes.status).toBe(200);
    expect(mockBlobPut).toHaveBeenCalledTimes(1);

    const archivesRes = await request(app).get("/api/v1/files/archives").set(authHeader);
    expect(archivesRes.status).toBe(200);
    expect(archivesRes.body.data).toHaveLength(1);
    expect(archivesRes.body.data[0].storageProvider).toBe(StorageProvider.VERCEL_BLOB);

    const archiveId = archivesRes.body.data[0].id as string;
    const delRes = await request(app).delete(`/api/v1/files/${archiveId}`).set(authHeader);
    expect(delRes.status).toBe(200);
    expect(mockBlobDel).toHaveBeenCalledTimes(1);
  });
});
