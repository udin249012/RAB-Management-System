import type { CompanySettings } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { BaseFirestoreRepository } from "../../repositories/base.repository.js";

export class CompanySettingsRepository extends BaseFirestoreRepository<CompanySettings> {
  constructor() {
    super(FIRESTORE_COLLECTIONS.COMPANY_SETTINGS);
  }

  async upsertDefault(
    data: Omit<CompanySettings, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
    actorUid: string,
  ): Promise<CompanySettings> {
    const existing = await this.findById("default");
    if (!existing) {
      return this.create(data, actorUid, "default");
    }
    const updated = await this.update("default", data, actorUid);
    return updated ?? existing;
  }
}

export const companySettingsRepository = new CompanySettingsRepository();
