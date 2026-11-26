import { StorageProvider, type FileMetadata } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

export class FileMetadataRepository extends BaseFirestoreRepository<FileMetadata> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.FILE_METADATA);
  }

  async findByIds(ids: string[]): Promise<FileMetadata[]> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const results = await Promise.all(uniqueIds.map((id) => this.findById(id)));
    return results.filter((item): item is FileMetadata => item !== null);
  }

  async findByEntity(entityType: string, entityId: string): Promise<FileMetadata[]> {
    const snap = await this.collection
      .where("entityType", "==", entityType)
      .where("entityId", "==", entityId)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FileMetadata);
  }

  async findArchives(): Promise<FileMetadata[]> {
    const snap = await this.collection
      .where("storageProvider", "==", StorageProvider.VERCEL_BLOB)
      .get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FileMetadata);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export const fileMetadataRepository = new FileMetadataRepository();
