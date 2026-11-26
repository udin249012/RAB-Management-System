import { Router } from "express";
import { reportQuerySchema, singleRabExportQuerySchema } from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateQuery } from "../../middlewares/validateRequest.js";
import { exportSingleRabController, getReportController } from "./reports.controller.js";

export const reportsRouter: Router = Router();

reportsRouter.use(authMiddleware, adminMiddleware);
reportsRouter.get(
  "/rab/:id/export",
  validateQuery(singleRabExportQuerySchema),
  exportSingleRabController,
);
reportsRouter.get("/:type", validateQuery(reportQuerySchema), getReportController);
