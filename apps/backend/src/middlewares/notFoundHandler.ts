import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`, 404, "NOT_FOUND"));
}
