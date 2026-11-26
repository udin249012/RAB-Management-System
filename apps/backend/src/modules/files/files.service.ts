import { del, put } from "@vercel/blob";
import { StorageProvider, type AdminUser, type FileMetadata } from "@rab/shared-types";
import type { FileMetadataCreateInput } from "@rab/shared-validation";
import { getVercelBlobToken, isVercelBlobConfigured } from "../../config/storage.js";
import { activityLogService } from "../../services/activityLog.service.js";
import { AppError } from "../../utils/AppError.js";
import { fileMetadataRepository } from "./files.repository.js";

export interface ArchiveExportInput {
  buffer: Buffer;
  pathname: string;
  contentType: string;
  originalName: string;
  entityType: string;
  entityId: string;
  actor: AdminUser;
}

export class FilesService {
  async registerMetadata(input: FileMetadataCreateInput, actor: AdminUser): Promise<FileMetadata> {
    const created = await fileMetadataRepository.create(input, actor.uid);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "FILE_METADATA_REGISTERED",
      entityType: input.entityType,
      entityId: input.entityId,
      summary: `Mengunggah dokumen ${input.originalName} (${input.storageProvider})`,
    });
    return created;
  }

  async archiveBufferToVercelBlob(input: ArchiveExportInput): Promise<FileMetadata> {
    const token = getVercelBlobToken();
    const blob = await put(input.pathname, input.buffer, {
      access: "public",
      token,
      contentType: input.contentType,
      addRandomSuffix: true,
    });

    const metadata = await fileMetadataRepository.create(
      {
        storageProvider: StorageProvider.VERCEL_BLOB,
        storagePath: blob.pathname,
        url: blob.url,
        originalName: input.originalName,
        mimeType: input.contentType,
        sizeBytes: input.buffer.byteLength,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      input.actor.uid,
    );

    await activityLogService.record({
      actorUid: input.actor.uid,
      actorEmail: input.actor.email,
      action: "EXPORT_ARCHIVED_TO_BLOB",
      entityType: input.entityType,
      entityId: input.entityId,
      summary: `Mengarsipkan hasil ekspor ${input.originalName} ke Vercel Blob`,
    });

    return metadata;
  }

  async listByEntity(entityType: string, entityId: string): Promise<FileMetadata[]> {
    return fileMetadataRepository.findByEntity(entityType, entityId);
  }

  async listArchives(): Promise<FileMetadata[]> {
    return fileMetadataRepository.findArchives();
  }

  async deleteMetadata(id: string, actor: AdminUser): Promise<void> {
    const existing = await fileMetadataRepository.findById(id);
    if (!existing) {
      throw new AppError("Metadata file tidak ditemukan", 404, "NOT_FOUND");
    }

    if (existing.storageProvider === StorageProvider.VERCEL_BLOB && isVercelBlobConfigured()) {
      await del(existing.url, { token: getVercelBlobToken() });
    }

    await fileMetadataRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "FILE_METADATA_DELETED",
      entityType: existing.entityType,
      entityId: existing.entityId,
      summary: `Menghapus catatan file ${existing.originalName}`,
    });
  }
}

export const filesService = new FilesService();
