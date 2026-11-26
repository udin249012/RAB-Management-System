import type { PaginationMeta } from "@rab/shared-types";

export function paginateArray<T>(
  items: T[],
  page: number,
  limit: number,
): { items: T[]; meta: PaginationMeta } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: {
      page: safePage,
      limit,
      total,
      totalPages,
    },
  };
}
