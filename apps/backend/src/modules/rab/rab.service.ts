import { randomUUID } from "node:crypto";
import {
  RabItemMode,
  RabStatus,
  type AdditionalCostItem,
  type AdminUser,
  type BaseAuditFields,
  type CompanySettings,
  type CompanySnapshot,
  type PaginationMeta,
  type RabComponentSnapshot,
  type RabDetail,
  type RabDocument,
  type RabItem,
} from "@rab/shared-types";
import type {
  RabCreateInput,
  RabItemInput,
  RabListQuery,
  RabStatusChangeInput,
  RabUpdateInput,
} from "@rab/shared-validation";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { activityLogService } from "../../services/activityLog.service.js";
import { numberingService } from "../../services/numbering.service.js";
import { AppError } from "../../utils/AppError.js";
import { paginateArray } from "../../utils/pagination.js";
import { ahspComponentRepository, ahspRepository } from "../ahsp/ahsp.repository.js";
import { unitRepository } from "../catalog/catalog.repository.js";
import { fileMetadataRepository } from "../files/files.repository.js";
import { projectRepository } from "../projects/projects.repository.js";
import {
  aggregateRabResourceNeeds,
  calculateRabLineSubtotal,
  calculateRabTotals,
} from "./rab.calculator.js";
import { rabDocumentRepository, rabItemRepository } from "./rab.repository.js";

type ResolvedRabItemPayload = Omit<RabItem, keyof BaseAuditFields>;

export class RabService {
  private async getCompanySnapshot(): Promise<CompanySnapshot> {
    const snap = await getFirestoreDb()
      .collection(FIRESTORE_COLLECTIONS.COMPANY_SETTINGS)
      .doc("default")
      .get();

    if (!snap.exists) {
      return {
        companyName: "PT Perusahaan Konstruksi Indonesia",
        address: "-",
        phone: "-",
        email: "-",
        currency: "IDR",
      };
    }

    const settings = snap.data() as CompanySettings;
    let logoUrl: string | undefined;
    if (settings.logoFileId) {
      const logoFile = await fileMetadataRepository.findById(settings.logoFileId);
      logoUrl = logoFile?.url;
    }

    return {
      companyName: settings.companyName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      ...(logoUrl ? { logoUrl } : {}),
      currency: settings.currency || "IDR",
    };
  }

  private assertEditable(doc: RabDocument): void {
    if (doc.status === RabStatus.FINAL || doc.status === RabStatus.ARCHIVED) {
      throw new AppError(
        "Dokumen RAB yang berstatus Final atau Arsip bersifat permanen. Buat revisi baru untuk melakukan perubahan.",
        409,
        "IMMUTABLE_RAB_DOCUMENT",
      );
    }
  }

  private async resolveItems(
    rabId: string,
    inputs: RabItemInput[],
  ): Promise<ResolvedRabItemPayload[]> {
    const units = await unitRepository.findAll();
    const unitMap = new Map(units.map((u) => [u.id, u]));
    const resolved: ResolvedRabItemPayload[] = [];

    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index]!;
      const order = input.order ?? index + 1;

