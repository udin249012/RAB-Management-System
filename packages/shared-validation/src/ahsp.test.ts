import { describe, expect, it } from "vitest";
import { AhspComponentType } from "@rab/shared-types";
import { ahspCopySchema, ahspCreateSchema } from "./ahsp.js";

describe("AHSP validation schemas", () => {
  it("validates valid AHSP payload with positive coefficient", () => {
    const res = ahspCreateSchema.safeParse({
      code: "AHSP-STR-01",
      workItemId: "work-1",
      name: "Pengecoran Beton K-250",
      sourceReference: "SNI 7394:2008",
      components: [
        {
          componentType: AhspComponentType.MATERIAL,
          referenceId: "mat-1",
          coefficient: 0.35,
        },
        {
          componentType: AhspComponentType.LABOR,
          referenceId: "work-labor-1",
          coefficient: 1.65,
        },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("rejects AHSP payload without components or non-positive coefficient", () => {
    expect(
      ahspCreateSchema.safeParse({
        code: "AHSP-01",
        workItemId: "work-1",
        name: "Kosong",
        components: [],
      }).success,
    ).toBe(false);

    expect(
      ahspCreateSchema.safeParse({
        code: "AHSP-01",
        workItemId: "work-1",
        name: "Koefisien Nol",
        components: [
          { componentType: AhspComponentType.MATERIAL, referenceId: "mat-1", coefficient: 0 },
        ],
      }).success,
    ).toBe(false);
  });

  it("validates AHSP copy payload", () => {
    expect(ahspCopySchema.safeParse({ code: "AHSP-STR-02" }).success).toBe(true);
    expect(ahspCopySchema.safeParse({ code: "" }).success).toBe(false);
  });
});
