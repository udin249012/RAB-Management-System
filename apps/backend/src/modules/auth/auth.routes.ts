import { Router } from "express";
import { adminMiddleware } from "../../middlewares/adminMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { getMeController, verifySessionController } from "./auth.controller.js";

export const authRouter: Router = Router();

authRouter.post("/verify", authMiddleware, adminMiddleware, verifySessionController);
authRouter.get("/me", authMiddleware, adminMiddleware, getMeController);
