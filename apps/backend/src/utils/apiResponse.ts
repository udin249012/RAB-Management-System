import type { Response } from "express";
import type { ApiSuccessResponse, PaginationMeta } from "@rab/shared-types";

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta,
  message?: string,
): Response {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
    ...(message ? { message } : {}),
  };

  return res.status(statusCode).json(payload);
}
