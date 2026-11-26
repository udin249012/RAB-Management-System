import type {
  AhspAnalysis,
  AhspDetail,
  ApiSuccessResponse,
  PaginationMeta,
} from "@rab/shared-types";
import type { AhspCopyInput, AhspCreateInput, AhspUpdateInput } from "@rab/shared-validation";
import { apiClient } from "./axiosClient";

export interface ListAhspParams {
  page?: number;
  limit?: number;
  search?: string;
  workItemId?: string;
  isActive?: string;
}

export const ahspApi = {
  async list(params: ListAhspParams): Promise<{ items: AhspAnalysis[]; meta: PaginationMeta }> {
    const res = await apiClient.get<ApiSuccessResponse<AhspAnalysis[]>>("/ahsp", { params });
    return {
      items: res.data.data,
      meta: res.data.meta ?? { page: 1, limit: 20, total: res.data.data.length, totalPages: 1 },
    };
  },

  async getById(id: string): Promise<AhspDetail> {
    const res = await apiClient.get<ApiSuccessResponse<AhspDetail>>(`/ahsp/${id}`);
    return res.data.data;
  },

  async create(payload: AhspCreateInput): Promise<AhspDetail> {
    const res = await apiClient.post<ApiSuccessResponse<AhspDetail>>("/ahsp", payload);
    return res.data.data;
  },

  async update(id: string, payload: AhspUpdateInput): Promise<AhspDetail> {
    const res = await apiClient.put<ApiSuccessResponse<AhspDetail>>(`/ahsp/${id}`, payload);
    return res.data.data;
  },

  async recalculate(id: string): Promise<AhspDetail> {
    const res = await apiClient.post<ApiSuccessResponse<AhspDetail>>(`/ahsp/${id}/recalculate`);
    return res.data.data;
  },

  async copy(id: string, payload: AhspCopyInput): Promise<AhspDetail> {
    const res = await apiClient.post<ApiSuccessResponse<AhspDetail>>(`/ahsp/${id}/copy`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/ahsp/${id}`);
  },
};
