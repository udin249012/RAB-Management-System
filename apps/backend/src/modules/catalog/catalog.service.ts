import ExcelJS from "exceljs";
import type {
  AdminUser,
  Material,
  MaterialCategory,
  PaginationMeta,
  Unit,
  WorkCategory,
  WorkItem,
} from "@rab/shared-types";
import {
  materialCreateSchema,
  type MaterialCategoryCreateInput,
  type MaterialCategoryUpdateInput,
  type MaterialCreateInput,
  type MaterialListQuery,
  type MaterialUpdateInput,
  type UnitCreateInput,
  type UnitUpdateInput,
  type WorkCategoryCreateInput,
  type WorkCategoryUpdateInput,
  type WorkItemCreateInput,
  type WorkItemListQuery,
  type WorkItemUpdateInput,
} from "@rab/shared-validation";
import { activityLogService } from "../../services/activityLog.service.js";
import { AppError } from "../../utils/AppError.js";
import { paginateArray } from "../../utils/pagination.js";
import {
  materialCategoryRepository,
  materialRepository,
  unitRepository,
  workCategoryRepository,
  workItemRepository,
} from "./catalog.repository.js";

export interface MaterialImportResult {
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; message: string }>;
}

export class CatalogService {
  // ---------------- UNITS ----------------
  async listUnits(): Promise<Unit[]> {
    return unitRepository.findAll();
  }

  async createUnit(input: UnitCreateInput, actor: AdminUser): Promise<Unit> {
    const duplicate = await unitRepository.existsByField("code", input.code);
    if (duplicate) {
      throw new AppError(`Kode satuan "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    const created = await unitRepository.create(input, actor.uid);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "UNIT_CREATED",
      entityType: "units",
      entityId: created.id,
      summary: `Menambahkan satuan ${created.name} (${created.symbol})`,
    });
    return created;
  }

  async updateUnit(id: string, input: UnitUpdateInput, actor: AdminUser): Promise<Unit> {
    if (input.code) {
      const duplicate = await unitRepository.existsByField("code", input.code, id);
      if (duplicate) {
        throw new AppError(`Kode satuan "${input.code}" sudah digunakan`, 409, "CONFLICT");
      }
    }
    const updated = await unitRepository.update(id, input, actor.uid);
    if (!updated) {
      throw new AppError("Satuan tidak ditemukan", 404, "NOT_FOUND");
    }
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "UNIT_UPDATED",
      entityType: "units",
      entityId: updated.id,
      summary: `Memperbarui satuan ${updated.name}`,
    });
    return updated;
  }

  async deleteUnit(id: string, actor: AdminUser): Promise<void> {
    const existing = await unitRepository.findById(id);
    if (!existing) {
      throw new AppError("Satuan tidak ditemukan", 404, "NOT_FOUND");
    }
    if (await unitRepository.isReferenced(id)) {
      throw new AppError(
        "Satuan masih digunakan pada katalog atau AHSP. Nonaktifkan statusnya jika tidak lagi dipakai.",
        409,
        "CONFLICT",
      );
    }
    await unitRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "UNIT_DELETED",
      entityType: "units",
      entityId: id,
      summary: `Menghapus satuan ${existing.name}`,
    });
  }

  // ---------------- MATERIAL CATEGORIES ----------------
  async listMaterialCategories(): Promise<MaterialCategory[]> {
    return materialCategoryRepository.findAll();
  }

  async createMaterialCategory(
    input: MaterialCategoryCreateInput,
    actor: AdminUser,
  ): Promise<MaterialCategory> {
    if (await materialCategoryRepository.existsByField("code", input.code)) {
      throw new AppError(`Kode kategori "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    const created = await materialCategoryRepository.create(input, actor.uid);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "MATERIAL_CATEGORY_CREATED",
      entityType: "material_categories",
      entityId: created.id,
      summary: `Menambahkan kategori material ${created.name}`,
    });
    return created;
  }

