import { describe, expect, it } from "vitest";
import { ProjectStatus } from "@rab/shared-types";
import { projectCreateSchema, projectUpdateSchema } from "./projects.js";

describe("projects validation schemas", () => {
  it("validates a valid project creation payload", () => {
    const res = projectCreateSchema.safeParse({
      name: "Pembangunan Gedung Kantor",
      location: "Jakarta Selatan",
      ownerName: "PT Nusantara",
      picName: "Budi Santoso",
      startDate: "2026-01-10",
      targetEndDate: "2026-08-30",
      status: ProjectStatus.PLANNING,
    });
    expect(res.success).toBe(true);
  });

  it("rejects project where targetEndDate is earlier than startDate", () => {
    const res = projectCreateSchema.safeParse({
      name: "Gedung B",
      location: "Bandung",
      ownerName: "PT Maju",
      picName: "Andi",
      startDate: "2026-05-10",
      targetEndDate: "2026-04-01",
    });
    expect(res.success).toBe(false);

    const updateRes = projectUpdateSchema.safeParse({
      startDate: "2026-05-10",
      targetEndDate: "2026-04-01",
    });
    expect(updateRes.success).toBe(false);
  });
});
