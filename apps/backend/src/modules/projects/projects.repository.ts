import type { Project } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

export class ProjectRepository extends BaseFirestoreRepository<Project> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.PROJECTS);
  }

  async findAll(): Promise<Project[]> {
    const snap = await this.collection.orderBy("updatedAt", "desc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Project);
  }

  async isReferenced(projectId: string): Promise<boolean> {
    const db = getFirestoreDb();
    const [rabSnap, realizationSnap] = await Promise.all([
      db
        .collection(FIRESTORE_COLLECTIONS.RAB_DOCUMENTS)
        .where("projectId", "==", projectId)
        .limit(1)
        .get(),
      db
        .collection(FIRESTORE_COLLECTIONS.BUDGET_REALIZATIONS)
        .where("projectId", "==", projectId)
        .limit(1)
        .get(),
    ]);
    return !rabSnap.empty || !realizationSnap.empty;
  }
}

export const projectRepository = new ProjectRepository();
