import { Router } from "express";
import { fileMetadataCreateSchema } from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateRequest.js";
import {
  deleteFileMetadataController,
  listArchivesController,
  listFilesController,
  registerFileMetadataController,
} from "./files.controller.js";

export const filesRouter: Router = Router();

filesRouter.use(authMiddleware, adminMiddleware);
filesRouter.get("/", listFilesController);
filesRouter.get("/archives", listArchivesController);
filesRouter.get("/archives", listArchivesController);
filesRouter.post(
  "/metadata",
  validateBody(fileMetadataCreateSchema),
  registerFileMetadataController,
);
filesRouter.delete("/:id", deleteFileMetadataController);
