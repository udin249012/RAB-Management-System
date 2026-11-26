import { StorageProvider } from "@rab/shared-types";
import { loadEnvironment } from "./environment.js";
import { AppError } from "../utils/AppError.js";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const FIREBASE_STORAGE_PATHS = {
  COMPANY_LOGO: "company/logo",
  MATERIAL_PHOTOS: "catalog/materials",
  PROJECT_COVERS: "projects/covers",
  PROJECT_DOCUMENTS: "projects/documents",
  REALIZATION_EVIDENCE: "monitoring/evidences",
} as const;

export const VERCEL_BLOB_PREFIXES = {
  RAB_EXPORTS: "exports/rab",
  REPORTS: "exports/reports",
} as const;

export function getVercelBlobToken(): string {
  const env = loadEnvironment();
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new AppError(
      "BLOB_READ_WRITE_TOKEN belum dikonfigurasi untuk arsip Vercel Blob",
      500,
      "VERCEL_BLOB_CONFIG_MISSING",
    );
  }
  return env.BLOB_READ_WRITE_TOKEN;
}

export function isVercelBlobConfigured(): boolean {
  return Boolean(loadEnvironment().BLOB_READ_WRITE_TOKEN);
}

export function resolvePrimaryProviderForCategory(
  category: "IMAGE" | "SUPPORTING_DOC" | "EXPORT_ARCHIVE",
): StorageProvider {
  if (category === "EXPORT_ARCHIVE") {
    return StorageProvider.VERCEL_BLOB;
  }
  return StorageProvider.FIREBASE_STORAGE;
}
