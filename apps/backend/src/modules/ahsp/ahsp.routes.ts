import { Router } from "express";
import {
  ahspCopySchema,
  ahspCreateSchema,
  ahspListQuerySchema,
  ahspUpdateSchema,
} from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
  copyAhspController,
  createAhspController,
  deleteAhspController,
  getAhspByIdController,
  listAhspController,
  recalculateAhspController,
  updateAhspController,
} from "./ahsp.controller.js";

export const ahspRouter: Router = Router();

ahspRouter.use(authMiddleware, adminMiddleware);
ahspRouter.get("/", validateQuery(ahspListQuerySchema), listAhspController);
ahspRouter.post("/", validateBody(ahspCreateSchema), createAhspController);
ahspRouter.get("/:id", getAhspByIdController);
ahspRouter.put("/:id", validateBody(ahspUpdateSchema), updateAhspController);
ahspRouter.post("/:id/recalculate", recalculateAhspController);
ahspRouter.post("/:id/copy", validateBody(ahspCopySchema), copyAhspController);
ahspRouter.delete("/:id", deleteAhspController);
