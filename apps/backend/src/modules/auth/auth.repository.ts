import type { AdminUser } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

export class AuthRepository extends BaseFirestoreRepository<AdminUser> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.ADMINS);
  }

  async updateLastLogin(uid: string): Promise<AdminUser | null> {
    return this.update(uid, { lastLoginAt: new Date().toISOString() }, uid);
  }
}

export const authRepository = new AuthRepository();
