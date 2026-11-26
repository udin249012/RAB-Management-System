import { describe, expect, it } from "vitest";
import { RabItemMode } from "@rab/shared-types";
import { rabCreateSchema } from "./rab.js";

describe("RAB validation schemas", () => {
  it("validates manual and AHSP items in a RAB document", () => {
    const res = rabCreateSchema.safeParse({
      projectId: "prj-1",
      title: "RAB Pembangunan Tahap 1",
      documentDate: "2026-03-15",
      overheadPercent: 10,
      profitPercent: 5,
      taxPercent: 11,
      items: [
        {
          sectionName: "Pekerjaan Persiapan",
          order: 1,
          mode: RabItemMode.MANUAL,
          name: "Pembersihan Lahan",
          volume: 100,
          unitSnapshot: "m2",
          unitPriceSnapshot: 25000,
        },
        {
          sectionName: "Pekerjaan Struktur",
          order: 2,
          mode: RabItemMode.AHSP,
          ahspId: "ahsp-1",
          volume: 12.5,
        },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("rejects manual item missing unitPriceSnapshot or AHSP item missing ahspId", () => {
    const badManual = rabCreateSchema.safeParse({
      projectId: "prj-1",
      title: "RAB Invalid",
      documentDate: "2026-03-15",
      items: [
        {
          sectionName: "Persiapan",
          order: 1,
          mode: RabItemMode.MANUAL,
          name: "Item X",
          volume: 10,
          unitSnapshot: "m2",
        },
      ],
    });
    expect(badManual.success).toBe(false);

    const badAhsp = rabCreateSchema.safeParse({
      projectId: "prj-1",
      title: "RAB Invalid",
      documentDate: "2026-03-15",
      items: [
        {
          sectionName: "Struktur",
          order: 1,
          mode: RabItemMode.AHSP,
          volume: 10,
        },
      ],
    });
    expect(badAhsp.success).toBe(false);
  });
});
