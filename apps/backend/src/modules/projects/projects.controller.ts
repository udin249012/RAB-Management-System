import type { NextFunction, Request, Response } from "express";
import type { ProjectListQuery } from "@rab/shared-validation";
import { sendSuccess } from "../../utils/apiResponse.js";
import { getRequiredParam } from "../../utils/requestParams.js";
import { projectsService } from "./projects.service.js";

export async function listProjectsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await projectsService.listProjects(req.query as unknown as ProjectListQuery);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getProjectByIdController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await projectsService.getProjectDetail(getRequiredParam(req, "id"));
    sendSuccess(res, detail);
  } catch (error) {
    next(error);
  }
}

export async function createProjectController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const created = await projectsService.createProject(req.body, req.adminUser!);
    sendSuccess(res, created, 201, undefined, "Proyek berhasil dibuat");
  } catch (error) {
    next(error);
  }
}

export async function updateProjectController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await projectsService.updateProject(
      getRequiredParam(req, "id"),
      req.body,
      req.adminUser!,
    );
    sendSuccess(res, updated, 200, undefined, "Proyek berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}

export async function deleteProjectController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await projectsService.deleteProject(getRequiredParam(req, "id"), req.adminUser!);
    sendSuccess(res, { deleted: true }, 200, undefined, "Proyek berhasil dihapus");
  } catch (error) {
    next(error);
  }
}
