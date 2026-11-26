import { z } from "zod";
import { RabItemMode, RabStatus } from "@rab/shared-types";
import {
  nonNegativeNumberSchema,
  paginationQuerySchema,
  percentageSchema,
  positiveNumberSchema,
} from "./common.js";

const isoDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const additionalCostInputSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, "Nama biaya tambahan wajib diisi").max(160),
  amount: nonNegativeNumberSchema,
  notes: z.string().trim().max(300).optional(),
});

export const rabItemInputSchema = z
  .object({
    sectionName: z.string().trim().min(1, "Kategori pekerjaan wajib diisi").max(120),
    order: z.coerce.number().int().min(1).default(1),
    mode: z.nativeEnum(RabItemMode),
    workItemId: z.string().trim().optional(),
    ahspId: z.string().trim().optional(),
    name: z.string().trim().max(200).optional(),
    volume: positiveNumberSchema,
    unitSnapshot: z.string().trim().max(40).optional(),
    unitPriceSnapshot: nonNegativeNumberSchema.optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === RabItemMode.MANUAL) {
      if (!val.name || val.name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Nama pekerjaan manual wajib diisi",
          path: ["name"],
        });
      }
      if (!val.unitSnapshot || val.unitSnapshot.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Satuan pekerjaan manual wajib diisi",
          path: ["unitSnapshot"],
        });
      }
      if (val.unitPriceSnapshot === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Harga satuan pekerjaan manual wajib diisi",
          path: ["unitPriceSnapshot"],
        });
      }
    } else if (val.mode === RabItemMode.AHSP) {
      if (!val.ahspId || val.ahspId.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Analisis AHSP wajib dipilih",
          path: ["ahspId"],
        });
      }
    }
  });

export const rabCreateSchema = z.object({
  projectId: z.string().trim().min(1, "Proyek wajib dipilih"),
  title: z.string().trim().min(1, "Judul dokumen RAB wajib diisi").max(200),
  documentDate: isoDateStringSchema,
  overheadPercent: percentageSchema.default(0),
  profitPercent: percentageSchema.default(0),
  taxPercent: percentageSchema.default(11),
  additionalCosts: z.array(additionalCostInputSchema).default([]),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(rabItemInputSchema).min(1, "Dokumen RAB wajib memiliki minimal 1 item pekerjaan"),
});

export const rabUpdateSchema = rabCreateSchema.partial();

export const rabStatusChangeSchema = z.object({
  status: z.enum([RabStatus.DRAFT, RabStatus.REVIEW, RabStatus.ARCHIVED]),
});

export const rabListQuerySchema = paginationQuerySchema.extend({
  projectId: z.string().trim().optional(),
  status: z.nativeEnum(RabStatus).optional(),
});

export type AdditionalCostInput = z.infer<typeof additionalCostInputSchema>;
export type RabItemInput = z.infer<typeof rabItemInputSchema>;
export type RabCreateInput = z.infer<typeof rabCreateSchema>;
export type RabUpdateInput = z.infer<typeof rabUpdateSchema>;
export type RabStatusChangeInput = z.infer<typeof rabStatusChangeSchema>;
export type RabListQuery = z.infer<typeof rabListQuerySchema>;
