import { afterEach, describe, expect, it } from "vitest";
import { StorageProvider } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../src/config/collections.js";
import { isFirebaseAdminConfigured, normalizePrivateKey } from "../src/config/firebase.js";
import {
  isVercelBlobConfigured,
  resolvePrimaryProviderForCategory,
} from "../src/config/storage.js";

describe("Firebase & Storage foundation config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("normalizes escaped newlines in Firebase private key", () => {
    const raw = "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n";
    expect(normalizePrivateKey(raw)).toBe(
      "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----",
    );
    expect(normalizePrivateKey(undefined)).toBeUndefined();
  });

  it("defines all 16 required Firestore collections", () => {
    const collections = Object.values(FIRESTORE_COLLECTIONS);
    expect(collections).toHaveLength(16);
    expect(collections).toContain("admins");
    expect(collections).toContain("rab_documents");
    expect(collections).toContain("rab_items");
    expect(collections).toContain("budget_realizations");
    expect(collections).toContain("file_metadata");
  });

  it("detects emulator and credential configuration accurately", () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    process.env.USE_FIREBASE_EMULATOR = "false";

    expect(isFirebaseAdminConfigured()).toBe(false);

    process.env.USE_FIREBASE_EMULATOR = "true";
    expect(isFirebaseAdminConfigured()).toBe(true);
  });

  it("routes file categories to the right primary storage provider", () => {
    expect(resolvePrimaryProviderForCategory("IMAGE")).toBe(StorageProvider.FIREBASE_STORAGE);
    expect(resolvePrimaryProviderForCategory("SUPPORTING_DOC")).toBe(
      StorageProvider.FIREBASE_STORAGE,
    );
    expect(resolvePrimaryProviderForCategory("EXPORT_ARCHIVE")).toBe(StorageProvider.VERCEL_BLOB);

    delete process.env.BLOB_READ_WRITE_TOKEN;
    expect(isVercelBlobConfigured()).toBe(false);
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    expect(isVercelBlobConfigured()).toBe(true);
  });
});
