import { Router } from "express";
import { companySettingsUpdateSchema } from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody } from "../../middlewares/validateRequest.js";
import { getSettingsController, updateSettingsController } from "./settings.controller.js";

export const settingsRouter: Router = Router();

settingsRouter.use(authMiddleware, adminMiddleware);
settingsRouter.get("/", getSettingsController);
settingsRouter.put("/", validateBody(companySettingsUpdateSchema), updateSettingsController);
