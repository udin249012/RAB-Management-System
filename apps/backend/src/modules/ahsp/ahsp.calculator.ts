import { AhspComponentType } from "@rab/shared-types";

export interface AhspComponentCalculationInput {
  componentType: AhspComponentType;
  coefficient: number;
  unitPrice: number;
}

export interface AhspTotalsResult {
  materialTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  unitPriceTotal: number;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAhspComponentSubtotal(coefficient: number, unitPrice: number): number {
  return roundCurrency(coefficient * unitPrice);
}

export function calculateAhspTotals(components: AhspComponentCalculationInput[]): AhspTotalsResult {
  let materialTotal = 0;
  let laborTotal = 0;
  let equipmentTotal = 0;

  for (const item of components) {
    const subtotal = calculateAhspComponentSubtotal(item.coefficient, item.unitPrice);
    if (item.componentType === AhspComponentType.MATERIAL) {
      materialTotal += subtotal;
    } else if (item.componentType === AhspComponentType.LABOR) {
      laborTotal += subtotal;
    } else if (item.componentType === AhspComponentType.EQUIPMENT) {
      equipmentTotal += subtotal;
    }
  }

  const roundedMaterial = roundCurrency(materialTotal);
  const roundedLabor = roundCurrency(laborTotal);
  const roundedEquipment = roundCurrency(equipmentTotal);
  const unitPriceTotal = roundCurrency(roundedMaterial + roundedLabor + roundedEquipment);

  return {
    materialTotal: roundedMaterial,
    laborTotal: roundedLabor,
    equipmentTotal: roundedEquipment,
    unitPriceTotal,
  };
}
