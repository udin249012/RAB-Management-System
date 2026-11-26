import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { getRequiredParam } from "../../utils/requestParams.js";
import { filesService } from "./files.service.js";

export async function registerFileMetadataController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await filesService.registerMetadata(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Metadata file berhasil disimpan");
  } catch (error) {
    next(error);
  }
}

export async function listFilesController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const entityType = String(req.query.entityType ?? "").trim();
    const entityId = String(req.query.entityId ?? "").trim();
    if (!entityType || !entityId) {
      throw new AppError(
        "Parameter query entityType dan entityId wajib diisi",
        400,
        "VALIDATION_ERROR",
      );
    }
    const items = await filesService.listByEntity(entityType, entityId);
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

export async function listArchivesController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const items = await filesService.listArchives();
    sendSuccess(res, items);
  } catch (error) {
    next(error);
  }
}

export async function deleteFileMetadataController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await filesService.deleteMetadata(getRequiredParam(req, "id"), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Metadata file berhasil dihapus");
  } catch (error) {
    next(error);
  }
}
