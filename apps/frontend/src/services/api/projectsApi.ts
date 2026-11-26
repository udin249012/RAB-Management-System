import type { ApiSuccessResponse, PaginationMeta, Project, ProjectDetail } from "@rab/shared-types";
import type { ProjectCreateInput, ProjectUpdateInput } from "@rab/shared-validation";
import { apiClient } from "./axiosClient";

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const projectsApi = {
  async list(params: ListProjectsParams): Promise<{ items: Project[]; meta: PaginationMeta }> {
    const res = await apiClient.get<ApiSuccessResponse<Project[]>>("/projects", { params });
    return {
      items: res.data.data,
      meta: res.data.meta ?? { page: 1, limit: 20, total: res.data.data.length, totalPages: 1 },
    };
  },

  async getById(id: string): Promise<ProjectDetail> {
    const res = await apiClient.get<ApiSuccessResponse<ProjectDetail>>(`/projects/${id}`);
    return res.data.data;
  },

  async create(payload: ProjectCreateInput): Promise<Project> {
    const res = await apiClient.post<ApiSuccessResponse<Project>>("/projects", payload);
    return res.data.data;
  },

  async update(id: string, payload: ProjectUpdateInput): Promise<Project> {
    const res = await apiClient.put<ApiSuccessResponse<Project>>(`/projects/${id}`, payload);
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  },
};
