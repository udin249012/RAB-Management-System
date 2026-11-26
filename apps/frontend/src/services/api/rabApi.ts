import type { ApiSuccessResponse, PaginationMeta, RabDetail, RabDocument } from "@rab/shared-types";
import type { RabCreateInput, RabStatusChangeInput, RabUpdateInput } from "@rab/shared-validation";
import { apiClient } from "./axiosClient";

export interface ListRabParams {
  page?: number;
  limit?: number;
  search?: string;
  projectId?: string;
  status?: string;
}

export const rabApi = {
  async list(params: ListRabParams): Promise<{ items: RabDocument[]; meta: PaginationMeta }> {
    const res = await apiClient.get<ApiSuccessResponse<RabDocument[]>>("/rab", { params });
    return {
      items: res.data.data,
      meta: res.data.meta ?? { page: 1, limit: 20, total: res.data.data.length, totalPages: 1 },
    };
  },

  async getById(id: string): Promise<RabDetail> {
    const res = await apiClient.get<ApiSuccessResponse<RabDetail>>(`/rab/${id}`);
    return res.data.data;
  },

  async create(payload: RabCreateInput): Promise<RabDetail> {
    const res = await apiClient.post<ApiSuccessResponse<RabDetail>>("/rab", payload);
    return res.data.data;
  },

  async update(id: string, payload: RabUpdateInput): Promise<RabDetail> {
    const res = await apiClient.put<ApiSuccessResponse<RabDetail>>(`/rab/${id}`, payload);
    return res.data.data;
  },

  async calculate(id: string): Promise<RabDetail> {
    const res = await apiClient.post<ApiSuccessResponse<RabDetail>>(`/rab/${id}/calculate`);
    return res.data.data;
  },

  async finalize(id: string): Promise<RabDetail> {
    const res = await apiClient.post<ApiSuccessResponse<RabDetail>>(`/rab/${id}/finalize`);
    return res.data.data;
  },

  async createRevision(id: string): Promise<RabDetail> {
    const res = await apiClient.post<ApiSuccessResponse<RabDetail>>(`/rab/${id}/revisions`);
    return res.data.data;
  },

  async listRevisions(id: string): Promise<RabDocument[]> {
    const res = await apiClient.get<ApiSuccessResponse<RabDocument[]>>(`/rab/${id}/revisions`);
    return res.data.data;
  },

  async changeStatus(id: string, payload: RabStatusChangeInput): Promise<RabDocument> {
    const res = await apiClient.patch<ApiSuccessResponse<RabDocument>>(
      `/rab/${id}/status`,
      payload,
    );
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/rab/${id}`);
  },
};
