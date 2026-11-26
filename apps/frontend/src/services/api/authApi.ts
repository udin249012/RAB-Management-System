import type { AdminUser, ApiSuccessResponse } from "@rab/shared-types";
import { apiClient } from "./axiosClient";

interface AuthAdminPayload {
  admin: AdminUser;
}

export async function verifyAdminSessionApi(token?: string): Promise<AdminUser> {
  const response = await apiClient.post<ApiSuccessResponse<AuthAdminPayload>>(
    "/auth/verify",
    {},
    token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  );
  return response.data.data.admin;
}

export async function getCurrentAdminApi(): Promise<AdminUser> {
  const response = await apiClient.get<ApiSuccessResponse<AuthAdminPayload>>("/auth/me");
  return response.data.data.admin;
}
