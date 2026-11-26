import { z } from "zod";
import { MaterialCategoryGroup, WorkCategoryType } from "@rab/shared-types";
import { nonNegativeNumberSchema, paginationQuerySchema } from "./common.js";

const codeSchema = z
  .string()
  .trim()
  .min(1, "Kode wajib diisi")
  .max(40, "Kode maksimal 40 karakter")
  .regex(/^[A-Za-z0-9._/-]+$/, "Kode hanya boleh huruf, angka, titik, garis miring, atau strip");

export const unitCreateSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nama satuan wajib diisi").max(80),
  symbol: z.string().trim().min(1, "Simbol satuan wajib diisi").max(20),
  isActive: z.boolean().default(true),
});

export const unitUpdateSchema = unitCreateSchema.partial();

export const materialCategoryCreateSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nama kategori wajib diisi").max(100),
  group: z.nativeEnum(MaterialCategoryGroup),
  isActive: z.boolean().default(true),
});

export const materialCategoryUpdateSchema = materialCategoryCreateSchema.partial();

export const materialCreateSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nama item wajib diisi").max(160),
  categoryId: z.string().trim().min(1, "Kategori wajib dipilih"),
  unitId: z.string().trim().min(1, "Satuan wajib dipilih"),
  unitPrice: nonNegativeNumberSchema,
  brand: z.string().trim().max(100).optional(),
  specification: z.string().trim().max(300).optional(),
  description: z.string().trim().max(1000).optional(),
  supplier: z.string().trim().max(160).optional(),
  photoFileId: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const materialUpdateSchema = materialCreateSchema.partial().extend({
  priceChangeReason: z.string().trim().max(300).optional(),
});

export const materialListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().trim().optional(),
  group: z.nativeEnum(MaterialCategoryGroup).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const workCategoryCreateSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nama kategori pekerjaan wajib diisi").max(100),
  type: z.nativeEnum(WorkCategoryType),
  isActive: z.boolean().default(true),
});

export const workCategoryUpdateSchema = workCategoryCreateSchema.partial();

export const workItemCreateSchema = z.object({
  code: codeSchema,
  name: z.string().trim().min(1, "Nama pekerjaan wajib diisi").max(180),
  categoryId: z.string().trim().min(1, "Kategori pekerjaan wajib dipilih"),
  unitId: z.string().trim().min(1, "Satuan wajib dipilih"),
  description: z.string().trim().max(1000).optional(),
  basePrice: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    nonNegativeNumberSchema.optional(),
  ),
  isActive: z.boolean().default(true),
});

export const workItemUpdateSchema = workItemCreateSchema.partial();

export const workItemListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.string().trim().optional(),
  type: z.nativeEnum(WorkCategoryType).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type UnitCreateInput = z.infer<typeof unitCreateSchema>;
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>;
export type MaterialCategoryCreateInput = z.infer<typeof materialCategoryCreateSchema>;
export type MaterialCategoryUpdateInput = z.infer<typeof materialCategoryUpdateSchema>;
export type MaterialCreateInput = z.infer<typeof materialCreateSchema>;
export type MaterialUpdateInput = z.infer<typeof materialUpdateSchema>;
export type MaterialListQuery = z.infer<typeof materialListQuerySchema>;
export type WorkCategoryCreateInput = z.infer<typeof workCategoryCreateSchema>;
export type WorkCategoryUpdateInput = z.infer<typeof workCategoryUpdateSchema>;
export type WorkItemCreateInput = z.infer<typeof workItemCreateSchema>;
export type WorkItemUpdateInput = z.infer<typeof workItemUpdateSchema>;
export type WorkItemListQuery = z.infer<typeof workItemListQuerySchema>;
