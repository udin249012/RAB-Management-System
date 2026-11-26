import { Router } from "express";
import {
  monitoringSummaryQuerySchema,
  realizationCreateSchema,
  realizationListQuerySchema,
  realizationUpdateSchema,
} from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
  createRealizationController,
  deleteRealizationController,
  getDashboardSummaryController,
  getMonitoringSummaryController,
  listRealizationsController,
  updateRealizationController,
} from "./monitoring.controller.js";

export const realizationsRouter: Router = Router();
realizationsRouter.use(authMiddleware, adminMiddleware);
realizationsRouter.get("/", validateQuery(realizationListQuerySchema), listRealizationsController);
realizationsRouter.post("/", validateBody(realizationCreateSchema), createRealizationController);
realizationsRouter.put("/:id", validateBody(realizationUpdateSchema), updateRealizationController);
realizationsRouter.delete("/:id", deleteRealizationController);

export const monitoringRouter: Router = Router();
monitoringRouter.use(authMiddleware, adminMiddleware);
monitoringRouter.get(
  "/summary",
  validateQuery(monitoringSummaryQuerySchema),
  getMonitoringSummaryController,
);
monitoringRouter.get("/dashboard", getDashboardSummaryController);
