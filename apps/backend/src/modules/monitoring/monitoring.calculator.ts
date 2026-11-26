import {
  ProjectStatus,
  RabStatus,
  type ActivityLog,
  type BudgetRealization,
  type CategoryRealizationSummary,
  type DashboardSummary,
  type MonitoringSummaryResponse,
  type MonthlyBudgetChartPoint,
  type Project,
  type ProjectBudgetComparison,
  type ProjectStatusSummaryItem,
  type RabDocument,
} from "@rab/shared-types";
import { roundCurrency } from "../ahsp/ahsp.calculator.js";

function computeAbsorptionPercent(planned: number, actual: number): number {
  if (planned <= 0) return 0;
  return roundCurrency((actual / planned) * 100);
}

export function buildMonitoringSummary(
  projects: Project[],
  rabDocuments: RabDocument[],
  realizations: BudgetRealization[],
  filterProjectId?: string,
): MonitoringSummaryResponse {
  const targetProjects = filterProjectId
    ? projects.filter((p) => p.id === filterProjectId)
    : projects;

  const finalRabs = rabDocuments.filter((r) => r.status === RabStatus.FINAL);
  const filteredRealizations = filterProjectId
    ? realizations.filter((r) => r.projectId === filterProjectId)
    : realizations;

  const comparisons: ProjectBudgetComparison[] = targetProjects
    .map((project) => {
      const projectFinalRabs = finalRabs.filter((r) => r.projectId === project.id);
      const projectRealizations = filteredRealizations.filter((r) => r.projectId === project.id);

      const plannedBudget = roundCurrency(
        projectFinalRabs.reduce((sum, r) => sum + r.grandTotal, 0),
      );
      const actualRealization = roundCurrency(
        projectRealizations.reduce((sum, r) => sum + r.amount, 0),
      );
      const remainingBudget = roundCurrency(plannedBudget - actualRealization);

      return {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        finalRabCount: projectFinalRabs.length,
        plannedBudget,
        actualRealization,
        remainingBudget,
        absorptionPercent: computeAbsorptionPercent(plannedBudget, actualRealization),
        isOverBudget: actualRealization > plannedBudget,
      };
    })
    .filter((item) => item.finalRabCount > 0 || item.actualRealization > 0);

  const categoryTotals = new Map<string, number>();
  for (const r of filteredRealizations) {
    const key = r.category.trim() || "Lainnya";
    categoryTotals.set(key, roundCurrency((categoryTotals.get(key) ?? 0) + r.amount));
  }

  const categoryBreakdown: CategoryRealizationSummary[] = Array.from(categoryTotals.entries())
    .map(([category, totalAmount]) => ({ category, totalAmount }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totalPlannedBudget = roundCurrency(
    comparisons.reduce((sum, c) => sum + c.plannedBudget, 0),
  );
  const totalActualRealization = roundCurrency(
    comparisons.reduce((sum, c) => sum + c.actualRealization, 0),
  );
  const totalRemainingBudget = roundCurrency(totalPlannedBudget - totalActualRealization);

  return {
    totalPlannedBudget,
    totalActualRealization,
    totalRemainingBudget,
    overallAbsorptionPercent: computeAbsorptionPercent(totalPlannedBudget, totalActualRealization),
    projects: comparisons,
    categoryBreakdown,
  };
}

export function buildDashboardSummary(
  projects: Project[],
  rabDocuments: RabDocument[],
  realizations: BudgetRealization[],
  activityLogs: ActivityLog[],
): DashboardSummary {
  const finalRabs = rabDocuments.filter((r) => r.status === RabStatus.FINAL);
  const totalPlannedBudget = roundCurrency(finalRabs.reduce((sum, r) => sum + r.grandTotal, 0));
  const totalRealizedCost = roundCurrency(realizations.reduce((sum, r) => sum + r.amount, 0));
  const remainingBudget = roundCurrency(totalPlannedBudget - totalRealizedCost);

  const activeProjects = projects.filter((p) => p.status === ProjectStatus.IN_PROGRESS).length;
  const completedProjects = projects.filter((p) => p.status === ProjectStatus.COMPLETED).length;

  const statusOrder: ProjectStatus[] = [
    ProjectStatus.PLANNING,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED,
  ];
  const projectStatusSummary: ProjectStatusSummaryItem[] = statusOrder.map((status) => ({
    status,
    count: projects.filter((p) => p.status === status).length,
  }));

  const monthMap = new Map<string, MonthlyBudgetChartPoint>();
  for (const rab of finalRabs) {
    const month = rab.documentDate.slice(0, 7);
    if (!month) continue;
    const entry = monthMap.get(month) ?? { month, plannedBudget: 0, actualRealization: 0 };
    entry.plannedBudget = roundCurrency(entry.plannedBudget + rab.grandTotal);
    monthMap.set(month, entry);
  }
  for (const real of realizations) {
    const month = real.transactionDate.slice(0, 7);
    if (!month) continue;
    const entry = monthMap.get(month) ?? { month, plannedBudget: 0, actualRealization: 0 };
    entry.actualRealization = roundCurrency(entry.actualRealization + real.amount);
    monthMap.set(month, entry);
  }

  const monthlyChart = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  const recentRabs = [...rabDocuments]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  const recentActivities = [...activityLogs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    totalProjects: projects.length,
    activeProjects,
    completedProjects,
    totalRabDocuments: rabDocuments.length,
    totalPlannedBudget,
    totalRealizedCost,
    remainingBudget,
    monthlyChart,
    projectStatusSummary,
    recentRabs,
    recentActivities,
  };
}
