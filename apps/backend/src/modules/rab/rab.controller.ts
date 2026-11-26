import type { NextFunction, Request, Response } from "express";
import type { RabListQuery } from "@rab/shared-validation";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getRequiredParam } from "../../utils/requestParams.js";
import { rabService } from "./rab.service.js";

export async function listRabsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await rabService.listRabs(req.query as unknown as RabListQuery);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getRabByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await rabService.getRabDetail(getRequiredParam(req, "id"));
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

export async function createRabController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await rabService.createRab(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Dokumen RAB berhasil dibuat");
  } catch (error) {
    next(error);
  }
}

export async function updateRabController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await rabService.updateRab(
      getRequiredParam(req, "id"),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, updated, 200, undefined, "Dokumen RAB berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function calculateRabController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const recalculated = await rabService.recalculateRab(
      getRequiredParam(req, "id"),
      req.adminUser!,
    );
    sendSuccess(res, recalculated, 200, undefined, "Kalkulasi RAB berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function finalizeRabController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const finalized = await rabService.finalizeRab(getRequiredParam(req, "id"), req.adminUser!);
    sendSuccess(res, finalized, 200, undefined, "Dokumen RAB berhasil difinalisasi");
  } catch (error) {
    next(error);
  }
}

export async function createRabRevisionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const revision = await rabService.createRevision(getRequiredParam(req, "id"), req.adminUser!);
    sendSuccess(res, revision, 201, undefined, "Revisi dokumen RAB berhasil dibuat");
  } catch (error) {
    next(error);
  }
}

export async function listRabRevisionsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const revisions = await rabService.listRevisions(getRequiredParam(req, "id"));
    sendSuccess(res, revisions);
  } catch (error) {
    next(error);
  }
}

export async function updateRabStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await rabService.updateStatus(
      getRequiredParam(req, "id"),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, updated, 200, undefined, "Status RAB berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteRabController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await rabService.deleteRab(getRequiredParam(req, "id"), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Dokumen RAB berhasil dihapus");
  } catch (error) {
    next(error);
  }
}
