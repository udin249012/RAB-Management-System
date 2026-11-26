import type { NextFunction, Request, Response } from "express";
import type { AhspListQuery } from "@rab/shared-validation";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getRequiredParam } from "../../utils/requestParams.js";
import { ahspService } from "./ahsp.service.js";

export async function listAhspController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await ahspService.listAhsp(req.query as unknown as AhspListQuery);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getAhspByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await ahspService.getAhspDetail(getRequiredParam(req, "id"));
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

export async function createAhspController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await ahspService.createAhsp(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Analisis AHSP berhasil dibuat");
  } catch (error) {
    next(error);
  }
}

export async function updateAhspController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await ahspService.updateAhsp(
      getRequiredParam(req, "id"),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, updated, 200, undefined, "Analisis AHSP berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function recalculateAhspController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await ahspService.recalculateFromCatalog(
      getRequiredParam(req, "id"),
      req.adminUser!,
    );
    sendSuccess(
      res,
      updated,
      200,
      undefined,
      "Harga satuan AHSP berhasil disinkronkan dari katalog",
    );
  } catch (error) {
    next(error);
  }
}

export async function copyAhspController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const copied = await ahspService.copyAhsp(
      getRequiredParam(req, "id"),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, copied, 201, undefined, "Analisis AHSP berhasil disalin");
  } catch (error) {
    next(error);
  }
}

export async function deleteAhspController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await ahspService.deleteAhsp(getRequiredParam(req, "id"), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Analisis AHSP berhasil dihapus");
  } catch (error) {
    next(error);
  }
}
