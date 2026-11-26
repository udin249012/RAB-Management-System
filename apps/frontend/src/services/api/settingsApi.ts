import type { AdminUser, ApiSuccessResponse, CompanySettingsDetail } from "@rab/shared-types";
import type { AdminProfileUpdateInput, CompanySettingsUpdateInput } from "@rab/shared-validation";
import { apiClient } from "./axiosClient";

export const settingsApi = {
  async getSettings(): Promise<CompanySettingsDetail> {
    const res = await apiClient.get<ApiSuccessResponse<CompanySettingsDetail>>("/settings");
    return res.data.data;
  },

  async updateSettings(payload: CompanySettingsUpdateInput): Promise<CompanySettingsDetail> {
    const res = await apiClient.put<ApiSuccessResponse<CompanySettingsDetail>>(
      "/settings",
      payload,
    );
    return res.data.data;
  },

  async listAdmins(): Promise<AdminUser[]> {
    const res = await apiClient.get<ApiSuccessResponse<AdminUser[]>>("/users/admins");
    return res.data.data;
  },

  async updateMyProfile(payload: AdminProfileUpdateInput): Promise<AdminUser> {
    const res = await apiClient.patch<ApiSuccessResponse<AdminUser>>("/users/me", payload);
    return res.data.data;
  },
};