      if (input.mode === RabItemMode.MANUAL) {
        const unitSnapshot = input.unitSnapshot!.trim();
        const unitPriceSnapshot = input.unitPriceSnapshot!;
        const subtotal = calculateRabLineSubtotal(input.volume, unitPriceSnapshot);

        resolved.push({
          rabId,
          sectionName: input.sectionName,
          order,
          mode: RabItemMode.MANUAL,
          name: input.name!.trim(),
          volume: input.volume,
          unitSnapshot,
          unitPriceSnapshot,
          subtotal,
        });
      } else {
        const ahsp = await ahspRepository.findById(input.ahspId!);
        if (!ahsp) {
          throw new AppError(
            `Analisis AHSP dengan ID "${input.ahspId}" tidak ditemukan`,
            400,
            "INVALID_REFERENCE",
          );
        }

        const components = await ahspComponentRepository.findByAhspId(ahsp.id);
        const unit = unitMap.get(ahsp.unitId);
        const unitSnapshot = unit?.symbol ?? "-";
        const unitPriceSnapshot = ahsp.unitPriceTotal;
        const subtotal = calculateRabLineSubtotal(input.volume, unitPriceSnapshot);

        const ahspComponentsSnapshot: RabComponentSnapshot[] = components.map((c) => ({
          componentType: c.componentType,
          referenceId: c.referenceId,
          referenceName: c.referenceName,
          unitSymbol: c.unitSymbol,
          coefficient: c.coefficient,
          unitPrice: c.unitPrice,
          subtotal: c.subtotal,
        }));

        resolved.push({
          rabId,
          sectionName: input.sectionName,
          order,
          mode: RabItemMode.AHSP,
          workItemId: ahsp.workItemId,
          ahspId: ahsp.id,
          name: input.name?.trim() || ahsp.name,
          volume: input.volume,
          unitSnapshot,
          unitPriceSnapshot,
          subtotal,
          ahspComponentsSnapshot,
        });
      }
    }

    return resolved;
  }

  private normalizeAdditionalCosts(items: RabCreateInput["additionalCosts"]): AdditionalCostItem[] {
    return (items ?? []).map((item) => ({
      id: item.id || randomUUID(),
      name: item.name,
      amount: item.amount,
      ...(item.notes ? { notes: item.notes } : {}),
    }));
  }

  async listRabs(query: RabListQuery): Promise<{ items: RabDocument[]; meta: PaginationMeta }> {
    const all = await rabDocumentRepository.findAll();
    const searchLower = query.search?.toLowerCase();

    const filtered = all.filter((doc) => {
      if (query.projectId && doc.projectId !== query.projectId) return false;
      if (query.status && doc.status !== query.status) return false;
      if (searchLower) {
        const haystack = [doc.documentNumber, doc.title, doc.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    return paginateArray(filtered, query.page, query.limit);
  }

  async getRabDetail(id: string): Promise<RabDetail> {
    const doc = await rabDocumentRepository.findById(id);
    if (!doc) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }

    const [items, project] = await Promise.all([
      rabItemRepository.findByRabId(id),
      projectRepository.findById(doc.projectId),
    ]);

    return {
      ...doc,
      items,
      ...(project ? { project } : {}),
      resourceSummary: aggregateRabResourceNeeds(items),
    };
  }

  async createRab(input: RabCreateInput, actor: AdminUser): Promise<RabDetail> {
    const project = await projectRepository.findById(input.projectId);
    if (!project) {
      throw new AppError("Proyek tidak ditemukan", 400, "INVALID_REFERENCE");
    }

    const [documentNumber, companySnapshot, resolvedItems] = await Promise.all([
      numberingService.nextRabDocumentNumber(),
      this.getCompanySnapshot(),
      this.resolveItems("pending", input.items),
    ]);

    const additionalCosts = this.normalizeAdditionalCosts(input.additionalCosts);
    const financials = calculateRabTotals({
      itemSubtotals: resolvedItems.map((i) => i.subtotal),
      overheadPercent: input.overheadPercent,
      profitPercent: input.profitPercent,
      taxPercent: input.taxPercent,
      additionalCosts,
    });

    const createdDoc = await rabDocumentRepository.create(
      {
        documentNumber,
        projectId: input.projectId,
        title: input.title,
        documentDate: input.documentDate,
        version: 1,
        status: RabStatus.DRAFT,
        overheadPercent: input.overheadPercent,
        profitPercent: input.profitPercent,
        taxPercent: input.taxPercent,
        additionalCosts,
        ...financials,
        ...(input.notes ? { notes: input.notes } : {}),
        companySnapshot,
      },
      actor.uid,
    );

    const savedItems = await rabItemRepository.replaceItems(
      createdDoc.id,
      resolvedItems.map((item) => ({ ...item, rabId: createdDoc.id })),
      actor.uid,
    );

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "RAB_CREATED",
      entityType: "rab_documents",
      entityId: createdDoc.id,
      summary: `Membuat dokumen RAB ${createdDoc.documentNumber} untuk proyek ${project.code}`,
    });

    return {
      ...createdDoc,
      items: savedItems,
      project,
      resourceSummary: aggregateRabResourceNeeds(savedItems),
    };
  }

  async updateRab(id: string, input: RabUpdateInput, actor: AdminUser): Promise<RabDetail> {
    const existing = await rabDocumentRepository.findById(id);
    if (!existing) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }
    this.assertEditable(existing);

    const targetProjectId = input.projectId ?? existing.projectId;
    if (input.projectId && input.projectId !== existing.projectId) {
      const project = await projectRepository.findById(input.projectId);
      if (!project) {
        throw new AppError("Proyek tidak ditemukan", 400, "INVALID_REFERENCE");
      }
    }

    let items: RabItem[];
    if (input.items) {
      const resolved = await this.resolveItems(id, input.items);
      items = await rabItemRepository.replaceItems(id, resolved, actor.uid);
    } else {
      items = await rabItemRepository.findByRabId(id);
    }

    const overheadPercent = input.overheadPercent ?? existing.overheadPercent;
    const profitPercent = input.profitPercent ?? existing.profitPercent;
    const taxPercent = input.taxPercent ?? existing.taxPercent;
    const additionalCosts = input.additionalCosts
      ? this.normalizeAdditionalCosts(input.additionalCosts)
      : existing.additionalCosts;

    const financials = calculateRabTotals({
      itemSubtotals: items.map((i) => i.subtotal),
      overheadPercent,
      profitPercent,
      taxPercent,
      additionalCosts,
    });

    const updatedDoc = await rabDocumentRepository.update(
      id,
      {
        projectId: targetProjectId,
        ...(input.title ? { title: input.title } : {}),
        ...(input.documentDate ? { documentDate: input.documentDate } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        overheadPercent,
        profitPercent,
        taxPercent,
        additionalCosts,
        ...financials,
      },
      actor.uid,
    );

    if (!updatedDoc) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "RAB_UPDATED",
      entityType: "rab_documents",
      entityId: updatedDoc.id,
      summary: `Memperbarui dokumen RAB ${updatedDoc.documentNumber}`,
    });

    const project = await projectRepository.findById(updatedDoc.projectId);
    return {
      ...updatedDoc,
      items,
      ...(project ? { project } : {}),
      resourceSummary: aggregateRabResourceNeeds(items),
    };
  }

  async recalculateRab(id: string, actor: AdminUser): Promise<RabDetail> {
    const existing = await rabDocumentRepository.findById(id);
    if (!existing) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }
    this.assertEditable(existing);

    const existingItems = await rabItemRepository.findByRabId(id);
    const recalculatedItems: RabItem[] = [];

    for (const item of existingItems) {
      const subtotal = calculateRabLineSubtotal(item.volume, item.unitPriceSnapshot);
      const updatedItem = await rabItemRepository.update(item.id, { subtotal }, actor.uid);
      if (updatedItem) recalculatedItems.push(updatedItem);
    }

    const financials = calculateRabTotals({
      itemSubtotals: recalculatedItems.map((i) => i.subtotal),
      overheadPercent: existing.overheadPercent,
      profitPercent: existing.profitPercent,
      taxPercent: existing.taxPercent,
      additionalCosts: existing.additionalCosts ?? [],
    });

    const updatedDoc = await rabDocumentRepository.update(id, financials, actor.uid);
    if (!updatedDoc) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }

    const project = await projectRepository.findById(updatedDoc.projectId);
    return {
      ...updatedDoc,
      items: recalculatedItems,
      ...(project ? { project } : {}),
      resourceSummary: aggregateRabResourceNeeds(recalculatedItems),
    };
  }

  async updateStatus(
    id: string,
    input: RabStatusChangeInput,
    actor: AdminUser,
  ): Promise<RabDocument> {
    const existing = await rabDocumentRepository.findById(id);
    if (!existing) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }

    if (existing.status === RabStatus.FINAL && input.status !== RabStatus.ARCHIVED) {
      throw new AppError(
        "Dokumen Final hanya dapat diarsipkan atau dibuat revisi baru",
        409,
        "IMMUTABLE_RAB_DOCUMENT",
      );
    }

    const updated = await rabDocumentRepository.update(id, { status: input.status }, actor.uid);
    if (!updated) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "RAB_STATUS_CHANGED",
      entityType: "rab_documents",
      entityId: updated.id,
      summary: `Mengubah status RAB ${updated.documentNumber} menjadi ${input.status}`,
    });

    return updated;
  }

  async finalizeRab(id: string, actor: AdminUser): Promise<RabDetail> {
    const existing = await rabDocumentRepository.findById(id);
    if (!existing) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }

    if (existing.status === RabStatus.FINAL) {
      return this.getRabDetail(id);
    }

    if (existing.status === RabStatus.ARCHIVED) {
      throw new AppError("Dokumen Arsip tidak dapat difinalisasi ulang", 409, "INVALID_STATUS");
    }

    const items = await rabItemRepository.findByRabId(id);
    if (items.length === 0) {
      throw new AppError("Dokumen RAB kosong tidak dapat difinalisasi", 400, "EMPTY_RAB_ITEMS");
    }

    const companySnapshot = await this.getCompanySnapshot();
    const financials = calculateRabTotals({
      itemSubtotals: items.map((i) => i.subtotal),
      overheadPercent: existing.overheadPercent,
      profitPercent: existing.profitPercent,
      taxPercent: existing.taxPercent,
      additionalCosts: existing.additionalCosts ?? [],
    });

    const finalized = await rabDocumentRepository.update(
      id,
      {
        status: RabStatus.FINAL,
        finalizedAt: new Date().toISOString(),
        companySnapshot,
        ...financials,
      },
      actor.uid,
    );

    if (existing.parentRabId) {
      const parent = await rabDocumentRepository.findById(existing.parentRabId);
      if (parent && parent.status === RabStatus.FINAL) {
        await rabDocumentRepository.update(parent.id, { status: RabStatus.ARCHIVED }, actor.uid);
      }
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "RAB_FINALIZED",
      entityType: "rab_documents",
      entityId: id,
      summary: `Memfinalisasi dokumen RAB ${existing.documentNumber}`,
    });

    const project = await projectRepository.findById(existing.projectId);
    return {
      ...(finalized ?? existing),
      items,
      ...(project ? { project } : {}),
      resourceSummary: aggregateRabResourceNeeds(items),
    };
  }

  async createRevision(id: string, actor: AdminUser): Promise<RabDetail> {
    const source = await rabDocumentRepository.findById(id);
    if (!source) {
      throw new AppError("Dokumen RAB sumber tidak ditemukan", 404, "NOT_FOUND");
    }

    const sourceItems = await rabItemRepository.findByRabId(id);
    const projectDocs = await rabDocumentRepository.findByProjectId(source.projectId);
    const maxVersion = projectDocs.reduce((max, d) => Math.max(max, d.version), source.version);
    const nextVersion = maxVersion + 1;

    const baseDocNumber = source.documentNumber.replace(/-REV\d+$/, "");
    const revisionNumber = `${baseDocNumber}-REV${nextVersion}`;
    const companySnapshot = await this.getCompanySnapshot();

    const revisionDoc = await rabDocumentRepository.create(
      {
        documentNumber: revisionNumber,
        projectId: source.projectId,
        title: source.title,
        documentDate: new Date().toISOString().slice(0, 10),
        version: nextVersion,
        parentRabId: source.id,
        status: RabStatus.DRAFT,
        subtotal: source.subtotal,
        overheadPercent: source.overheadPercent,
        overheadAmount: source.overheadAmount,
        profitPercent: source.profitPercent,
        profitAmount: source.profitAmount,
        taxPercent: source.taxPercent,
        taxAmount: source.taxAmount,
        additionalCosts: source.additionalCosts ?? [],
        additionalCostsTotal: source.additionalCostsTotal,
        grandTotal: source.grandTotal,
        ...(source.notes ? { notes: source.notes } : {}),
        companySnapshot,
      },
      actor.uid,
    );

    const clonedItemsPayload: ResolvedRabItemPayload[] = sourceItems.map((item) => ({
      rabId: revisionDoc.id,
      sectionName: item.sectionName,
      order: item.order,
      mode: item.mode,
      ...(item.workItemId ? { workItemId: item.workItemId } : {}),
      ...(item.ahspId ? { ahspId: item.ahspId } : {}),
      name: item.name,
      volume: item.volume,
      unitSnapshot: item.unitSnapshot,
      unitPriceSnapshot: item.unitPriceSnapshot,
      subtotal: item.subtotal,
      ...(item.ahspComponentsSnapshot
        ? { ahspComponentsSnapshot: item.ahspComponentsSnapshot }
        : {}),
    }));

    const savedItems = await rabItemRepository.replaceItems(
      revisionDoc.id,
      clonedItemsPayload,
      actor.uid,
    );

    if (source.status === RabStatus.DRAFT || source.status === RabStatus.REVIEW) {
      await rabDocumentRepository.update(source.id, { status: RabStatus.REVISION }, actor.uid);
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "RAB_REVISION_CREATED",
      entityType: "rab_documents",
      entityId: revisionDoc.id,
      summary: `Membuat revisi v${nextVersion} (${revisionNumber}) dari ${source.documentNumber}`,
    });

    const project = await projectRepository.findById(revisionDoc.projectId);
    return {
      ...revisionDoc,
      items: savedItems,
      ...(project ? { project } : {}),
      resourceSummary: aggregateRabResourceNeeds(savedItems),
    };
  }

  async listRevisions(id: string): Promise<RabDocument[]> {
    const doc = await rabDocumentRepository.findById(id);
    if (!doc) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }
    const projectDocs = await rabDocumentRepository.findByProjectId(doc.projectId);
    return projectDocs.sort((a, b) => b.version - a.version);
  }

  async deleteRab(id: string, actor: AdminUser): Promise<void> {
    const existing = await rabDocumentRepository.findById(id);
    if (!existing) {
      throw new AppError("Dokumen RAB tidak ditemukan", 404, "NOT_FOUND");
    }

    if (existing.status === RabStatus.FINAL || existing.status === RabStatus.ARCHIVED) {
      throw new AppError(
        "Dokumen RAB Final atau Arsip tidak dapat dihapus",
        409,
        "IMMUTABLE_RAB_DOCUMENT",
      );
    }

    const [inRealizations, hasRevisions] = await Promise.all([
      rabDocumentRepository.isReferencedInRealizations(id),
      rabDocumentRepository.hasChildRevisions(id),
    ]);

    if (inRealizations || hasRevisions) {
      throw new AppError(
        "Dokumen RAB memiliki relasi realisasi anggaran atau revisi turunan dan tidak dapat dihapus",
        409,
        "CONFLICT",
      );
    }

    await rabItemRepository.deleteByRabId(id);
    await rabDocumentRepository.deleteById(id);

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "RAB_DELETED",
      entityType: "rab_documents",
      entityId: id,
      summary: `Menghapus dokumen RAB ${existing.documentNumber}`,
    });
  }
}

export const rabService = new RabService();
