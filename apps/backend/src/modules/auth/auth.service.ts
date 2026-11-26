import type { AdminUser } from "@rab/shared-types";
import { activityLogService } from "../../services/activityLog.service.js";
import { authRepository } from "./auth.repository.js";
import type { AuthSessionResult } from "./auth.types.js";

export class AuthService {
  async verifyAdminSession(adminUser: AdminUser): Promise<AuthSessionResult> {
    const updated = (await authRepository.updateLastLogin(adminUser.uid)) ?? adminUser;

    await activityLogService.record({
      actorUid: updated.uid,
      actorEmail: updated.email,
      action: "ADMIN_SESSION_VERIFIED",
      entityType: "admins",
      entityId: updated.uid,
      summary: `Admin ${updated.email} memverifikasi sesi login`,
    });

    return { admin: updated };
  }

  async getCurrentAdmin(adminUser: AdminUser): Promise<AuthSessionResult> {
    return { admin: adminUser };
  }
}

export const authService = new AuthService();
