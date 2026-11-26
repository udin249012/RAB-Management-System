import type { AdminUser, CompanySettingsDetail } from "@rab/shared-types";
import type { CompanySettingsUpdateInput } from "@rab/shared-validation";
import { activityLogService } from "../../services/activityLog.service.js";
import { fileMetadataRepository } from "../files/files.repository.js";
import { companySettingsRepository } from "./settings.repository.js";

export class SettingsService {
  async getSettings(): Promise<CompanySettingsDetail> {
    const existing = await companySettingsRepository.findById("default");
    if (!existing) {
      const now = new Date().toISOString();
      return {
        id: "default",
        companyName: "PT Perusahaan Konstruksi Indonesia",
        address: "-",
        phone: "-",
        email: "admin@perusahaan.co.id",
        currency: "IDR",
        projectCodeFormat: "PRJ-{YYYY}-{SEQ}",
        rabNumberFormat: "RAB/{YYYY}/{MM}/{SEQ}",
        defaultTaxPercent: 11,
        defaultOverheadPercent: 10,
        defaultProfitPercent: 5,
        createdAt: now,
        updatedAt: now,
        createdBy: "system",
        updatedBy: "system",
      };
    }

    let logoUrl: string | undefined;
    if (existing.logoFileId) {
      const logoFile = await fileMetadataRepository.findById(existing.logoFileId);
      logoUrl = logoFile?.url;
    }

    return {
      ...existing,
      ...(logoUrl ? { logoUrl } : {}),
    };
  }

  async updateSettings(
    input: CompanySettingsUpdateInput,
    actor: AdminUser,
  ): Promise<CompanySettingsDetail> {
    const saved = await companySettingsRepository.upsertDefault(input, actor.uid);

    let logoUrl: string | undefined;
    if (saved.logoFileId) {
      const logoFile = await fileMetadataRepository.findById(saved.logoFileId);
      logoUrl = logoFile?.url;
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "SETTINGS_UPDATED",
      entityType: "company_settings",
      entityId: "default",
      summary: `Memperbarui pengaturan perusahaan (${saved.companyName})`,
    });

    return {
      ...saved,
      ...(logoUrl ? { logoUrl } : {}),
    };
  }
}

export const settingsService = new SettingsService();
