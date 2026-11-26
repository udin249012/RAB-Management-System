import { describe, expect, it } from "vitest";
import { adminProfileUpdateSchema, companySettingsUpdateSchema } from "./settings.js";

describe("settings validation schemas", () => {
  it("validates company settings payload", () => {
    const res = companySettingsUpdateSchema.safeParse({
      companyName: "PT Karya Mandiri",
      address: "Jl. Sudirman No. 10, Jakarta",
      phone: "021-5551234",
      email: "info@karyamandiri.co.id",
      currency: "IDR",
      projectCodeFormat: "PRJ-{YYYY}-{SEQ}",
      rabNumberFormat: "RAB/{YYYY}/{MM}/{SEQ}",
      defaultTaxPercent: 11,
      defaultOverheadPercent: 10,
      defaultProfitPercent: 5,
    });
    expect(res.success).toBe(true);
  });

  it("rejects invalid email or out-of-range tax percentage", () => {
    expect(
      companySettingsUpdateSchema.safeParse({
        companyName: "PT X",
        address: "Jl. A",
        phone: "021",
        email: "not-an-email",
        projectCodeFormat: "PRJ-{SEQ}",
        rabNumberFormat: "RAB-{SEQ}",
        defaultTaxPercent: 120,
        defaultOverheadPercent: 10,
        defaultProfitPercent: 5,
      }).success,
    ).toBe(false);

    expect(adminProfileUpdateSchema.safeParse({ displayName: "A" }).success).toBe(false);
    expect(adminProfileUpdateSchema.safeParse({ displayName: "Budi Admin" }).success).toBe(true);
  });
});
