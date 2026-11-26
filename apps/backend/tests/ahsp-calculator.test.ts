import { describe, expect, it } from "vitest";
import { AhspComponentType } from "@rab/shared-types";
import {
  calculateAhspComponentSubtotal,
  calculateAhspTotals,
  roundCurrency,
} from "../src/modules/ahsp/ahsp.calculator.js";

describe("AHSP Calculator", () => {
  it("calculates component subtotal as coefficient * unitPrice with clean rounding", () => {
    expect(calculateAhspComponentSubtotal(0.35, 70000)).toBe(24500);
    expect(calculateAhspComponentSubtotal(0.1234, 150000)).toBe(18510);
    expect(roundCurrency(10.005)).toBe(10.01);
  });

  it("sums material, labor, and equipment totals into unitPriceTotal", () => {
    const totals = calculateAhspTotals([
      { componentType: AhspComponentType.MATERIAL, coefficient: 2, unitPrice: 70000 },
      { componentType: AhspComponentType.MATERIAL, coefficient: 0.5, unitPrice: 200000 },
      { componentType: AhspComponentType.LABOR, coefficient: 1.5, unitPrice: 120000 },
      { componentType: AhspComponentType.EQUIPMENT, coefficient: 0.25, unitPrice: 400000 },
    ]);

    expect(totals.materialTotal).toBe(240000);
    expect(totals.laborTotal).toBe(180000);
    expect(totals.equipmentTotal).toBe(100000);
    expect(totals.unitPriceTotal).toBe(520000);
  });
});
