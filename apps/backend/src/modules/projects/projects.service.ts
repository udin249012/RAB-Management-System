import type { AdminUser, PaginationMeta, Project, ProjectDetail } from "@rab/shared-types";
import type {
  ProjectCreateInput,
  ProjectListQuery,
  ProjectUpdateInput,
} from "@rab/shared-validation";
import { activityLogService } from "../../services/activityLog.service.js";
import { numberingService } from "../../services/numbering.service.js";
import { AppError } from "../../utils/AppError.js";
import { paginateArray } from "../../utils/pagination.js";
import { fileMetadataRepository } from "../files/files.repository.js";
import { projectRepository } from "./projects.repository.js";

export class ProjectsService {
  async listProjects(query: ProjectListQuery): Promise<{ items: Project[]; meta: PaginationMeta }> {
    const all = await projectRepository.findAll();
    const searchLower = query.search?.toLowerCase();

    const filtered = all.filter((project) => {
      if (query.status && project.status !== query.status) return false;
      if (searchLower) {
        const haystack = [
          project.code,
          project.name,
          project.location,
          project.ownerName,
          project.picName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    return paginateArray(filtered, query.page, query.limit);
  }

  async getProjectDetail(id: string): Promise<ProjectDetail> {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw new AppError("Proyek tidak ditemukan", 404, "NOT_FOUND");
    }

    const [coverImage, documents] = await Promise.all([
      project.coverImageFileId
        ? fileMetadataRepository.findById(project.coverImageFileId)
        : Promise.resolve(null),
      fileMetadataRepository.findByIds(project.documentFileIds ?? []),
    ]);

    return {
      ...project,
      ...(coverImage ? { coverImage } : {}),
      documents,
    };
  }

  async createProject(input: ProjectCreateInput, actor: AdminUser): Promise<Project> {
    const code = await numberingService.nextProjectCode();
    const created = await projectRepository.create(
      {
        ...input,
        code,
      },
      actor.uid,
    );

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "PROJECT_CREATED",
      entityType: "projects",
      entityId: created.id,
      summary: `Membuat proyek ${created.code} - ${created.name}`,
    });

    return created;
  }

  async updateProject(id: string, input: ProjectUpdateInput, actor: AdminUser): Promise<Project> {
    const existing = await projectRepository.findById(id);
    if (!existing) {
      throw new AppError("Proyek tidak ditemukan", 404, "NOT_FOUND");
    }

    const mergedStart = input.startDate ?? existing.startDate;
    const mergedTarget = input.targetEndDate ?? existing.targetEndDate;
    if (mergedTarget < mergedStart) {
      throw new AppError(
        "Target selesai tidak boleh lebih awal dari tanggal mulai",
        400,
        "VALIDATION_ERROR",
      );
    }

    const updated = await projectRepository.update(id, input, actor.uid);
    if (!updated) {
      throw new AppError("Proyek tidak ditemukan", 404, "NOT_FOUND");
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "PROJECT_UPDATED",
      entityType: "projects",
      entityId: updated.id,
      summary: `Memperbarui proyek ${updated.code} - ${updated.name}`,
    });

    return updated;
  }

  async deleteProject(id: string, actor: AdminUser): Promise<void> {
    const existing = await projectRepository.findById(id);
    if (!existing) {
      throw new AppError("Proyek tidak ditemukan", 404, "NOT_FOUND");
    }

    if (await projectRepository.isReferenced(id)) {
      throw new AppError(
        "Proyek sudah memiliki dokumen RAB atau catatan realisasi biaya dan tidak dapat dihapus.",
        409,
        "CONFLICT",
      );
    }

    await projectRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "PROJECT_DELETED",
      entityType: "projects",
      entityId: id,
      summary: `Menghapus proyek ${existing.code} - ${existing.name}`,
    });
  }
}

export const projectsService = new ProjectsService();
