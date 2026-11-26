import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectStatus, RabStatus } from "@rab/shared-types";

vi.mock("@/services/api/monitoringApi", () => ({
  monitoringApi: {
    getDashboard: vi.fn(async () => ({
      totalProjects: 3,
      activeProjects: 2,
      completedProjects: 1,
      totalRabDocuments: 4,
      totalPlannedBudget: 250000000,
      totalRealizedCost: 100000000,
      remainingBudget: 150000000,
      monthlyChart: [],
      projectStatusSummary: [
        { status: ProjectStatus.IN_PROGRESS, count: 2 },
        { status: ProjectStatus.COMPLETED, count: 1 },
      ],
      recentRabs: [
        {
          id: "rab-1",
          documentNumber: "RAB/2026/04/0001",
          projectId: "prj-1",
          title: "RAB Proyek A",
          documentDate: "2026-04-01",
          version: 1,
          status: RabStatus.FINAL,
          subtotal: 200000000,
          overheadPercent: 10,
          overheadAmount: 20000000,
          profitPercent: 5,
          profitAmount: 10000000,
          taxPercent: 11,
          taxAmount: 20000000,
          additionalCosts: [],
          additionalCostsTotal: 0,
          grandTotal: 250000000,
          createdAt: "2026-04-01T00:00:00.000Z",
          updatedAt: "2026-04-01T00:00:00.000Z",
          createdBy: "admin",
          updatedBy: "admin",
        },
      ],
      recentActivities: [
        {
          id: "log-1",
          actorUid: "admin-1",
          actorEmail: "admin@company.co.id",
          action: "RAB_FINALIZED",
          entityType: "rab_documents",
          entityId: "rab-1",
          summary: "Memfinalisasi dokumen RAB/2026/04/0001",
          createdAt: "2026-04-01T01:00:00.000Z",
        },
      ],
    })),
  },
}));

import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  it("renders aggregated database metrics, recent RAB, and recent activity logs", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Aktif: 2 • Selesai: 1")).toBeInTheDocument();
      expect(screen.getByText("RAB/2026/04/0001 — RAB Proyek A")).toBeInTheDocument();
      expect(screen.getByText("Memfinalisasi dokumen RAB/2026/04/0001")).toBeInTheDocument();
    });
  });
});
