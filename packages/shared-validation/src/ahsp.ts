import { z } from "zod";
import { AhspComponentType } from "@rab/shared-types";
import { paginationQuerySchema, positiveNumberSchema } from "./common.js";

const codeSchema = z
  .string()
  .trim()
  .min(1, "Kode AHSP wajib diisi")
  .max(40, "Kode AHSP maksimal 40 karakter")
  .regex(/^[A-Za-z0-9._/-]+$/, "Kode hanya boleh huruf, angka, titik, garis miring, atau strip");

export const ahspComponentInputSchema = z.object({
  componentType: z.nativeEnum(AhspComponentType),
  referenceId: z.string().trim().min(1, "Komponen wajib dipilih"),
  coefficient: positiveNumberSchema,
});

export const ahspCreateSchema = z.object({
  code: codeSchema,
  workItemId: z.string().trim().min(1, "Item pekerjaan wajib dipilih"),
  name: z.string().trim().min(1, "Nama analisis AHSP wajib diisi").max(200),
  sourceReference: z.string().trim().max(200).optional(),
  isActive: z.boolean().default(true),
  components: z
    .array(ahspComponentInputSchema)
    .min(1, "Analisis AHSP wajib memiliki minimal 1 komponen"),
});

export const ahspUpdateSchema = z.object({
  code: codeSchema.optional(),
  workItemId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  sourceReference: z.string().trim().max(200).optional(),
  isActive: z.boolean().optional(),
  changeReason: z.string().trim().max(300).optional(),
  components: z.array(ahspComponentInputSchema).min(1).optional(),
});

export const ahspCopySchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1).max(200).optional(),
  workItemId: z.string().trim().min(1).optional(),
  sourceReference: z.string().trim().max(200).optional(),
});

export const ahspListQuerySchema = paginationQuerySchema.extend({
  workItemId: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type AhspComponentInput = z.infer<typeof ahspComponentInputSchema>;
export type AhspCreateInput = z.infer<typeof ahspCreateSchema>;
export type AhspUpdateInput = z.infer<typeof ahspUpdateSchema>;
export type AhspCopyInput = z.infer<typeof ahspCopySchema>;
export type AhspListQuery = z.infer<typeof ahspListQuerySchema>;
