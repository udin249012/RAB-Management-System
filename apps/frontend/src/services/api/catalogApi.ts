import type {
  ApiSuccessResponse,
  Material,
  MaterialCategory,
  PaginationMeta,
  Unit,
  WorkCategory,
  WorkItem,
} from "@rab/shared-types";
import type {
  MaterialCategoryCreateInput,
  MaterialCategoryUpdateInput,
  MaterialCreateInput,
  MaterialUpdateInput,
  UnitCreateInput,
  UnitUpdateInput,
  WorkCategoryCreateInput,
  WorkCategoryUpdateInput,
  WorkItemCreateInput,
  WorkItemUpdateInput,
} from "@rab/shared-validation";
import { apiClient } from "./axiosClient";

export interface ListMaterialsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  group?: string;
  isActive?: string;
}

export interface ListWorkItemsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  type?: string;
  isActive?: string;
}

export interface MaterialImportResponse {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
}

export const catalogApi = {
  // Units
  async listUnits(): Promise<Unit[]> {
    const res = await apiClient.get<ApiSuccessResponse<Unit[]>>("/units");
    return res.data.data;
  },
  async createUnit(payload: UnitCreateInput): Promise<Unit> {
    const res = await apiClient.post<ApiSuccessResponse<Unit>>("/units", payload);
    return res.data.data;
  },
  async updateUnit(id: string, payload: UnitUpdateInput): Promise<Unit> {
    const res = await apiClient.put<ApiSuccessResponse<Unit>>(`/units/${id}`, payload);
    return res.data.data;
  },
  async deleteUnit(id: string): Promise<void> {
    await apiClient.delete(`/units/${id}`);
  },

  // Material Categories
  async listMaterialCategories(): Promise<MaterialCategory[]> {
    const res = await apiClient.get<ApiSuccessResponse<MaterialCategory[]>>("/material-categories");
    return res.data.data;
  },
  async createMaterialCategory(payload: MaterialCategoryCreateInput): Promise<MaterialCategory> {
    const res = await apiClient.post<ApiSuccessResponse<MaterialCategory>>(
      "/material-categories",
      payload,
    );
    return res.data.data;
  },
  async updateMaterialCategory(
    id: string,
    payload: MaterialCategoryUpdateInput,
  ): Promise<MaterialCategory> {
    const res = await apiClient.put<ApiSuccessResponse<MaterialCategory>>(
      `/material-categories/${id}`,
      payload,
    );
    return res.data.data;
  },
  async deleteMaterialCategory(id: string): Promise<void> {
    await apiClient.delete(`/material-categories/${id}`);
  },

  // Materials
  async listMaterials(
    params: ListMaterialsParams,
  ): Promise<{ items: Material[]; meta: PaginationMeta }> {
    const res = await apiClient.get<ApiSuccessResponse<Material[]>>("/materials", { params });
    return {
      items: res.data.data,
      meta: res.data.meta ?? { page: 1, limit: 20, total: res.data.data.length, totalPages: 1 },
    };
  },
  async createMaterial(payload: MaterialCreateInput): Promise<Material> {
    const res = await apiClient.post<ApiSuccessResponse<Material>>("/materials", payload);
    return res.data.data;
  },
  async updateMaterial(id: string, payload: MaterialUpdateInput): Promise<Material> {
    const res = await apiClient.put<ApiSuccessResponse<Material>>(`/materials/${id}`, payload);
    return res.data.data;
  },
  async deleteMaterial(id: string): Promise<void> {
    await apiClient.delete(`/materials/${id}`);
  },
  async exportMaterialsExcel(): Promise<Blob> {
    const res = await apiClient.get<Blob>("/materials/export", { responseType: "blob" });
    return res.data;
  },
  async importMaterialsExcel(file: File): Promise<MaterialImportResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<ApiSuccessResponse<MaterialImportResponse>>(
      "/materials/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data.data;
  },

  // Work Categories
  async listWorkCategories(): Promise<WorkCategory[]> {
    const res = await apiClient.get<ApiSuccessResponse<WorkCategory[]>>("/work-categories");
    return res.data.data;
  },
  async createWorkCategory(payload: WorkCategoryCreateInput): Promise<WorkCategory> {
    const res = await apiClient.post<ApiSuccessResponse<WorkCategory>>("/work-categories", payload);
    return res.data.data;
  },
  async updateWorkCategory(id: string, payload: WorkCategoryUpdateInput): Promise<WorkCategory> {
    const res = await apiClient.put<ApiSuccessResponse<WorkCategory>>(
      `/work-categories/${id}`,
      payload,
    );
    return res.data.data;
  },
  async deleteWorkCategory(id: string): Promise<void> {
    await apiClient.delete(`/work-categories/${id}`);
  },

  // Work Items
  async listWorkItems(
    params: ListWorkItemsParams,
  ): Promise<{ items: WorkItem[]; meta: PaginationMeta }> {
    const res = await apiClient.get<ApiSuccessResponse<WorkItem[]>>("/work-items", { params });
    return {
      items: res.data.data,
      meta: res.data.meta ?? { page: 1, limit: 20, total: res.data.data.length, totalPages: 1 },
    };
  },
  async createWorkItem(payload: WorkItemCreateInput): Promise<WorkItem> {
    const res = await apiClient.post<ApiSuccessResponse<WorkItem>>("/work-items", payload);
    return res.data.data;
  },
  async updateWorkItem(id: string, payload: WorkItemUpdateInput): Promise<WorkItem> {
    const res = await apiClient.put<ApiSuccessResponse<WorkItem>>(`/work-items/${id}`, payload);
    return res.data.data;
  },
  async deleteWorkItem(id: string): Promise<void> {
    await apiClient.delete(`/work-items/${id}`);
  },
};
