import { describe, expect, it } from "vitest";
import { formatCurrency, formatDateTime, formatNumber } from "./formatters";

describe("frontend formatters", () => {
  it("formats IDR currency and numbers cleanly", () => {
    expect(formatCurrency(1500000)).toContain("1.500.000");
    expect(formatNumber(0.125)).toBe("0,125");
  });

  it("handles missing or invalid date strings gracefully", () => {
    expect(formatDateTime(undefined)).toBe("-");
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });
});
