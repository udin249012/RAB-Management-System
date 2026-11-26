import type { NextFunction, Request, Response } from "express";
import type { MonitoringSummaryQuery, RealizationListQuery } from "@rab/shared-validation";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getRequiredParam } from "../../utils/requestParams.js";
import { monitoringService } from "./monitoring.service.js";

export async function listRealizationsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await monitoringService.listRealizations(
      req.query as unknown as RealizationListQuery,
    );
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function createRealizationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await monitoringService.createRealization(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Realisasi biaya berhasil dicatat");
  } catch (error) {
    next(error);
  }
}

export async function updateRealizationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await monitoringService.updateRealization(
      getRequiredParam(req, "id"),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, updated, 200, undefined, "Realisasi biaya berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteRealizationController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await monitoringService.deleteRealization(getRequiredParam(req, "id"), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Realisasi biaya berhasil dihapus");
  } catch (error) {
    next(error);
  }
}

export async function getMonitoringSummaryController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await monitoringService.getMonitoringSummary(
      req.query as unknown as MonitoringSummaryQuery,
    );
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}

export async function getDashboardSummaryController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await monitoringService.getDashboardSummary();
    sendSuccess(res, summary);
  } catch (error) {
    next(error);
  }
}
