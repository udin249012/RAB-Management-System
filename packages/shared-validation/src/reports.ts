import { z } from "zod";

const isoDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const reportTypeSchema = z.enum([
  "rab",
  "projects",
  "materials",
  "work-items",
  "ahsp",
  "realizations",
  "budget-comparison",
  "rab-revisions",
]);

export const reportQuerySchema = z.object({
  startDate: isoDateStringSchema.optional(),
  endDate: isoDateStringSchema.optional(),
  projectId: z.string().trim().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  format: z.enum(["json", "pdf", "excel"]).default("json"),
});

export const singleRabExportQuerySchema = z.object({
  format: z.enum(["pdf", "excel"]).default("pdf"),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type SingleRabExportQuery = z.infer<typeof singleRabExportQuerySchema>;
