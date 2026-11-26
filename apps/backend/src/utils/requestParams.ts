import type { Request } from "express";
import { AppError } from "./AppError.js";

export function getRequiredParam(req: Request, key = "id"): string {
  const raw = req.params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    throw new AppError(`Parameter "${key}" wajib diisi`, 400, "VALIDATION_ERROR");
  }
  return value;
}
