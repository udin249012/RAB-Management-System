export const FIRESTORE_COLLECTIONS = {
  ADMINS: "admins",
  PROJECTS: "projects",
  MATERIAL_CATEGORIES: "material_categories",
  MATERIALS: "materials",
  WORK_CATEGORIES: "work_categories",
  WORK_ITEMS: "work_items",
  UNITS: "units",
  REGIONAL_PRICES: "regional_prices",
  AHSP: "ahsp",
  AHSP_COMPONENTS: "ahsp_components",
  RAB_DOCUMENTS: "rab_documents",
  RAB_ITEMS: "rab_items",
  BUDGET_REALIZATIONS: "budget_realizations",
  COMPANY_SETTINGS: "company_settings",
  ACTIVITY_LOGS: "activity_logs",
  FILE_METADATA: "file_metadata",
} as const;

export type FirestoreCollectionName =
  (typeof FIRESTORE_COLLECTIONS)[keyof typeof FIRESTORE_COLLECTIONS];
