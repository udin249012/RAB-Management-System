import type { NextFunction, Request, Response } from "express";
import { AdminRole, type AdminUser } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../config/collections.js";
import { getFirestoreDb } from "../config/firebase.js";
import { AppError } from "../utils/AppError.js";

export async function adminMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.authUser) {
      throw new AppError("Pengguna belum terautentikasi", 401, "UNAUTHORIZED");
    }

    const adminSnap = await getFirestoreDb()
      .collection(FIRESTORE_COLLECTIONS.ADMINS)
      .doc(req.authUser.uid)
      .get();

    if (!adminSnap.exists) {
      throw new AppError("Akun tidak terdaftar sebagai administrator", 403, "FORBIDDEN");
    }

    const adminData = { id: adminSnap.id, ...adminSnap.data() } as AdminUser;

    if (!adminData.isActive || adminData.role !== AdminRole.ADMIN) {
      throw new AppError("Akses administrator dinonaktifkan atau tidak valid", 403, "FORBIDDEN");
    }

    req.adminUser = adminData;
    next();
  } catch (error) {
    next(error);
  }
}
