import type { ActivityLog } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../config/collections.js";
import { getFirestoreDb } from "../config/firebase.js";

export interface CreateActivityLogInput {
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export class ActivityLogService {
  async record(input: CreateActivityLogInput): Promise<ActivityLog> {
    const docRef = getFirestoreDb().collection(FIRESTORE_COLLECTIONS.ACTIVITY_LOGS).doc();
    const payload: ActivityLog = {
      id: docRef.id,
      actorUid: input.actorUid,
      actorEmail: input.actorEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      createdAt: new Date().toISOString(),
    };

    await docRef.set(payload);
    return payload;
  }
}

export const activityLogService = new ActivityLogService();
