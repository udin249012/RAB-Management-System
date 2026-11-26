import { describe, expect, it } from "vitest";
import { reportQuerySchema, reportTypeSchema } from "./reports.js";

describe("reports validation schemas", () => {
  it("validates all 8 report types and query defaults", () => {
    const types = [
      "rab",
      "projects",
      "materials",
      "work-items",
      "ahsp",
      "realizations",
      "budget-comparison",
      "rab-revisions",
    ];
    for (const t of types) {
      expect(reportTypeSchema.safeParse(t).success).toBe(true);
    }

    const parsed = reportQuerySchema.parse({});
    expect(parsed.format).toBe("json");
  });

  it("rejects invalid date format or unsupported export format", () => {
    expect(reportQuerySchema.safeParse({ startDate: "01-04-2026" }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ format: "csv" }).success).toBe(false);
  });
});
