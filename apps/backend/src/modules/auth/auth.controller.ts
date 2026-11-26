import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { authService } from "./auth.service.js";

export async function verifySessionController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.adminUser) {
      throw new AppError("Administrator tidak ditemukan pada request", 403, "FORBIDDEN");
    }
    const result = await authService.verifyAdminSession(req.adminUser);
    sendSuccess(res, result, 200, undefined, "Sesi administrator terverifikasi");
  } catch (error) {
    next(error);
  }
}

export async function getMeController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.adminUser) {
      throw new AppError("Administrator tidak ditemukan pada request", 403, "FORBIDDEN");
    }
    const result = await authService.getCurrentAdmin(req.adminUser);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
