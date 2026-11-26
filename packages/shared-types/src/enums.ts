export enum ProjectStatus {
  PLANNING = "PLANNING",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum RabStatus {
  DRAFT = "DRAFT",
  REVIEW = "REVIEW",
  FINAL = "FINAL",
  REVISION = "REVISION",
  ARCHIVED = "ARCHIVED",
}

export enum RabItemMode {
  MANUAL = "MANUAL",
  AHSP = "AHSP",
}

export enum MaterialCategoryGroup {
  MATERIAL = "MATERIAL",
  EQUIPMENT = "EQUIPMENT",
  SUPPLIES = "SUPPLIES",
  SUPPORTING = "SUPPORTING",
}

export enum WorkCategoryType {
  CONSTRUCTION = "CONSTRUCTION",
  INSTALLATION = "INSTALLATION",
  TECHNICAL_SERVICE = "TECHNICAL_SERVICE",
  LABOR = "LABOR",
  MAINTENANCE = "MAINTENANCE",
  OTHER = "OTHER",
}

export enum AhspComponentType {
  MATERIAL = "MATERIAL",
  LABOR = "LABOR",
  EQUIPMENT = "EQUIPMENT",
}

export enum StorageProvider {
  FIREBASE_STORAGE = "FIREBASE_STORAGE",
  VERCEL_BLOB = "VERCEL_BLOB",
}

export enum AdminRole {
  ADMIN = "ADMIN",
}
