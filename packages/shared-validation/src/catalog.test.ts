import { describe, expect, it } from "vitest";
import { MaterialCategoryGroup, WorkCategoryType } from "@rab/shared-types";
import {
  materialCategoryCreateSchema,
  materialCreateSchema,
  unitCreateSchema,
  workCategoryCreateSchema,
  workItemCreateSchema,
} from "./catalog.js";

describe("catalog validation schemas", () => {
  it("validates unit payload", () => {
    const valid = unitCreateSchema.safeParse({
      code: "M2",
      name: "Meter Persegi",
      symbol: "m2",
    });
    expect(valid.success).toBe(true);

    const invalid = unitCreateSchema.safeParse({
      code: "bad code with spaces",
      name: "",
      symbol: "m2",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates material category and material payloads", () => {
    expect(
      materialCategoryCreateSchema.safeParse({
        code: "MAT-01",
        name: "Material Struktur",
        group: MaterialCategoryGroup.MATERIAL,
      }).success,
    ).toBe(true);

    expect(
      materialCreateSchema.safeParse({
        code: "SMN-50",
        name: "Semen Portland 50kg",
        categoryId: "cat-1",
        unitId: "unit-sak",
        unitPrice: 72000,
      }).success,
    ).toBe(true);

    expect(
      materialCreateSchema.safeParse({
        code: "SMN-50",
        name: "Semen",
        categoryId: "cat-1",
        unitId: "unit-sak",
        unitPrice: -500,
      }).success,
    ).toBe(false);
  });

  it("validates work category and work item payloads", () => {
    expect(
      workCategoryCreateSchema.safeParse({
        code: "PKJ-STR",
        name: "Pekerjaan Struktur",
        type: WorkCategoryType.CONSTRUCTION,
      }).success,
    ).toBe(true);

    expect(
      workItemCreateSchema.safeParse({
        code: "STR-001",
        name: "Pengecoran Beton K-250",
        categoryId: "wcat-1",
        unitId: "unit-m3",
        basePrice: 1150000,
      }).success,
    ).toBe(true);
  });
});
