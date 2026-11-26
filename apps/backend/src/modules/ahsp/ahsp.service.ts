import {
  AhspComponentType,
  type AdminUser,
  type AhspAnalysis,
  type AhspComponent,
  type AhspDetail,
  type BaseAuditFields,
  type PaginationMeta,
} from "@rab/shared-types";
import type {
  AhspComponentInput,
  AhspCopyInput,
  AhspCreateInput,
  AhspListQuery,
  AhspUpdateInput,
} from "@rab/shared-validation";
import { activityLogService } from "../../services/activityLog.service.js";
import { AppError } from "../../utils/AppError.js";
import { paginateArray } from "../../utils/pagination.js";
import {
  materialRepository,
  unitRepository,
  workItemRepository,
} from "../catalog/catalog.repository.js";
import { calculateAhspComponentSubtotal, calculateAhspTotals } from "./ahsp.calculator.js";
import { ahspComponentRepository, ahspRepository } from "./ahsp.repository.js";

type ResolvedComponentPayload = Omit<AhspComponent, keyof BaseAuditFields>;

export class AhspService {
  private async resolveComponents(
    ahspId: string,
    inputs: AhspComponentInput[],
  ): Promise<ResolvedComponentPayload[]> {
    const units = await unitRepository.findAll();
    const unitMap = new Map(units.map((u) => [u.id, u]));
    const resolved: ResolvedComponentPayload[] = [];

    for (const item of inputs) {
      if (item.componentType === AhspComponentType.LABOR) {
        const workItem = await workItemRepository.findById(item.referenceId);
        if (!workItem) {
          throw new AppError(
            `Tenaga kerja dengan ID "${item.referenceId}" tidak ditemukan di katalog pekerjaan`,
            400,
            "INVALID_REFERENCE",
          );
        }
        if (workItem.basePrice === undefined) {
          throw new AppError(
            `Tenaga kerja "${workItem.name}" belum memiliki harga dasar pada katalog pekerjaan`,
            400,
            "MISSING_BASE_PRICE",
          );
        }
        const unit = unitMap.get(workItem.unitId);
        const subtotal = calculateAhspComponentSubtotal(item.coefficient, workItem.basePrice);
        resolved.push({
          ahspId,
          componentType: AhspComponentType.LABOR,
          referenceId: workItem.id,
          referenceCode: workItem.code,
          referenceName: workItem.name,
          unitId: workItem.unitId,
          unitSymbol: unit?.symbol ?? "-",
          coefficient: item.coefficient,
          unitPrice: workItem.basePrice,
          subtotal,
        });
      } else {
        const material = await materialRepository.findById(item.referenceId);
        if (!material) {
          throw new AppError(
            `Material/Peralatan dengan ID "${item.referenceId}" tidak ditemukan di katalog`,
            400,
            "INVALID_REFERENCE",
          );
        }
        const unit = unitMap.get(material.unitId);
        const subtotal = calculateAhspComponentSubtotal(item.coefficient, material.unitPrice);
        resolved.push({
          ahspId,
          componentType: item.componentType,
          referenceId: material.id,
          referenceCode: material.code,
          referenceName: material.name,
          unitId: material.unitId,
          unitSymbol: unit?.symbol ?? "-",
          coefficient: item.coefficient,
          unitPrice: material.unitPrice,
          subtotal,
        });
      }
    }

    return resolved;
  }

