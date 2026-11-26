import type { BaseAuditFields, RabDocument, RabItem } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

export class RabDocumentRepository extends BaseFirestoreRepository<RabDocument> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.RAB_DOCUMENTS);
  }

  async findAll(): Promise<RabDocument[]> {
    const snap = await this.collection.orderBy("updatedAt", "desc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RabDocument);
  }

  async findByProjectId(projectId: string): Promise<RabDocument[]> {
    const snap = await this.collection.where("projectId", "==", projectId).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RabDocument);
  }

  async isReferencedInRealizations(rabId: string): Promise<boolean> {
    const snap = await getFirestoreDb()
      .collection(FIRESTORE_COLLECTIONS.BUDGET_REALIZATIONS)
      .where("rabDocumentId", "==", rabId)
      .limit(1)
      .get();
    return !snap.empty;
  }

  async hasChildRevisions(rabId: string): Promise<boolean> {
    const snap = await this.collection.where("parentRabId", "==", rabId).limit(1).get();
    return !snap.empty;
  }
}

export class RabItemRepository extends BaseFirestoreRepository<RabItem> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.RAB_ITEMS);
  }

  async findByRabId(rabId: string): Promise<RabItem[]> {
    const snap = await this.collection.where("rabId", "==", rabId).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as RabItem);
    return items.sort((a, b) => a.order - b.order);
  }

  async deleteByRabId(rabId: string): Promise<void> {
    const existing = await this.findByRabId(rabId);
    await Promise.all(existing.map((item) => this.deleteById(item.id)));
  }

  async replaceItems(
    rabId: string,
    items: Array<Omit<RabItem, keyof BaseAuditFields>>,
    actorUid: string,
  ): Promise<RabItem[]> {
    await this.deleteByRabId(rabId);
    const created: RabItem[] = [];
    for (const item of items) {
      const saved = await this.create(item, actorUid);
      created.push(saved);
    }
    return created.sort((a, b) => a.order - b.order);
  }
}

export const rabDocumentRepository = new RabDocumentRepository();
export const rabItemRepository = new RabItemRepository();
