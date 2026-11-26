import { MaterialCategoryGroup, WorkCategoryType } from "@rab/shared-types";

export const MATERIAL_GROUP_LABELS: Record<MaterialCategoryGroup, string> = {
  [MaterialCategoryGroup.MATERIAL]: "Material Konstruksi",
  [MaterialCategoryGroup.EQUIPMENT]: "Peralatan",
  [MaterialCategoryGroup.SUPPLIES]: "Perlengkapan",
  [MaterialCategoryGroup.SUPPORTING]: "Bahan Pendukung",
};

export const WORK_TYPE_LABELS: Record<WorkCategoryType, string> = {
  [WorkCategoryType.CONSTRUCTION]: "Pekerjaan Konstruksi",
  [WorkCategoryType.INSTALLATION]: "Pekerjaan Instalasi",
  [WorkCategoryType.TECHNICAL_SERVICE]: "Jasa Teknis",
  [WorkCategoryType.LABOR]: "Tenaga Kerja",
  [WorkCategoryType.MAINTENANCE]: "Pekerjaan Pemeliharaan",
  [WorkCategoryType.OTHER]: "Pekerjaan Lainnya",
};
