import {
  RabStatus,
  type AdminUser,
  type BudgetRealization,
  type DashboardSummary,
  type MonitoringSummaryResponse,
  type PaginationMeta,
} from "@rab/shared-types";
import type {
  MonitoringSummaryQuery,
  RealizationCreateInput,
  RealizationListQuery,
  RealizationUpdateInput,
} from "@rab/shared-validation";
import { activityLogService } from "../../services/activityLog.service.js";
import { AppError } from "../../utils/AppError.js";
import { paginateArray } from "../../utils/pagination.js";
import { projectRepository } from "../projects/projects.repository.js";
import { rabDocumentRepository } from "../rab/rab.repository.js";
import { buildDashboardSummary, buildMonitoringSummary } from "./monitoring.calculator.js";
import { activityLogReadRepository, budgetRealizationRepository } from "./monitoring.repository.js";

export class MonitoringService {
  private async validateProjectAndFinalRab(projectId: string, rabDocumentId: string) {
    const [project, rab] = await Promise.all([
      projectRepository.findById(projectId),
      rabDocumentRepository.findById(rabDocumentId),
    ]);

    if (!project) {
      throw new AppError("Proyek tidak ditemukan", 400, "INVALID_REFERENCE");
    }
    if (!rab) {
      throw new AppError("Dokumen RAB tidak ditemukan", 400, "INVALID_REFERENCE");
    }
    if (rab.projectId !== projectId) {
      throw new AppError(
        "Dokumen RAB tidak sesuai dengan proyek yang dipilih",
        400,
        "INVALID_REFERENCE",
      );
    }
    if (rab.status !== RabStatus.FINAL) {
      throw new AppError(
        "Realisasi anggaran hanya dapat dicatat terhadap dokumen RAB berstatus Final",
        400,
        "INVALID_RAB_STATUS",
      );
    }
    return { project, rab };
  }

  async listRealizations(
    query: RealizationListQuery,
  ): Promise<{ items: BudgetRealization[]; meta: PaginationMeta }> {
    const all = await budgetRealizationRepository.findAll();
    const searchLower = query.search?.toLowerCase();

    const filtered = all.filter((item) => {
      if (query.projectId && item.projectId !== query.projectId) return false;
      if (query.rabDocumentId && item.rabDocumentId !== query.rabDocumentId) return false;
      if (query.category && item.category !== query.category) return false;
      if (query.startDate && item.transactionDate < query.startDate) return false;
      if (query.endDate && item.transactionDate > query.endDate) return false;
      if (searchLower) {
        const haystack = [item.category, item.description, item.referenceNumber]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    return paginateArray(filtered, query.page, query.limit);
  }

  async createRealization(
    input: RealizationCreateInput,
    actor: AdminUser,
  ): Promise<BudgetRealization> {
    const { project } = await this.validateProjectAndFinalRab(input.projectId, input.rabDocumentId);

    const created = await budgetRealizationRepository.create(input, actor.uid);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "REALIZATION_CREATED",
      entityType: "budget_realizations",
      entityId: created.id,
      summary: `Mencatat realisasi ${created.category} (${created.amount}) untuk proyek ${project.code}`,
    });

    return created;
  }

  async updateRealization(
    id: string,
    input: RealizationUpdateInput,
    actor: AdminUser,
  ): Promise<BudgetRealization> {
    const existing = await budgetRealizationRepository.findById(id);
    if (!existing) {
      throw new AppError("Data realisasi biaya tidak ditemukan", 404, "NOT_FOUND");
    }

    const targetProjectId = input.projectId ?? existing.projectId;
    const targetRabId = input.rabDocumentId ?? existing.rabDocumentId;
    await this.validateProjectAndFinalRab(targetProjectId, targetRabId);

    const updated = await budgetRealizationRepository.update(id, input, actor.uid);
    if (!updated) {
      throw new AppError("Data realisasi biaya tidak ditemukan", 404, "NOT_FOUND");
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "REALIZATION_UPDATED",
      entityType: "budget_realizations",
      entityId: updated.id,
      summary: `Memperbarui realisasi ${updated.category} (${updated.amount})`,
    });

    return updated;
  }

  async deleteRealization(id: string, actor: AdminUser): Promise<void> {
    const existing = await budgetRealizationRepository.findById(id);
    if (!existing) {
      throw new AppError("Data realisasi biaya tidak ditemukan", 404, "NOT_FOUND");
    }

    await budgetRealizationRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "REALIZATION_DELETED",
      entityType: "budget_realizations",
      entityId: id,
      summary: `Menghapus catatan realisasi ${existing.category} (${existing.amount})`,
    });
  }

  async getMonitoringSummary(query: MonitoringSummaryQuery): Promise<MonitoringSummaryResponse> {
    const [projects, rabs, realizations] = await Promise.all([
      projectRepository.findAll(),
      rabDocumentRepository.findAll(),
      budgetRealizationRepository.findAll(),
    ]);

    return buildMonitoringSummary(projects, rabs, realizations, query.projectId);
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const [projects, rabs, realizations, logs] = await Promise.all([
      projectRepository.findAll(),
      rabDocumentRepository.findAll(),
      budgetRealizationRepository.findAll(),
      activityLogReadRepository.findRecent(10),
    ]);

    return buildDashboardSummary(projects, rabs, realizations, logs);
  }
}

export const monitoringService = new MonitoringService();
