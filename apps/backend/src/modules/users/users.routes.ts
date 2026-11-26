import { Router } from "express";
import { adminProfileUpdateSchema } from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateRequest.js";
import { listAdminsController, updateOwnProfileController } from "./users.controller.js";

export const usersRouter: Router = Router();

usersRouter.use(authMiddleware, adminMiddleware);
usersRouter.get("/admins", listAdminsController);
usersRouter.patch("/me", validateBody(adminProfileUpdateSchema), updateOwnProfileController);
