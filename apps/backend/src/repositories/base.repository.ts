import type { BaseAuditFields, PaginationMeta } from "@rab/shared-types";
import type { CollectionReference, DocumentData, Query } from "firebase-admin/firestore";
import { getFirestoreDb } from "../config/firebase.js";
import type { FirestoreCollectionName } from "../config/collections.js";

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export class BaseFirestoreRepository<T extends BaseAuditFields> {
  constructor(protected readonly collectionName: FirestoreCollectionName) {}

  protected get collection(): CollectionReference<DocumentData> {
    return getFirestoreDb().collection(this.collectionName);
  }

  async findById(id: string): Promise<T | null> {
    const snapshot = await this.collection.doc(id).get();
    if (!snapshot.exists) {
      return null;
    }
    return { id: snapshot.id, ...snapshot.data() } as T;
  }

  async create(
    data: Omit<T, keyof BaseAuditFields>,
    actorUid: string,
    customId?: string,
  ): Promise<T> {
    const now = new Date().toISOString();
    const docRef = customId ? this.collection.doc(customId) : this.collection.doc();
    const payload = {
      ...data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
      createdBy: actorUid,
      updatedBy: actorUid,
    } as T;

    await docRef.set(payload);
    return payload;
  }

  async update(
    id: string,
    data: Partial<Omit<T, "id" | "createdAt" | "createdBy">>,
    actorUid: string,
  ): Promise<T | null> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return null;
    }

    const updatedFields = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: actorUid,
    };

    await docRef.update(updatedFields);
    const refreshed = await docRef.get();
    return { id: refreshed.id, ...refreshed.data() } as T;
  }

  async deleteById(id: string): Promise<boolean> {
    const docRef = this.collection.doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return false;
    }
    await docRef.delete();
    return true;
  }

  async existsByField(field: string, value: unknown, excludeId?: string): Promise<boolean> {
    const snapshot = await this.collection.where(field, "==", value).limit(2).get();
    if (snapshot.empty) return false;
    if (!excludeId) return true;
    return snapshot.docs.some((doc) => doc.id !== excludeId);
  }

  async paginateQuery(
    query: Query<DocumentData>,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<T>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (safePage - 1) * safeLimit;

    const countSnap = await query.count().get();
    const total = countSnap.data().count;
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const docsSnap = await query.offset(offset).limit(safeLimit).get();
    const items = docsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);

    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
      },
    };
  }
}
