import type {
  AdditionalCostItem,
  RabComponentSnapshot,
  RabItem,
  RabResourceNeed,
} from "@rab/shared-types";
import { roundCurrency } from "../ahsp/ahsp.calculator.js";

export interface RabFinancialInput {
  itemSubtotals: number[];
  overheadPercent: number;
  profitPercent: number;
  taxPercent: number;
  additionalCosts: AdditionalCostItem[];
}

export interface RabFinancialSummary {
  subtotal: number;
  overheadAmount: number;
  profitAmount: number;
  additionalCostsTotal: number;
  taxAmount: number;
  grandTotal: number;
}

export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function calculateRabLineSubtotal(volume: number, unitPrice: number): number {
  return roundCurrency(volume * unitPrice);
}

export function calculateRabTotals(input: RabFinancialInput): RabFinancialSummary {
  const subtotal = roundCurrency(input.itemSubtotals.reduce((sum, val) => sum + val, 0));
  const overheadAmount = roundCurrency(subtotal * (input.overheadPercent / 100));
  const profitAmount = roundCurrency(subtotal * (input.profitPercent / 100));
  const additionalCostsTotal = roundCurrency(
    input.additionalCosts.reduce((sum, item) => sum + item.amount, 0),
  );

  const taxableBase = roundCurrency(
    subtotal + overheadAmount + profitAmount + additionalCostsTotal,
  );
  const taxAmount = roundCurrency(taxableBase * (input.taxPercent / 100));
  const grandTotal = roundCurrency(taxableBase + taxAmount);

  return {
    subtotal,
    overheadAmount,
    profitAmount,
    additionalCostsTotal,
    taxAmount,
    grandTotal,
  };
}

export function aggregateRabResourceNeeds(
  items: Array<Pick<RabItem, "volume" | "ahspComponentsSnapshot">>,
): RabResourceNeed[] {
  const grouped = new Map<string, RabResourceNeed>();

  for (const item of items) {
    const components: RabComponentSnapshot[] = item.ahspComponentsSnapshot ?? [];
    for (const comp of components) {
      const key = `${comp.componentType}:${comp.referenceId}`;
      const qty = roundQuantity(item.volume * comp.coefficient);
      const cost = roundCurrency(qty * comp.unitPrice);

      const existing = grouped.get(key);
      if (existing) {
        existing.totalQuantity = roundQuantity(existing.totalQuantity + qty);
        existing.totalCost = roundCurrency(existing.totalCost + cost);
      } else {
        grouped.set(key, {
          componentType: comp.componentType,
          referenceId: comp.referenceId,
          referenceName: comp.referenceName,
          unitSymbol: comp.unitSymbol,
          totalQuantity: qty,
          unitPrice: comp.unitPrice,
          totalCost: cost,
        });
      }
    }
  }

  return Array.from(grouped.values());
}
