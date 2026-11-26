import { Router } from "express";
import {
  projectCreateSchema,
  projectListQuerySchema,
  projectUpdateSchema,
} from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import {
  createProjectController,
  deleteProjectController,
  getProjectByIdController,
  listProjectsController,
  updateProjectController,
} from "./projects.controller.js";

export const projectsRouter: Router = Router();

projectsRouter.use(authMiddleware, adminMiddleware);
projectsRouter.get("/", validateQuery(projectListQuerySchema), listProjectsController);
projectsRouter.post("/", validateBody(projectCreateSchema), createProjectController);
projectsRouter.get("/:id", getProjectByIdController);
projectsRouter.put("/:id", validateBody(projectUpdateSchema), updateProjectController);
projectsRouter.delete("/:id", deleteProjectController);
