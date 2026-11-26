import { z } from "zod";
import { percentageSchema } from "./common.js";

export const companySettingsUpdateSchema = z.object({
  companyName: z.string().trim().min(1, "Nama perusahaan wajib diisi").max(200),
  address: z.string().trim().min(1, "Alamat perusahaan wajib diisi").max(500),
  phone: z.string().trim().min(1, "Nomor telepon wajib diisi").max(50),
  email: z.string().trim().email("Format email perusahaan tidak valid"),
  logoFileId: z.string().trim().optional(),
  currency: z.string().trim().min(3).max(10).default("IDR"),
  projectCodeFormat: z.string().trim().min(3, "Format kode proyek minimal 3 karakter").max(60),
  rabNumberFormat: z.string().trim().min(3, "Format nomor RAB minimal 3 karakter").max(60),
  defaultTaxPercent: percentageSchema,
  defaultOverheadPercent: percentageSchema,
  defaultProfitPercent: percentageSchema,
});

export const adminProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
});

export type CompanySettingsUpdateInput = z.infer<typeof companySettingsUpdateSchema>;
export type AdminProfileUpdateInput = z.infer<typeof adminProfileUpdateSchema>;
