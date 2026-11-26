import type { ActivityLog, BudgetRealization } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

export class BudgetRealizationRepository extends BaseFirestoreRepository<BudgetRealization> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.BUDGET_REALIZATIONS);
  }

  async findAll(): Promise<BudgetRealization[]> {
    const snap = await this.collection.orderBy("transactionDate", "desc").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as BudgetRealization);
  }
}

export class ActivityLogReadRepository {
  async findRecent(limitCount = 20): Promise<ActivityLog[]> {
    const snap = await getFirestoreDb()
      .collection(FIRESTORE_COLLECTIONS.ACTIVITY_LOGS)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ActivityLog);
  }
}

export const budgetRealizationRepository = new BudgetRealizationRepository();
export const activityLogReadRepository = new ActivityLogReadRepository();