  async updateMaterialCategory(
    id: string,
    input: MaterialCategoryUpdateInput,
    actor: AdminUser,
  ): Promise<MaterialCategory> {
    if (input.code && (await materialCategoryRepository.existsByField("code", input.code, id))) {
      throw new AppError(`Kode kategori "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    const updated = await materialCategoryRepository.update(id, input, actor.uid);
    if (!updated) {
      throw new AppError("Kategori material tidak ditemukan", 404, "NOT_FOUND");
    }
    return updated;
  }

  async deleteMaterialCategory(id: string, actor: AdminUser): Promise<void> {
    const existing = await materialCategoryRepository.findById(id);
    if (!existing) {
      throw new AppError("Kategori material tidak ditemukan", 404, "NOT_FOUND");
    }
    if (await materialCategoryRepository.isReferenced(id)) {
      throw new AppError("Kategori masih digunakan oleh item material/peralatan", 409, "CONFLICT");
    }
    await materialCategoryRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "MATERIAL_CATEGORY_DELETED",
      entityType: "material_categories",
      entityId: id,
      summary: `Menghapus kategori material ${existing.name}`,
    });
  }

  // ---------------- MATERIALS & EQUIPMENT ----------------
  async listMaterials(
    query: MaterialListQuery,
  ): Promise<{ items: Material[]; meta: PaginationMeta }> {
    const [allMaterials, categories] = await Promise.all([
      materialRepository.findAll(),
      materialCategoryRepository.findAll(),
    ]);
    const categoryGroupMap = new Map(categories.map((c) => [c.id, c.group]));

    const searchLower = query.search?.toLowerCase();
    const filtered = allMaterials.filter((item) => {
      if (query.categoryId && item.categoryId !== query.categoryId) return false;
      if (query.group && categoryGroupMap.get(item.categoryId) !== query.group) return false;
      if (query.isActive !== undefined && item.isActive !== query.isActive) return false;
      if (searchLower) {
        const haystack = [item.code, item.name, item.brand, item.specification, item.supplier]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    return paginateArray(filtered, query.page, query.limit);
  }

  async getMaterialById(id: string): Promise<Material> {
    const found = await materialRepository.findById(id);
    if (!found) {
      throw new AppError("Item material/peralatan tidak ditemukan", 404, "NOT_FOUND");
    }
    return found;
  }

  async createMaterial(input: MaterialCreateInput, actor: AdminUser): Promise<Material> {
    const [codeExists, category, unit] = await Promise.all([
      materialRepository.existsByField("code", input.code),
      materialCategoryRepository.findById(input.categoryId),
      unitRepository.findById(input.unitId),
    ]);

    if (codeExists) {
      throw new AppError(`Kode item "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    if (!category) {
      throw new AppError("Kategori material tidak ditemukan", 400, "INVALID_REFERENCE");
    }
    if (!unit) {
      throw new AppError("Satuan tidak ditemukan", 400, "INVALID_REFERENCE");
    }

    const now = new Date().toISOString();
    const created = await materialRepository.create(
      {
        ...input,
        priceHistory: [
          {
            previousPrice: 0,
            newPrice: input.unitPrice,
            changedAt: now,
            changedBy: actor.email,
            reason: "Harga awal katalog",
          },
        ],
      },
      actor.uid,
    );

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "MATERIAL_CREATED",
      entityType: "materials",
      entityId: created.id,
      summary: `Menambahkan material/peralatan ${created.code} - ${created.name}`,
    });

