import type { DecodedIdToken } from "firebase-admin/auth";
import type { AdminUser } from "@rab/shared-types";

declare global {
  namespace Express {
    interface Request {
      authUser?: DecodedIdToken;
      adminUser?: AdminUser;
    }
  }
}

export {};
