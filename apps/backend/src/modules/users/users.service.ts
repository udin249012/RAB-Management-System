import type { AdminUser } from "@rab/shared-types";
import type { AdminProfileUpdateInput } from "@rab/shared-validation";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { activityLogService } from "../../services/activityLog.service.js";
import { AppError } from "../../utils/AppError.js";
import { authRepository } from "../auth/auth.repository.js";

export class UsersService {
  async listAdmins(): Promise<AdminUser[]> {
    const snap = await getFirestoreDb().collection(FIRESTORE_COLLECTIONS.ADMINS).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as AdminUser);
  }

  async updateOwnProfile(adminUser: AdminUser, input: AdminProfileUpdateInput): Promise<AdminUser> {
    const updated = await authRepository.update(
      adminUser.uid,
      { displayName: input.displayName },
      adminUser.uid,
    );
    if (!updated) {
      throw new AppError("Profil administrator tidak ditemukan", 404, "NOT_FOUND");
    }

    await activityLogService.record({
      actorUid: adminUser.uid,
      actorEmail: adminUser.email,
      action: "ADMIN_PROFILE_UPDATED",
      entityType: "admins",
      entityId: adminUser.uid,
      summary: `Admin ${adminUser.email} memperbarui nama tampilan menjadi ${input.displayName}`,
    });

    return updated;
  }
}

export const usersService = new UsersService();
