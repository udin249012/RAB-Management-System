import type { AhspAnalysis, AhspComponent, BaseAuditFields } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

export class AhspRepository extends BaseFirestoreRepository<AhspAnalysis> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.AHSP);
  }

  async findAll(): Promise<AhspAnalysis[]> {
    const snap = await this.collection.orderBy("name", "asc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AhspAnalysis);
  }

  async isReferencedInRab(ahspId: string): Promise<boolean> {
    const snap = await getFirestoreDb()
      .collection(FIRESTORE_COLLECTIONS.RAB_ITEMS)
      .where("ahspId", "==", ahspId)
      .limit(1)
      .get();
    return !snap.empty;
  }
}

export class AhspComponentRepository extends BaseFirestoreRepository<AhspComponent> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.AHSP_COMPONENTS);
  }

  async findByAhspId(ahspId: string): Promise<AhspComponent[]> {
    const snap = await this.collection.where("ahspId", "==", ahspId).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AhspComponent);
  }

  async deleteByAhspId(ahspId: string): Promise<void> {
    const existing = await this.findByAhspId(ahspId);
    await Promise.all(existing.map((item) => this.deleteById(item.id)));
  }

  async replaceComponents(
    ahspId: string,
    components: Array<Omit<AhspComponent, keyof BaseAuditFields>>,
    actorUid: string,
  ): Promise<AhspComponent[]> {
    await this.deleteByAhspId(ahspId);
    const created: AhspComponent[] = [];
    for (const comp of components) {
      const saved = await this.create(comp, actorUid);
      created.push(saved);
    }
    return created;
  }
}

export const ahspRepository = new AhspRepository();
export const ahspComponentRepository = new AhspComponentRepository();
