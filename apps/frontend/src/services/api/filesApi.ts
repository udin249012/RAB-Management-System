import type { ApiSuccessResponse, FileMetadata } from "@rab/shared-types";
import type { FileMetadataCreateInput } from "@rab/shared-validation";
import { apiClient } from "./axiosClient";

export const filesApi = {
  async registerMetadata(payload: FileMetadataCreateInput): Promise<FileMetadata> {
    const res = await apiClient.post<ApiSuccessResponse<FileMetadata>>("/files/metadata", payload);
    return res.data.data;
  },

  async listByEntity(entityType: string, entityId: string): Promise<FileMetadata[]> {
    const res = await apiClient.get<ApiSuccessResponse<FileMetadata[]>>("/files", {
      params: { entityType, entityId },
    });
    return res.data.data;
  },

  async listArchives(): Promise<FileMetadata[]> {
    const res = await apiClient.get<ApiSuccessResponse<FileMetadata[]>>("/files/archives");
    return res.data.data;
  },

  async removeMetadata(id: string): Promise<void> {
    await apiClient.delete(`/files/${id}`);
  },
};
