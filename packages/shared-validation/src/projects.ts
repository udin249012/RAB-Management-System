import { z } from "zod";
import { ProjectStatus, StorageProvider } from "@rab/shared-types";
import { paginationQuerySchema } from "./common.js";

const isoDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const projectBaseSchema = z.object({
  name: z.string().trim().min(1, "Nama proyek wajib diisi").max(200),
  location: z.string().trim().min(1, "Lokasi proyek wajib diisi").max(250),
  ownerName: z.string().trim().min(1, "Pemilik proyek wajib diisi").max(160),
  picName: z.string().trim().min(1, "Penanggung jawab wajib diisi").max(160),
  startDate: isoDateStringSchema,
  targetEndDate: isoDateStringSchema,
  description: z.string().trim().max(2000).default(""),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.PLANNING),
  coverImageFileId: z.string().trim().optional(),
  documentFileIds: z.array(z.string().trim()).default([]),
});

export const projectCreateSchema = projectBaseSchema.refine(
  (data) => data.targetEndDate >= data.startDate,
  {
    message: "Target selesai tidak boleh lebih awal dari tanggal mulai",
    path: ["targetEndDate"],
  },
);

export const projectUpdateSchema = projectBaseSchema.partial().refine(
  (data) => {
    if (data.startDate && data.targetEndDate) {
      return data.targetEndDate >= data.startDate;
    }
    return true;
  },
  {
    message: "Target selesai tidak boleh lebih awal dari tanggal mulai",
    path: ["targetEndDate"],
  },
);

export const projectListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const fileMetadataCreateSchema = z.object({
  storageProvider: z.nativeEnum(StorageProvider),
  storagePath: z.string().trim().min(1),
  url: z.string().trim().url("URL file tidak valid"),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().nonnegative(),
  entityType: z.string().trim().min(1).max(60),
  entityId: z.string().trim().min(1).max(120),
});

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export type FileMetadataCreateInput = z.infer<typeof fileMetadataCreateSchema>;
