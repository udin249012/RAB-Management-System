import type { NextFunction, Request, Response } from "express";
import { getFirebaseAuth } from "../config/firebase.js";
import { AppError } from "../utils/AppError.js";

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Token autentikasi tidak ditemukan", 401, "UNAUTHORIZED");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new AppError("Format token autentikasi tidak valid", 401, "UNAUTHORIZED");
    }

    const decoded = await getFirebaseAuth().verifyIdToken(token);
    req.authUser = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError("Token autentikasi tidak valid atau kedaluwarsa", 401, "INVALID_TOKEN"));
  }
}
