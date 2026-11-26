import { describe, expect, it } from "vitest";
import { AhspComponentType } from "@rab/shared-types";
import {
  aggregateRabResourceNeeds,
  calculateRabLineSubtotal,
  calculateRabTotals,
} from "../src/modules/rab/rab.calculator.js";

describe("RAB Calculator", () => {
  it("calculates line subtotal = volume * unitPrice", () => {
    expect(calculateRabLineSubtotal(12.5, 800000)).toBe(10000000);
    expect(calculateRabLineSubtotal(3.33, 100000)).toBe(333000);
  });

  it("calculates overhead, profit, additional costs, tax, and grand total accurately", () => {
    const totals = calculateRabTotals({
      itemSubtotals: [10000000, 5000000],
      overheadPercent: 10,
      profitPercent: 5,
      taxPercent: 11,
      additionalCosts: [{ id: "1", name: "Mobilisasi", amount: 1000000 }],
    });

    // subtotal = 15,000,000
    // overhead (10%) = 1,500,000
    // profit (5%) = 750,000
    // additional = 1,000,000
    // taxableBase = 18,250,000
    // tax (11%) = 2,007,500
    // grandTotal = 20,257,500
    expect(totals.subtotal).toBe(15000000);
    expect(totals.overheadAmount).toBe(1500000);
    expect(totals.profitAmount).toBe(750000);
    expect(totals.additionalCostsTotal).toBe(1000000);
    expect(totals.taxAmount).toBe(2007500);
    expect(totals.grandTotal).toBe(20257500);
  });

  it("aggregates material, labor, and equipment needs across AHSP items", () => {
    const summary = aggregateRabResourceNeeds([
      {
        volume: 10,
        ahspComponentsSnapshot: [
          {
            componentType: AhspComponentType.MATERIAL,
            referenceId: "mat-semen",
            referenceName: "Semen 50kg",
            unitSymbol: "sak",
            coefficient: 7,
            unitPrice: 70000,
            subtotal: 490000,
          },
          {
            componentType: AhspComponentType.LABOR,
            referenceId: "tk-1",
            referenceName: "Tukang",
            unitSymbol: "OH",
            coefficient: 0.5,
            unitPrice: 150000,
            subtotal: 75000,
          },
        ],
      },
      {
        volume: 5,
        ahspComponentsSnapshot: [
          {
            componentType: AhspComponentType.MATERIAL,
            referenceId: "mat-semen",
            referenceName: "Semen 50kg",
            unitSymbol: "sak",
            coefficient: 4,
            unitPrice: 70000,
            subtotal: 280000,
          },
        ],
      },
    ]);

    expect(summary).toHaveLength(2);
    const semen = summary.find((s) => s.referenceId === "mat-semen");
    expect(semen?.totalQuantity).toBe(90); // 10*7 + 5*4 = 90
    expect(semen?.totalCost).toBe(6300000);
  });
});
