import type { NextFunction, Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { settingsService } from "./settings.service.js";

export async function getSettingsController(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const settings = await settingsService.getSettings();
    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
}

export async function updateSettingsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await settingsService.updateSettings(req.body, req.adminUser!);
    sendSuccess(res, updated, 200, undefined, "Pengaturan perusahaan berhasil disimpan");
  } catch (error) {
    next(error);
  }
}
