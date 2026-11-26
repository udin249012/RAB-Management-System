import { z } from "zod";
import { ProjectStatus, RabStatus } from "@rab/shared-types";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export const nonNegativeNumberSchema = z.coerce
  .number()
  .finite()
  .min(0, "Nilai tidak boleh negatif");

export const positiveNumberSchema = z.coerce
  .number()
  .finite()
  .gt(0, "Nilai harus lebih besar dari 0");

export const percentageSchema = z.coerce
  .number()
  .finite()
  .min(0, "Persentase minimal 0%")
  .max(100, "Persentase maksimal 100%");

export const projectStatusSchema = z.nativeEnum(ProjectStatus);
export const rabStatusSchema = z.nativeEnum(RabStatus);

export const loginFormSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type LoginFormInput = z.infer<typeof loginFormSchema>;
