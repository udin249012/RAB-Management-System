import type { ApiSuccessResponse, ReportDataset, ReportType } from "@rab/shared-types";
import { apiClient } from "./axiosClient";

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  status?: string;
  search?: string;
}

export const reportsApi = {
  async fetchReport(type: ReportType, params: ReportFilterParams): Promise<ReportDataset> {
    const res = await apiClient.get<ApiSuccessResponse<ReportDataset>>(`/reports/${type}`, {
      params: { ...params, format: "json" },
    });
    return res.data.data;
  },

  async downloadReport(
    type: ReportType,
    params: ReportFilterParams,
    format: "pdf" | "excel",
  ): Promise<Blob> {
    const res = await apiClient.get<Blob>(`/reports/${type}`, {
      params: { ...params, format },
      responseType: "blob",
    });
    return res.data;
  },

  async downloadSingleRab(rabId: string, format: "pdf" | "excel"): Promise<Blob> {
    const res = await apiClient.get<Blob>(`/reports/rab/${rabId}/export`, {
      params: { format },
      responseType: "blob",
    });
    return res.data;
  },
};
