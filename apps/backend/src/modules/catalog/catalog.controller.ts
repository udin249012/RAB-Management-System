import type { NextFunction, Request, Response } from "express";
import type { MaterialListQuery, WorkItemListQuery } from "@rab/shared-validation";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { getRequiredParam } from "../../utils/requestParams.js";
import { catalogService } from "./catalog.service.js";

function getIdParam(req: Request): string {
  return getRequiredParam(req, "id");
}

// -------- UNITS --------
export async function listUnitsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await catalogService.listUnits();
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

export async function createUnitController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await catalogService.createUnit(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Satuan berhasil ditambahkan");
  } catch (error) {
    next(error);
  }
}

export async function updateUnitController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await catalogService.updateUnit(getIdParam(req), req.body, req.adminUser!);
    sendSuccess(res, updated, 200, undefined, "Satuan berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteUnitController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await catalogService.deleteUnit(getIdParam(req), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Satuan berhasil dihapus");
  } catch (error) {
    next(error);
  }
}

// -------- MATERIAL CATEGORIES --------
export async function listMaterialCategoriesController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await catalogService.listMaterialCategories();
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

export async function createMaterialCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await catalogService.createMaterialCategory(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Kategori material berhasil ditambahkan");
  } catch (error) {
    next(error);
  }
}

export async function updateMaterialCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await catalogService.updateMaterialCategory(
      getIdParam(req),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, updated, 200, undefined, "Kategori material berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteMaterialCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await catalogService.deleteMaterialCategory(getIdParam(req), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Kategori material berhasil dihapus");
  } catch (error) {
    next(error);
  }
}

// -------- MATERIALS --------
export async function listMaterialsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await catalogService.listMaterials(req.query as unknown as MaterialListQuery);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getMaterialByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await catalogService.getMaterialById(getIdParam(req));
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
}

export async function createMaterialController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await catalogService.createMaterial(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Item katalog berhasil ditambahkan");
  } catch (error) {
    next(error);
  }
}

export async function updateMaterialController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await catalogService.updateMaterial(getIdParam(req), req.body, req.adminUser!);
    sendSuccess(res, updated, 200, undefined, "Item katalog berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteMaterialController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await catalogService.deleteMaterial(getIdParam(req), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Item katalog berhasil dihapus");
  } catch (error) {
    next(error);
  }
}

export async function exportMaterialsExcelController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const buffer = await catalogService.exportMaterialsExcel();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", 'attachment; filename="katalog-material.xlsx"');
    res.status(200).send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function importMaterialsExcelController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new AppError("File Excel (.xlsx) wajib diunggah", 400, "FILE_REQUIRED");
    }
    const result = await catalogService.importMaterialsExcel(req.file.buffer, req.adminUser!);
    sendSuccess(res, result, 200, undefined, "Proses import Excel selesai");
  } catch (error) {
    next(error);
  }
}

// -------- WORK CATEGORIES --------
export async function listWorkCategoriesController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await catalogService.listWorkCategories();
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

export async function createWorkCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await catalogService.createWorkCategory(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Kategori pekerjaan berhasil ditambahkan");
  } catch (error) {
    next(error);
  }
}

export async function updateWorkCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await catalogService.updateWorkCategory(
      getIdParam(req),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, updated, 200, undefined, "Kategori pekerjaan berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkCategoryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await catalogService.deleteWorkCategory(getIdParam(req), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Kategori pekerjaan berhasil dihapus");
  } catch (error) {
    next(error);
  }
}

// -------- WORK ITEMS --------
export async function listWorkItemsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await catalogService.listWorkItems(req.query as unknown as WorkItemListQuery);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getWorkItemByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const item = await catalogService.getWorkItemById(getIdParam(req));
    sendSuccess(res, item);
  } catch (error) {
    next(error);
  }
}

export async function createWorkItemController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await catalogService.createWorkItem(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Item pekerjaan berhasil ditambahkan");
  } catch (error) {
    next(error);
  }
}

export async function updateWorkItemController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await catalogService.updateWorkItem(getIdParam(req), req.body, req.adminUser!);
    sendSuccess(res, updated, 200, undefined, "Item pekerjaan berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteWorkItemController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await catalogService.deleteWorkItem(getIdParam(req), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Item pekerjaan berhasil dihapus");
  } catch (error) {
    next(error);
  }
}
