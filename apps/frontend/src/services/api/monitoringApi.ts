import type {
  ApiSuccessResponse,
  BudgetRealization,
  DashboardSummary,
  MonitoringSummaryResponse,
  PaginationMeta,
} from "@rab/shared-types";
import type { RealizationCreateInput, RealizationUpdateInput } from "@rab/shared-validation";
import { apiClient } from "./axiosClient";

export interface ListRealizationsParams {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  rabDocumentId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export const monitoringApi = {
  async listRealizations(
    params: ListRealizationsParams,
  ): Promise<{ items: BudgetRealization[]; meta: PaginationMeta }> {
    const res = await apiClient.get<ApiSuccessResponse<BudgetRealization[]>>("/realizations", {
      params,
    });
    return {
      items: res.data.data,
      meta: res.data.meta ?? { page: 1, limit: 20, total: res.data.data.length, totalPages: 1 },
    };
  },

  async createRealization(payload: RealizationCreateInput): Promise<BudgetRealization> {
    const res = await apiClient.post<ApiSuccessResponse<BudgetRealization>>(
      "/realizations",
      payload,
    );
    return res.data.data;
  },

  async updateRealization(id: string, payload: RealizationUpdateInput): Promise<BudgetRealization> {
    const res = await apiClient.put<ApiSuccessResponse<BudgetRealization>>(
      `/realizations/${id}`,
      payload,
    );
    return res.data.data;
  },

  async deleteRealization(id: string): Promise<void> {
    await apiClient.delete(`/realizations/${id}`);
  },

  async getSummary(projectId?: string): Promise<MonitoringSummaryResponse> {
    const res = await apiClient.get<ApiSuccessResponse<MonitoringSummaryResponse>>(
      "/monitoring/summary",
      {
        params: projectId ? { projectId } : undefined,
      },
    );
    return res.data.data;
  },

  async getDashboard(): Promise<DashboardSummary> {
    const res = await apiClient.get<ApiSuccessResponse<DashboardSummary>>("/monitoring/dashboard");
    return res.data.data;
  },
};
