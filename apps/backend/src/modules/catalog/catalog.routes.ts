import { Router } from "express";
import multer from "multer";
import {
  materialCategoryCreateSchema,
  materialCategoryUpdateSchema,
  materialCreateSchema,
  materialListQuerySchema,
  materialUpdateSchema,
  unitCreateSchema,
  unitUpdateSchema,
  workCategoryCreateSchema,
  workCategoryUpdateSchema,
  workItemCreateSchema,
  workItemListQuerySchema,
  workItemUpdateSchema,
} from "@rab/shared-validation";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateBody, validateQuery } from "../../middlewares/validateRequest.js";
import { AppError } from "../../utils/AppError.js";
import {
  createMaterialCategoryController,
  createMaterialController,
  createUnitController,
  createWorkCategoryController,
  createWorkItemController,
  deleteMaterialCategoryController,
  deleteMaterialController,
  deleteUnitController,
  deleteWorkCategoryController,
  deleteWorkItemController,
  exportMaterialsExcelController,
  getMaterialByIdController,
  getWorkItemByIdController,
  importMaterialsExcelController,
  listMaterialCategoriesController,
  listMaterialsController,
  listUnitsController,
  listWorkCategoriesController,
  listWorkItemsController,
  updateMaterialCategoryController,
  updateMaterialController,
  updateUnitController,
  updateWorkCategoryController,
  updateWorkItemController,
} from "./catalog.controller.js";

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".xlsx")) {
      cb(null, true);
    } else {
      cb(
        new AppError("Hanya file Excel (.xlsx/.xls) yang diperbolehkan", 400, "INVALID_FILE_TYPE"),
      );
    }
  },
});

export const unitsRouter: Router = Router();
unitsRouter.use(authMiddleware, adminMiddleware);
unitsRouter.get("/", listUnitsController);
unitsRouter.post("/", validateBody(unitCreateSchema), createUnitController);
unitsRouter.put("/:id", validateBody(unitUpdateSchema), updateUnitController);
unitsRouter.delete("/:id", deleteUnitController);

export const materialCategoriesRouter: Router = Router();
materialCategoriesRouter.use(authMiddleware, adminMiddleware);
materialCategoriesRouter.get("/", listMaterialCategoriesController);
materialCategoriesRouter.post(
  "/",
  validateBody(materialCategoryCreateSchema),
  createMaterialCategoryController,
);
materialCategoriesRouter.put(
  "/:id",
  validateBody(materialCategoryUpdateSchema),
  updateMaterialCategoryController,
);
materialCategoriesRouter.delete("/:id", deleteMaterialCategoryController);

export const materialsRouter: Router = Router();
materialsRouter.use(authMiddleware, adminMiddleware);
materialsRouter.get("/", validateQuery(materialListQuerySchema), listMaterialsController);
materialsRouter.get("/export", exportMaterialsExcelController);
materialsRouter.post("/import", excelUpload.single("file"), importMaterialsExcelController);
materialsRouter.post("/", validateBody(materialCreateSchema), createMaterialController);
materialsRouter.get("/:id", getMaterialByIdController);
materialsRouter.put("/:id", validateBody(materialUpdateSchema), updateMaterialController);
materialsRouter.delete("/:id", deleteMaterialController);

export const workCategoriesRouter: Router = Router();
workCategoriesRouter.use(authMiddleware, adminMiddleware);
workCategoriesRouter.get("/", listWorkCategoriesController);
workCategoriesRouter.post(
  "/",
  validateBody(workCategoryCreateSchema),
  createWorkCategoryController,
);
workCategoriesRouter.put(
  "/:id",
  validateBody(workCategoryUpdateSchema),
  updateWorkCategoryController,
);
workCategoriesRouter.delete("/:id", deleteWorkCategoryController);

export const workItemsRouter: Router = Router();
workItemsRouter.use(authMiddleware, adminMiddleware);
workItemsRouter.get("/", validateQuery(workItemListQuerySchema), listWorkItemsController);
workItemsRouter.post("/", validateBody(workItemCreateSchema), createWorkItemController);
workItemsRouter.get("/:id", getWorkItemByIdController);
workItemsRouter.put("/:id", validateBody(workItemUpdateSchema), updateWorkItemController);
workItemsRouter.delete("/:id", deleteWorkItemController);
