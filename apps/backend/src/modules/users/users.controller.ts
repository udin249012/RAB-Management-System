import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { usersService } from "./users.service.js";

export async function listAdminsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const admins = await usersService.listAdmins();
    sendSuccess(res, admins);
  } catch (error) {
    next(error);
  }
}

export async function updateOwnProfileController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await usersService.updateOwnProfile(req.adminUser!, req.body);
    sendSuccess(res, updated, 200, undefined, "Profil administrator berhasil diperbarui");
  } catch (error) {
    next(error);
  }
}
