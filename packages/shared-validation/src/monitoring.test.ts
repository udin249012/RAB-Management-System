import { describe, expect, it } from "vitest";
import { realizationCreateSchema } from "./monitoring.js";

describe("monitoring validation schemas", () => {
  it("validates realization transaction payload", () => {
    const res = realizationCreateSchema.safeParse({
      projectId: "prj-1",
      rabDocumentId: "rab-1",
      category: "Material",
      transactionDate: "2026-04-10",
      description: "Pembelian semen 100 sak",
      amount: 7000000,
      referenceNumber: "INV-2026-001",
    });
    expect(res.success).toBe(true);
  });

  it("rejects zero or negative realization amount", () => {
    const res = realizationCreateSchema.safeParse({
      projectId: "prj-1",
      rabDocumentId: "rab-1",
      category: "Material",
      transactionDate: "2026-04-10",
      description: "Pembelian",
      amount: 0,
    });
    expect(res.success).toBe(false);
  });
});
