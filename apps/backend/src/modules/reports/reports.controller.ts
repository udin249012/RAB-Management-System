import type { NextFunction, Request, Response } from "express";
import {
  reportTypeSchema,
  type ReportQuery,
  type SingleRabExportQuery,
} from "@rab/shared-validation";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getRequiredParam } from "../../utils/requestParams.js";
import { reportsService } from "./reports.service.js";

export async function getReportController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const type = reportTypeSchema.parse(getRequiredParam(req, "type"));
    const query = req.query as unknown as ReportQuery;

    if (query.format === "pdf" || query.format === "excel") {
      const exported = await reportsService.exportReport(type, query, query.format, req.adminUser!);
      res.setHeader("Content-Type", exported.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
      res.status(200).send(exported.buffer);
      return;
    }

    const dataset = await reportsService.buildReportDataset(type, query);
    sendSuccess(res, dataset);
  } catch (error) {
    next(error);
  }
}

export async function exportSingleRabController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rabId = getRequiredParam(req, "id");
    const query = req.query as unknown as SingleRabExportQuery;
    const exported = await reportsService.exportSingleRab(rabId, query.format, req.adminUser!);

    res.setHeader("Content-Type", exported.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exported.filename}"`);
    res.status(200).send(exported.buffer);
  } catch (error) {
    next(error);
  }
}