  async listAhsp(query: AhspListQuery): Promise<{ items: AhspAnalysis[]; meta: PaginationMeta }> {
    const all = await ahspRepository.findAll();
    const searchLower = query.search?.toLowerCase();

    const filtered = all.filter((item) => {
      if (query.workItemId && item.workItemId !== query.workItemId) return false;
      if (query.isActive !== undefined && item.isActive !== query.isActive) return false;
      if (searchLower) {
        const haystack = [item.code, item.name, item.sourceReference]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    return paginateArray(filtered, query.page, query.limit);
  }

  async getAhspDetail(id: string): Promise<AhspDetail> {
    const analysis = await ahspRepository.findById(id);
    if (!analysis) {
      throw new AppError("Analisis AHSP tidak ditemukan", 404, "NOT_FOUND");
    }
    const components = await ahspComponentRepository.findByAhspId(id);
    return { ...analysis, components };
  }

  async createAhsp(input: AhspCreateInput, actor: AdminUser): Promise<AhspDetail> {
    const [codeExists, workItem] = await Promise.all([
      ahspRepository.existsByField("code", input.code),
      workItemRepository.findById(input.workItemId),
    ]);

    if (codeExists) {
      throw new AppError(`Kode AHSP "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    if (!workItem) {
      throw new AppError("Item pekerjaan tidak ditemukan di katalog", 400, "INVALID_REFERENCE");
    }

    const tempComponents = await this.resolveComponents("pending", input.components);
    const totals = calculateAhspTotals(tempComponents);
    const now = new Date().toISOString();

    const createdHeader = await ahspRepository.create(
      {
        code: input.code,
        workItemId: input.workItemId,
        name: input.name,
        unitId: workItem.unitId,
        version: 1,
        ...totals,
        sourceReference: input.sourceReference,
        isActive: input.isActive,
        revisionHistory: [
          {
            version: 1,
            previousUnitPriceTotal: 0,
            newUnitPriceTotal: totals.unitPriceTotal,
            changedAt: now,
            changedBy: actor.email,
            reason: "Analisis AHSP awal dibuat",
          },
        ],
      },
      actor.uid,
    );

    const savedComponents = await ahspComponentRepository.replaceComponents(
      createdHeader.id,
      tempComponents.map((c) => ({ ...c, ahspId: createdHeader.id })),
      actor.uid,
    );

    if (input.isActive) {
      await workItemRepository.update(workItem.id, { ahspId: createdHeader.id }, actor.uid);
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "AHSP_CREATED",
      entityType: "ahsp",
      entityId: createdHeader.id,
      summary: `Membuat analisis AHSP ${createdHeader.code} - ${createdHeader.name}`,
    });

    return { ...createdHeader, components: savedComponents };
  }

  async updateAhsp(id: string, input: AhspUpdateInput, actor: AdminUser): Promise<AhspDetail> {
    const existing = await ahspRepository.findById(id);
    if (!existing) {
      throw new AppError("Analisis AHSP tidak ditemukan", 404, "NOT_FOUND");
    }

    if (input.code && (await ahspRepository.existsByField("code", input.code, id))) {
      throw new AppError(`Kode AHSP "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }

    let targetUnitId = existing.unitId;
    const targetWorkItemId = input.workItemId ?? existing.workItemId;
    if (input.workItemId && input.workItemId !== existing.workItemId) {
      const workItem = await workItemRepository.findById(input.workItemId);
      if (!workItem) {
        throw new AppError("Item pekerjaan tidak ditemukan di katalog", 400, "INVALID_REFERENCE");
      }
      targetUnitId = workItem.unitId;
    }

    let components: AhspComponent[];
    let totals = {
      materialTotal: existing.materialTotal,
      laborTotal: existing.laborTotal,
      equipmentTotal: existing.equipmentTotal,
      unitPriceTotal: existing.unitPriceTotal,
    };

    if (input.components) {
      const resolved = await this.resolveComponents(id, input.components);
      totals = calculateAhspTotals(resolved);
      components = await ahspComponentRepository.replaceComponents(id, resolved, actor.uid);
    } else {
      components = await ahspComponentRepository.findByAhspId(id);
    }

    const nextVersion = existing.version + 1;
    const nextHistory = [
      {
        version: nextVersion,
        previousUnitPriceTotal: existing.unitPriceTotal,
        newUnitPriceTotal: totals.unitPriceTotal,
        changedAt: new Date().toISOString(),
        changedBy: actor.email,
        reason: input.changeReason || "Pembaruan analisis AHSP",
      },
      ...(existing.revisionHistory ?? []),
    ];

    const updatedHeader = await ahspRepository.update(
      id,
      {
        ...(input.code ? { code: input.code } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.sourceReference !== undefined ? { sourceReference: input.sourceReference } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        workItemId: targetWorkItemId,
        unitId: targetUnitId,
        version: nextVersion,
        ...totals,
        revisionHistory: nextHistory,
      },
      actor.uid,
    );

    if (!updatedHeader) {
      throw new AppError("Analisis AHSP tidak ditemukan", 404, "NOT_FOUND");
    }

    if (updatedHeader.isActive) {
      await workItemRepository.update(targetWorkItemId, { ahspId: updatedHeader.id }, actor.uid);
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "AHSP_UPDATED",
      entityType: "ahsp",
      entityId: updatedHeader.id,
      summary: `Memperbarui AHSP ${updatedHeader.code} ke versi ${nextVersion}`,
    });

    return { ...updatedHeader, components };
  }

  async recalculateFromCatalog(id: string, actor: AdminUser): Promise<AhspDetail> {
    const existingComponents = await ahspComponentRepository.findByAhspId(id);
    if (existingComponents.length === 0) {
      throw new AppError(
        "Analisis AHSP tidak memiliki komponen untuk dihitung ulang",
        400,
        "EMPTY_COMPONENTS",
      );
    }
    return this.updateAhsp(
      id,
      {
        changeReason: "Sinkronisasi harga satuan komponen dari katalog terbaru",
        components: existingComponents.map((c) => ({
          componentType: c.componentType,
          referenceId: c.referenceId,
          coefficient: c.coefficient,
        })),
      },
      actor,
    );
  }

  async copyAhsp(id: string, input: AhspCopyInput, actor: AdminUser): Promise<AhspDetail> {
    const source = await this.getAhspDetail(id);
    return this.createAhsp(
      {
        code: input.code,
        name: input.name ?? `${source.name} (Salinan)`,
        workItemId: input.workItemId ?? source.workItemId,
        sourceReference: input.sourceReference ?? source.sourceReference,
        isActive: true,
        components: source.components.map((c) => ({
          componentType: c.componentType,
          referenceId: c.referenceId,
          coefficient: c.coefficient,
        })),
      },
      actor,
    );
  }

  async deleteAhsp(id: string, actor: AdminUser): Promise<void> {
    const existing = await ahspRepository.findById(id);
    if (!existing) {
      throw new AppError("Analisis AHSP tidak ditemukan", 404, "NOT_FOUND");
    }
    if (await ahspRepository.isReferencedInRab(id)) {
      throw new AppError(
        "Analisis AHSP sudah digunakan pada dokumen RAB dan tidak dapat dihapus",
        409,
        "CONFLICT",
      );
    }

    await ahspComponentRepository.deleteByAhspId(id);
    await ahspRepository.deleteById(id);

    const workItem = await workItemRepository.findById(existing.workItemId);
    if (workItem && workItem.ahspId === id) {
      await workItemRepository.update(workItem.id, { ahspId: undefined }, actor.uid);
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "AHSP_DELETED",
      entityType: "ahsp",
      entityId: id,
      summary: `Menghapus analisis AHSP ${existing.code} - ${existing.name}`,
    });
  }
}

export const ahspService = new AhspService();
