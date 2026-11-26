import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@rab/shared-types";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    };
    return res.status(err.statusCode).json(payload);
  }

  if (err instanceof ZodError) {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Data permintaan tidak valid",
        details: err.issues.map((issue) => ({
          field: issue.path.join(".") || undefined,
          message: issue.message,
        })),
      },
    };
    return res.status(400).json(payload);
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Terjadi kesalahan pada server"
      : err instanceof Error
        ? err.message
        : "Unknown server error";

  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
    },
  };

  return res.status(500).json(payload);
}
