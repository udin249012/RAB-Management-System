import { z } from "zod";
import { paginationQuerySchema, positiveNumberSchema } from "./common.js";

const isoDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const realizationCreateSchema = z.object({
  projectId: z.string().trim().min(1, "Proyek wajib dipilih"),
  rabDocumentId: z.string().trim().min(1, "Dokumen RAB final wajib dipilih"),
  category: z.string().trim().min(1, "Kategori realisasi wajib diisi").max(100),
  transactionDate: isoDateStringSchema,
  description: z.string().trim().min(1, "Keterangan transaksi wajib diisi").max(500),
  amount: positiveNumberSchema,
  referenceNumber: z.string().trim().max(100).optional(),
  evidenceFileId: z.string().trim().optional(),
});

export const realizationUpdateSchema = realizationCreateSchema.partial();

export const realizationListQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().trim().optional(),
  rabDocumentId: z.string().trim().optional(),
  category: z.string().trim().optional(),
  startDate: isoDateStringSchema.optional(),
  endDate: isoDateStringSchema.optional(),
});

export const monitoringSummaryQuerySchema = z.object({
  projectId: z.string().trim().optional(),
});

export type RealizationCreateInput = z.infer<typeof realizationCreateSchema>;
export type RealizationUpdateInput = z.infer<typeof realizationUpdateSchema>;
export type RealizationListQuery = z.infer<typeof realizationListQuerySchema>;
export type MonitoringSummaryQuery = z.infer<typeof monitoringSummaryQuerySchema>;