    return created;
  }

  async updateMaterial(
    id: string,
    input: MaterialUpdateInput,
    actor: AdminUser,
  ): Promise<Material> {
    const existing = await materialRepository.findById(id);
    if (!existing) {
      throw new AppError("Item material/peralatan tidak ditemukan", 404, "NOT_FOUND");
    }

    if (input.code && (await materialRepository.existsByField("code", input.code, id))) {
      throw new AppError(`Kode item "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    if (input.categoryId && !(await materialCategoryRepository.findById(input.categoryId))) {
      throw new AppError("Kategori material tidak ditemukan", 400, "INVALID_REFERENCE");
    }
    if (input.unitId && !(await unitRepository.findById(input.unitId))) {
      throw new AppError("Satuan tidak ditemukan", 400, "INVALID_REFERENCE");
    }

    const { priceChangeReason, ...fieldsToUpdate } = input;
    let nextPriceHistory = existing.priceHistory ?? [];

    if (fieldsToUpdate.unitPrice !== undefined && fieldsToUpdate.unitPrice !== existing.unitPrice) {
      nextPriceHistory = [
        {
          previousPrice: existing.unitPrice,
          newPrice: fieldsToUpdate.unitPrice,
          changedAt: new Date().toISOString(),
          changedBy: actor.email,
          reason: priceChangeReason || "Pembaruan harga satuan",
        },
        ...nextPriceHistory,
      ];
    }

    const updated = await materialRepository.update(
      id,
      { ...fieldsToUpdate, priceHistory: nextPriceHistory },
      actor.uid,
    );
    if (!updated) {
      throw new AppError("Item material/peralatan tidak ditemukan", 404, "NOT_FOUND");
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "MATERIAL_UPDATED",
      entityType: "materials",
      entityId: updated.id,
      summary: `Memperbarui material/peralatan ${updated.code} - ${updated.name}`,
    });

    return updated;
  }

  async deleteMaterial(id: string, actor: AdminUser): Promise<void> {
    const existing = await materialRepository.findById(id);
    if (!existing) {
      throw new AppError("Item material/peralatan tidak ditemukan", 404, "NOT_FOUND");
    }
    if (await materialRepository.isReferenced(id)) {
      throw new AppError(
        "Item masih digunakan pada analisis AHSP. Nonaktifkan item jika tidak lagi dipakai.",
        409,
        "CONFLICT",
      );
    }
    await materialRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "MATERIAL_DELETED",
      entityType: "materials",
      entityId: id,
      summary: `Menghapus material/peralatan ${existing.code} - ${existing.name}`,
    });
  }

  async exportMaterialsExcel(): Promise<Buffer> {
    const [materials, categories, units] = await Promise.all([
      materialRepository.findAll(),
      materialCategoryRepository.findAll(),
      unitRepository.findAll(),
    ]);

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const unitMap = new Map(units.map((u) => [u.id, u]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Katalog Material & Peralatan");

    sheet.columns = [
      { header: "Kode Item", key: "code", width: 16 },
      { header: "Nama Item", key: "name", width: 32 },
      { header: "Kode Kategori", key: "categoryCode", width: 16 },
      { header: "Nama Kategori", key: "categoryName", width: 24 },
      { header: "Kode Satuan", key: "unitCode", width: 14 },
      { header: "Harga Satuan", key: "unitPrice", width: 18 },
      { header: "Merek", key: "brand", width: 18 },
      { header: "Spesifikasi", key: "specification", width: 28 },
      { header: "Supplier", key: "supplier", width: 22 },
      { header: "Status", key: "status", width: 12 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const item of materials) {
      const cat = categoryMap.get(item.categoryId);
      const unit = unitMap.get(item.unitId);
      sheet.addRow({
        code: item.code,
        name: item.name,
        categoryCode: cat?.code ?? "",
        categoryName: cat?.name ?? "",
        unitCode: unit?.code ?? "",
        unitPrice: item.unitPrice,
        brand: item.brand ?? "",
        specification: item.specification ?? "",
        supplier: item.supplier ?? "",
        status: item.isActive ? "AKTIF" : "NONAKTIF",
      });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  async importMaterialsExcel(buffer: Buffer, actor: AdminUser): Promise<MaterialImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new AppError("File Excel tidak memiliki worksheet", 400, "INVALID_EXCEL");
    }

    const [categories, units] = await Promise.all([
      materialCategoryRepository.findAll(),
      unitRepository.findAll(),
    ]);
    const categoryByCode = new Map(categories.map((c) => [c.code.toUpperCase(), c]));
    const unitByCode = new Map(units.map((u) => [u.code.toUpperCase(), u]));

    const result: MaterialImportResult = {
      createdCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: [],
    };

    const rowCount = sheet.rowCount;
    for (let rowIndex = 2; rowIndex <= rowCount; rowIndex += 1) {
      const row = sheet.getRow(rowIndex);
      const code = String(row.getCell(1).value ?? "").trim();
      const name = String(row.getCell(2).value ?? "").trim();
      const categoryCode = String(row.getCell(3).value ?? "")
        .trim()
        .toUpperCase();
      const unitCode = String(row.getCell(5).value ?? "")
        .trim()
        .toUpperCase();
      const unitPriceRaw = Number(row.getCell(6).value ?? 0);
      const brand = String(row.getCell(7).value ?? "").trim() || undefined;
      const specification = String(row.getCell(8).value ?? "").trim() || undefined;
      const supplier = String(row.getCell(9).value ?? "").trim() || undefined;
      const statusRaw = String(row.getCell(10).value ?? "AKTIF")
        .trim()
        .toUpperCase();

      if (!code && !name) {
        continue;
      }

      const category = categoryByCode.get(categoryCode);
      const unit = unitByCode.get(unitCode);

      if (!category) {
        result.skippedCount += 1;
        result.errors.push({
          row: rowIndex,
          message: `Kode kategori "${categoryCode}" tidak ditemukan`,
        });
        continue;
      }
      if (!unit) {
        result.skippedCount += 1;
        result.errors.push({
          row: rowIndex,
          message: `Kode satuan "${unitCode}" tidak ditemukan`,
        });
        continue;
      }

      const parsed = materialCreateSchema.safeParse({
        code,
        name,
        categoryId: category.id,
        unitId: unit.id,
        unitPrice: unitPriceRaw,
        brand,
        specification,
        supplier,
        isActive: statusRaw !== "NONAKTIF",
      });

      if (!parsed.success) {
        result.skippedCount += 1;
        result.errors.push({
          row: rowIndex,
          message: parsed.error.issues.map((i) => i.message).join(", "),
        });
        continue;
      }

      const existing = await materialRepository.findByCode(parsed.data.code);
      if (existing) {
        await this.updateMaterial(
          existing.id,
          { ...parsed.data, priceChangeReason: "Import Excel katalog" },
          actor,
        );
        result.updatedCount += 1;
      } else {
        await this.createMaterial(parsed.data, actor);
        result.createdCount += 1;
      }
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "MATERIALS_IMPORTED",
      entityType: "materials",
      entityId: "bulk",
      summary: `Import Excel material: ${result.createdCount} baru, ${result.updatedCount} diperbarui, ${result.skippedCount} dilewati`,
    });

    return result;
  }

  // ---------------- WORK CATEGORIES ----------------
  async listWorkCategories(): Promise<WorkCategory[]> {
    return workCategoryRepository.findAll();
  }

  async createWorkCategory(
    input: WorkCategoryCreateInput,
    actor: AdminUser,
  ): Promise<WorkCategory> {
    if (await workCategoryRepository.existsByField("code", input.code)) {
      throw new AppError(
        `Kode kategori pekerjaan "${input.code}" sudah digunakan`,
        409,
        "CONFLICT",
      );
    }
    const created = await workCategoryRepository.create(input, actor.uid);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "WORK_CATEGORY_CREATED",
      entityType: "work_categories",
      entityId: created.id,
      summary: `Menambahkan kategori pekerjaan ${created.name}`,
    });
    return created;
  }

  async updateWorkCategory(
    id: string,
    input: WorkCategoryUpdateInput,
    actor: AdminUser,
  ): Promise<WorkCategory> {
    if (input.code && (await workCategoryRepository.existsByField("code", input.code, id))) {
      throw new AppError(
        `Kode kategori pekerjaan "${input.code}" sudah digunakan`,
        409,
        "CONFLICT",
      );
    }
    const updated = await workCategoryRepository.update(id, input, actor.uid);
    if (!updated) {
      throw new AppError("Kategori pekerjaan tidak ditemukan", 404, "NOT_FOUND");
    }
    return updated;
  }

  async deleteWorkCategory(id: string, actor: AdminUser): Promise<void> {
    const existing = await workCategoryRepository.findById(id);
    if (!existing) {
      throw new AppError("Kategori pekerjaan tidak ditemukan", 404, "NOT_FOUND");
    }
    if (await workCategoryRepository.isReferenced(id)) {
      throw new AppError(
        "Kategori pekerjaan masih digunakan oleh katalog pekerjaan",
        409,
        "CONFLICT",
      );
    }
    await workCategoryRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "WORK_CATEGORY_DELETED",
      entityType: "work_categories",
      entityId: id,
      summary: `Menghapus kategori pekerjaan ${existing.name}`,
    });
  }

  // ---------------- WORK ITEMS ----------------
  async listWorkItems(
    query: WorkItemListQuery,
  ): Promise<{ items: WorkItem[]; meta: PaginationMeta }> {
    const [allItems, categories] = await Promise.all([
      workItemRepository.findAll(),
      workCategoryRepository.findAll(),
    ]);
    const categoryTypeMap = new Map(categories.map((c) => [c.id, c.type]));

    const searchLower = query.search?.toLowerCase();
    const filtered = allItems.filter((item) => {
      if (query.categoryId && item.categoryId !== query.categoryId) return false;
      if (query.type && categoryTypeMap.get(item.categoryId) !== query.type) return false;
      if (query.isActive !== undefined && item.isActive !== query.isActive) return false;
      if (searchLower) {
        const haystack = [item.code, item.name, item.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });

    return paginateArray(filtered, query.page, query.limit);
  }

  async getWorkItemById(id: string): Promise<WorkItem> {
    const found = await workItemRepository.findById(id);
    if (!found) {
      throw new AppError("Item pekerjaan tidak ditemukan", 404, "NOT_FOUND");
    }
    return found;
  }

  async createWorkItem(input: WorkItemCreateInput, actor: AdminUser): Promise<WorkItem> {
    const [codeExists, category, unit] = await Promise.all([
      workItemRepository.existsByField("code", input.code),
      workCategoryRepository.findById(input.categoryId),
      unitRepository.findById(input.unitId),
    ]);

    if (codeExists) {
      throw new AppError(`Kode pekerjaan "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    if (!category) {
      throw new AppError("Kategori pekerjaan tidak ditemukan", 400, "INVALID_REFERENCE");
    }
    if (!unit) {
      throw new AppError("Satuan tidak ditemukan", 400, "INVALID_REFERENCE");
    }

    const created = await workItemRepository.create(input, actor.uid);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "WORK_ITEM_CREATED",
      entityType: "work_items",
      entityId: created.id,
      summary: `Menambahkan item pekerjaan ${created.code} - ${created.name}`,
    });
    return created;
  }

  async updateWorkItem(
    id: string,
    input: WorkItemUpdateInput,
    actor: AdminUser,
  ): Promise<WorkItem> {
    if (input.code && (await workItemRepository.existsByField("code", input.code, id))) {
      throw new AppError(`Kode pekerjaan "${input.code}" sudah digunakan`, 409, "CONFLICT");
    }
    if (input.categoryId && !(await workCategoryRepository.findById(input.categoryId))) {
      throw new AppError("Kategori pekerjaan tidak ditemukan", 400, "INVALID_REFERENCE");
    }
    if (input.unitId && !(await unitRepository.findById(input.unitId))) {
      throw new AppError("Satuan tidak ditemukan", 400, "INVALID_REFERENCE");
    }

    const updated = await workItemRepository.update(id, input, actor.uid);
    if (!updated) {
      throw new AppError("Item pekerjaan tidak ditemukan", 404, "NOT_FOUND");
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "WORK_ITEM_UPDATED",
      entityType: "work_items",
      entityId: updated.id,
      summary: `Memperbarui item pekerjaan ${updated.code} - ${updated.name}`,
    });
    return updated;
  }

  async deleteWorkItem(id: string, actor: AdminUser): Promise<void> {
    const existing = await workItemRepository.findById(id);
    if (!existing) {
      throw new AppError("Item pekerjaan tidak ditemukan", 404, "NOT_FOUND");
    }
    if (await workItemRepository.isReferenced(id)) {
      throw new AppError(
        "Pekerjaan masih terhubung dengan AHSP atau dokumen RAB. Nonaktifkan item jika tidak lagi dipakai.",
        409,
        "CONFLICT",
      );
    }
    await workItemRepository.deleteById(id);
    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "WORK_ITEM_DELETED",
      entityType: "work_items",
      entityId: id,
      summary: `Menghapus item pekerjaan ${existing.code} - ${existing.name}`,
    });
  }
}

export const catalogService = new CatalogService();
