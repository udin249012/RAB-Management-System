import type {
  AdminRole,
  AhspComponentType,
  MaterialCategoryGroup,
  ProjectStatus,
  RabItemMode,
  RabStatus,
  StorageProvider,
  WorkCategoryType,
} from "./enums.js";

export interface BaseAuditFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface AdminUser extends BaseAuditFields {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface Project extends BaseAuditFields {
  code: string;
  name: string;
  location: string;
  ownerName: string;
  picName: string;
  startDate: string;
  targetEndDate: string;
  description: string;
  status: ProjectStatus;
  coverImageFileId?: string;
  documentFileIds: string[];
}

export interface ProjectDetail extends Project {
  coverImage?: FileMetadata;
  documents: FileMetadata[];
}

export interface Unit extends BaseAuditFields {
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
}

export interface MaterialCategory extends BaseAuditFields {
  code: string;
  name: string;
  group: MaterialCategoryGroup;
  isActive: boolean;
}

export interface MaterialPriceHistoryEntry {
  previousPrice: number;
  newPrice: number;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface Material extends BaseAuditFields {
  code: string;
  name: string;
  categoryId: string;
  unitId: string;
  unitPrice: number;
  brand?: string;
  specification?: string;
  description?: string;
  supplier?: string;
  photoFileId?: string;
  isActive: boolean;
  priceHistory: MaterialPriceHistoryEntry[];
}

export interface WorkCategory extends BaseAuditFields {
  code: string;
  name: string;
  type: WorkCategoryType;
  isActive: boolean;
}

export interface WorkItem extends BaseAuditFields {
  code: string;
  name: string;
  categoryId: string;
  unitId: string;
  description?: string;
  basePrice?: number;
  ahspId?: string;
  isActive: boolean;
}

export interface AhspComponent extends BaseAuditFields {
  ahspId: string;
  componentType: AhspComponentType;
  referenceId: string;
  referenceCode: string;
  referenceName: string;
  unitId: string;
  unitSymbol: string;
  coefficient: number;
  unitPrice: number;
  subtotal: number;
}

export interface AhspRevisionEntry {
  version: number;
  previousUnitPriceTotal: number;
  newUnitPriceTotal: number;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface AhspAnalysis extends BaseAuditFields {
  code: string;
  workItemId: string;
  name: string;
  unitId: string;
  version: number;
  materialTotal: number;
  laborTotal: number;
  equipmentTotal: number;
  unitPriceTotal: number;
  sourceReference?: string;
  isActive: boolean;
  revisionHistory?: AhspRevisionEntry[];
}

export interface AhspDetail extends AhspAnalysis {
  components: AhspComponent[];
}

export interface AdditionalCostItem {
  id: string;
  name: string;
  amount: number;
  notes?: string;
}

export interface CompanySnapshot {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  currency: string;
}

export interface RabDocument extends BaseAuditFields {
  documentNumber: string;
  projectId: string;
  title: string;
  documentDate: string;
  version: number;
  parentRabId?: string;
  status: RabStatus;
  subtotal: number;
  overheadPercent: number;
  overheadAmount: number;
  profitPercent: number;
  profitAmount: number;
  taxPercent: number;
  taxAmount: number;
  additionalCosts: AdditionalCostItem[];
  additionalCostsTotal: number;
  grandTotal: number;
  notes?: string;
  companySnapshot?: CompanySnapshot;
  finalizedAt?: string;
}

export interface RabComponentSnapshot {
  componentType: AhspComponentType;
  referenceId: string;
  referenceName: string;
  unitSymbol: string;
  coefficient: number;
  unitPrice: number;
  subtotal: number;
}

export interface RabItem extends BaseAuditFields {
  rabId: string;
  sectionName: string;
  order: number;
  mode: RabItemMode;
  workItemId?: string;
  ahspId?: string;
  name: string;
  volume: number;
  unitSnapshot: string;
  unitPriceSnapshot: number;
  subtotal: number;
  ahspComponentsSnapshot?: RabComponentSnapshot[];
}

export interface RabResourceNeed {
  componentType: AhspComponentType;
  referenceId: string;
  referenceName: string;
  unitSymbol: string;
  totalQuantity: number;
  unitPrice: number;
  totalCost: number;
}

export interface RabDetail extends RabDocument {
  items: RabItem[];
  project?: Project;
  resourceSummary: RabResourceNeed[];
}

export interface BudgetRealization extends BaseAuditFields {
  projectId: string;
  rabDocumentId: string;
  category: string;
  transactionDate: string;
  description: string;
  amount: number;
  referenceNumber?: string;
  evidenceFileId?: string;
}

export interface CompanySettings extends BaseAuditFields {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logoFileId?: string;
  currency: string;
  projectCodeFormat: string;
  rabNumberFormat: string;
  defaultTaxPercent: number;
  defaultOverheadPercent: number;
  defaultProfitPercent: number;
}

export interface CompanySettingsDetail extends CompanySettings {
  logoUrl?: string;
}

export interface FileMetadata extends BaseAuditFields {
  storageProvider: StorageProvider;
  storagePath: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  entityType: string;
  entityId: string;
}

export interface ActivityLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ProjectBudgetComparison {
  projectId: string;
  projectCode: string;
  projectName: string;
  finalRabCount: number;
  plannedBudget: number;
  actualRealization: number;
  remainingBudget: number;
  absorptionPercent: number;
  isOverBudget: boolean;
}

export interface CategoryRealizationSummary {
  category: string;
  totalAmount: number;
}

export interface MonitoringSummaryResponse {
  totalPlannedBudget: number;
  totalActualRealization: number;
  totalRemainingBudget: number;
  overallAbsorptionPercent: number;
  projects: ProjectBudgetComparison[];
  categoryBreakdown: CategoryRealizationSummary[];
}

export interface MonthlyBudgetChartPoint {
  month: string;
  plannedBudget: number;
  actualRealization: number;
}

export interface ProjectStatusSummaryItem {
  status: ProjectStatus;
  count: number;
}

export interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRabDocuments: number;
  totalPlannedBudget: number;
  totalRealizedCost: number;
  remainingBudget: number;
  monthlyChart: MonthlyBudgetChartPoint[];
  projectStatusSummary: ProjectStatusSummaryItem[];
  recentRabs: RabDocument[];
  recentActivities: ActivityLog[];
}

export type ReportType =
  | "rab"
  | "projects"
  | "materials"
  | "work-items"
  | "ahsp"
  | "realizations"
  | "budget-comparison"
  | "rab-revisions";

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: "text" | "currency" | "number" | "percent" | "date";
}

export interface ReportSummaryTotal {
  label: string;
  value: string | number;
  format?: "text" | "currency" | "number" | "percent";
}

export interface ReportDataset {
  reportType: ReportType;
  title: string;
  documentNumber: string;
  generatedAt: string;
  companySnapshot: CompanySnapshot;
  filtersApplied: Record<string, string>;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number>>;
  summaryTotals: ReportSummaryTotal[];
}
