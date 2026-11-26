import { Router } from "express";
import {
  rabCreateSchema,
  rabListQuerySchema,
  rabStatusChangeSchema,
  rabUpdateSchema,
} from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
  calculateRabController,
  createRabController,
  createRabRevisionController,
  deleteRabController,
  finalizeRabController,
  getRabByIdController,
  listRabRevisionsController,
  listRabsController,
  updateRabController,
  updateRabStatusController,
} from "./rab.controller.js";

export const rabRouter: Router = Router();

rabRouter.use(authMiddleware, adminMiddleware);
rabRouter.get("/", validateQuery(rabListQuerySchema), listRabsController);
rabRouter.post("/", validateBody(rabCreateSchema), createRabController);
rabRouter.get("/:id", getRabByIdController);
rabRouter.put("/:id", validateBody(rabUpdateSchema), updateRabController);
rabRouter.post("/:id/calculate", calculateRabController);
rabRouter.post("/:id/finalize", finalizeRabController);
rabRouter.post("/:id/revisions", createRabRevisionController);
rabRouter.get("/:id/revisions", listRabRevisionsController);
rabRouter.patch("/:id/status", validateBody(rabStatusChangeSchema), updateRabStatusController);
rabRouter.delete("/:id", deleteRabController);
