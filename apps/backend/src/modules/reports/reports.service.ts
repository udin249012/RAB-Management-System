import type {
  AdminUser,
  CompanySettings,
  CompanySnapshot,
  ReportDataset,
  ReportType,
} from "@rab/shared-types";
import type { ReportQuery } from "@rab/shared-validation";
import { FIRESTORE_COLLECTIONS } from "../../config/collections.js";
import { getFirestoreDb } from "../../config/firebase.js";
import { isVercelBlobConfigured, VERCEL_BLOB_PREFIXES } from "../../config/storage.js";
import { activityLogService } from "../../services/activityLog.service.js";
import { roundCurrency } from "../ahsp/ahsp.calculator.js";
import { ahspRepository } from "../ahsp/ahsp.repository.js";
import {
  materialCategoryRepository,
  materialRepository,
  unitRepository,
  workCategoryRepository,
  workItemRepository,
} from "../catalog/catalog.repository.js";
import { filesService } from "../files/files.service.js";
import { buildMonitoringSummary } from "../monitoring/monitoring.calculator.js";
import { budgetRealizationRepository } from "../monitoring/monitoring.repository.js";
import { projectRepository } from "../projects/projects.repository.js";
import { rabDocumentRepository } from "../rab/rab.repository.js";
import { rabService } from "../rab/rab.service.js";
import {
  generateReportExcelBuffer,
  generateReportPdfBuffer,
  generateSingleRabExcelBuffer,
  generateSingleRabPdfBuffer,
} from "./reports.exporters.js";

export class ReportsService {
  private async getCompanySnapshot(): Promise<CompanySnapshot> {
    const snap = await getFirestoreDb()
      .collection(FIRESTORE_COLLECTIONS.COMPANY_SETTINGS)
      .doc("default")
      .get();

    if (!snap.exists) {
      return {
        companyName: "PT Perusahaan Konstruksi Indonesia",
        address: "-",
        phone: "-",
        email: "-",
        currency: "IDR",
      };
    }

    const s = snap.data() as CompanySettings;
    return {
      companyName: s.companyName,
      address: s.address,
      phone: s.phone,
      email: s.email,
      currency: s.currency || "IDR",
    };
  }

  private buildFiltersSummary(query: ReportQuery): Record<string, string> {
    const out: Record<string, string> = {};
    if (query.startDate) out["Mulai"] = query.startDate;
    if (query.endDate) out["Sampai"] = query.endDate;
    if (query.projectId) out["Proyek ID"] = query.projectId;
    if (query.status) out["Status"] = query.status;
    if (query.search) out["Pencarian"] = query.search;
    return out;
  }

  async buildReportDataset(type: ReportType, query: ReportQuery): Promise<ReportDataset> {
    const companySnapshot = await this.getCompanySnapshot();
    const now = new Date().toISOString();
    const docNum = `RPT-${type.toUpperCase()}-${now.slice(0, 10).replace(/-/g, "")}`;
    const filtersApplied = this.buildFiltersSummary(query);
    const searchLower = query.search?.toLowerCase();

    switch (type) {
      case "rab": {
        const [rabs, projects] = await Promise.all([
          rabDocumentRepository.findAll(),
          projectRepository.findAll(),
        ]);
        const projectMap = new Map(projects.map((p) => [p.id, p]));
        const filtered = rabs.filter((r) => {
          if (query.projectId && r.projectId !== query.projectId) return false;
          if (query.status && r.status !== query.status) return false;
          if (query.startDate && r.documentDate < query.startDate) return false;
          if (query.endDate && r.documentDate > query.endDate) return false;
          if (searchLower) {
            const hay = `${r.documentNumber} ${r.title}`.toLowerCase();
            if (!hay.includes(searchLower)) return false;
          }
          return true;
        });

        const totalGrand = roundCurrency(filtered.reduce((s, r) => s + r.grandTotal, 0));
        return {
          reportType: type,
          title: "Laporan Dokumen RAB",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "documentNumber", label: "No. Dokumen", format: "text" },
            { key: "title", label: "Judul RAB", format: "text" },
            { key: "projectName", label: "Proyek", format: "text" },
            { key: "documentDate", label: "Tanggal", format: "date" },
            { key: "version", label: "Versi", align: "center", format: "number" },
            { key: "status", label: "Status", format: "text" },
            { key: "grandTotal", label: "Grand Total", align: "right", format: "currency" },
          ],
          rows: filtered.map((r) => ({
            documentNumber: r.documentNumber,
            title: r.title,
            projectName: projectMap.get(r.projectId)?.name ?? r.projectId,
            documentDate: r.documentDate,
            version: r.version,
            status: r.status,
            grandTotal: r.grandTotal,
          })),
          summaryTotals: [
            { label: "Jumlah Dokumen RAB", value: filtered.length, format: "number" },
            { label: "Akumulasi Nilai RAB", value: totalGrand, format: "currency" },
          ],
        };
      }

      case "projects": {
        const projects = await projectRepository.findAll();
        const filtered = projects.filter((p) => {
          if (query.projectId && p.id !== query.projectId) return false;
          if (query.status && p.status !== query.status) return false;
          if (query.startDate && p.startDate < query.startDate) return false;
          if (query.endDate && p.startDate > query.endDate) return false;
          if (searchLower) {
            const hay =
              `${p.code} ${p.name} ${p.location} ${p.ownerName} ${p.picName}`.toLowerCase();
            if (!hay.includes(searchLower)) return false;
          }
          return true;
        });

        return {
          reportType: type,
          title: "Laporan Data Proyek",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "code", label: "Kode Proyek", format: "text" },
            { key: "name", label: "Nama Proyek", format: "text" },
            { key: "location", label: "Lokasi", format: "text" },
            { key: "ownerName", label: "Pemilik", format: "text" },
            { key: "picName", label: "PIC", format: "text" },
            { key: "startDate", label: "Mulai", format: "date" },
            { key: "targetEndDate", label: "Target Selesai", format: "date" },
            { key: "status", label: "Status", format: "text" },
          ],
          rows: filtered.map((p) => ({
            code: p.code,
            name: p.name,
            location: p.location,
            ownerName: p.ownerName,
            picName: p.picName,
            startDate: p.startDate,
            targetEndDate: p.targetEndDate,
            status: p.status,
          })),
          summaryTotals: [{ label: "Total Proyek", value: filtered.length, format: "number" }],
        };
      }

      case "materials": {
        const [materials, categories, units] = await Promise.all([
          materialRepository.findAll(),
          materialCategoryRepository.findAll(),
          unitRepository.findAll(),
        ]);
        const catMap = new Map(categories.map((c) => [c.id, c.name]));
        const unitMap = new Map(units.map((u) => [u.id, u.symbol]));

        const filtered = materials.filter((m) => {
          if (query.status === "ACTIVE" && !m.isActive) return false;
          if (query.status === "INACTIVE" && m.isActive) return false;
          if (searchLower) {
            const hay = `${m.code} ${m.name} ${m.brand ?? ""} ${m.supplier ?? ""}`.toLowerCase();
            if (!hay.includes(searchLower)) return false;
          }
          return true;
        });

        return {
          reportType: type,
          title: "Laporan Katalog Material & Peralatan",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "code", label: "Kode", format: "text" },
            { key: "name", label: "Nama Item", format: "text" },
            { key: "category", label: "Kategori", format: "text" },
            { key: "unit", label: "Satuan", format: "text" },
            { key: "unitPrice", label: "Harga Satuan", align: "right", format: "currency" },
            { key: "supplier", label: "Supplier", format: "text" },
            { key: "status", label: "Status", format: "text" },
          ],
          rows: filtered.map((m) => ({
            code: m.code,
            name: m.name,
            category: catMap.get(m.categoryId) ?? "-",
            unit: unitMap.get(m.unitId) ?? "-",
            unitPrice: m.unitPrice,
            supplier: m.supplier ?? "-",
            status: m.isActive ? "Aktif" : "Nonaktif",
          })),
          summaryTotals: [
            { label: "Total Item Katalog", value: filtered.length, format: "number" },
          ],
        };
      }

      case "work-items": {
        const [workItems, categories, units] = await Promise.all([
          workItemRepository.findAll(),
          workCategoryRepository.findAll(),
          unitRepository.findAll(),
        ]);
        const catMap = new Map(categories.map((c) => [c.id, c.name]));
        const unitMap = new Map(units.map((u) => [u.id, u.symbol]));

        const filtered = workItems.filter((w) => {
          if (query.status === "ACTIVE" && !w.isActive) return false;
          if (query.status === "INACTIVE" && w.isActive) return false;
          if (searchLower) {
            const hay = `${w.code} ${w.name}`.toLowerCase();
            if (!hay.includes(searchLower)) return false;
          }
          return true;
        });

        return {
          reportType: type,
          title: "Laporan Katalog Pekerjaan & Jasa",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "code", label: "Kode", format: "text" },
            { key: "name", label: "Nama Pekerjaan", format: "text" },
            { key: "category", label: "Kategori", format: "text" },
            { key: "unit", label: "Satuan", format: "text" },
            { key: "basePrice", label: "Harga Dasar", align: "right", format: "currency" },
            { key: "status", label: "Status", format: "text" },
          ],
          rows: filtered.map((w) => ({
            code: w.code,
            name: w.name,
            category: catMap.get(w.categoryId) ?? "-",
            unit: unitMap.get(w.unitId) ?? "-",
            basePrice: w.basePrice ?? 0,
            status: w.isActive ? "Aktif" : "Nonaktif",
          })),
          summaryTotals: [
            { label: "Total Item Pekerjaan", value: filtered.length, format: "number" },
          ],
        };
      }

      case "ahsp": {
        const [ahspList, units] = await Promise.all([
          ahspRepository.findAll(),
          unitRepository.findAll(),
        ]);
        const unitMap = new Map(units.map((u) => [u.id, u.symbol]));

        const filtered = ahspList.filter((a) => {
          if (query.status === "ACTIVE" && !a.isActive) return false;
          if (query.status === "INACTIVE" && a.isActive) return false;
          if (searchLower) {
            const hay = `${a.code} ${a.name} ${a.sourceReference ?? ""}`.toLowerCase();
            if (!hay.includes(searchLower)) return false;
          }
          return true;
        });

        return {
          reportType: type,
          title: "Laporan Analisis Harga Satuan Pekerjaan (AHSP)",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "code", label: "Kode AHSP", format: "text" },
            { key: "name", label: "Nama Pekerjaan", format: "text" },
            { key: "unit", label: "Satuan", format: "text" },
            { key: "materialTotal", label: "Material", align: "right", format: "currency" },
            { key: "laborTotal", label: "Tenaga Kerja", align: "right", format: "currency" },
            { key: "equipmentTotal", label: "Peralatan", align: "right", format: "currency" },
            { key: "unitPriceTotal", label: "Harga Satuan", align: "right", format: "currency" },
          ],
          rows: filtered.map((a) => ({
            code: a.code,
            name: a.name,
            unit: unitMap.get(a.unitId) ?? "-",
            materialTotal: a.materialTotal,
            laborTotal: a.laborTotal,
            equipmentTotal: a.equipmentTotal,
            unitPriceTotal: a.unitPriceTotal,
          })),
          summaryTotals: [
            { label: "Total Analisis AHSP", value: filtered.length, format: "number" },
          ],
        };
      }

      case "realizations": {
        const [realizations, projects] = await Promise.all([
          budgetRealizationRepository.findAll(),
          projectRepository.findAll(),
        ]);
        const projectMap = new Map(projects.map((p) => [p.id, p]));

        const filtered = realizations.filter((r) => {
          if (query.projectId && r.projectId !== query.projectId) return false;
          if (query.startDate && r.transactionDate < query.startDate) return false;
          if (query.endDate && r.transactionDate > query.endDate) return false;
          if (searchLower) {
            const hay = `${r.category} ${r.description} ${r.referenceNumber ?? ""}`.toLowerCase();
            if (!hay.includes(searchLower)) return false;
          }
          return true;
        });

        const totalAmount = roundCurrency(filtered.reduce((s, r) => s + r.amount, 0));
        return {
          reportType: type,
          title: "Laporan Realisasi Biaya Proyek",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "transactionDate", label: "Tanggal", format: "date" },
            { key: "projectName", label: "Proyek", format: "text" },
            { key: "category", label: "Kategori", format: "text" },
            { key: "description", label: "Keterangan", format: "text" },
            { key: "referenceNumber", label: "No. Referensi", format: "text" },
            { key: "amount", label: "Nominal", align: "right", format: "currency" },
          ],
          rows: filtered.map((r) => ({
            transactionDate: r.transactionDate,
            projectName: projectMap.get(r.projectId)?.name ?? r.projectId,
            category: r.category,
            description: r.description,
            referenceNumber: r.referenceNumber ?? "-",
            amount: r.amount,
          })),
          summaryTotals: [
            { label: "Total Transaksi", value: filtered.length, format: "number" },
            { label: "Total Realisasi", value: totalAmount, format: "currency" },
          ],
        };
      }

      case "budget-comparison": {
        const [projects, rabs, realizations] = await Promise.all([
          projectRepository.findAll(),
          rabDocumentRepository.findAll(),
          budgetRealizationRepository.findAll(),
        ]);
        const summary = buildMonitoringSummary(projects, rabs, realizations, query.projectId);

        return {
          reportType: type,
          title: "Laporan Perbandingan Anggaran & Realisasi",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "projectCode", label: "Kode Proyek", format: "text" },
            { key: "projectName", label: "Nama Proyek", format: "text" },
            {
              key: "plannedBudget",
              label: "Anggaran RAB Final",
              align: "right",
              format: "currency",
            },
            {
              key: "actualRealization",
              label: "Realisasi Aktual",
              align: "right",
              format: "currency",
            },
            { key: "remainingBudget", label: "Sisa Anggaran", align: "right", format: "currency" },
            { key: "absorptionPercent", label: "Serapan", align: "right", format: "percent" },
          ],
          rows: summary.projects.map((p) => ({
            projectCode: p.projectCode,
            projectName: p.projectName,
            plannedBudget: p.plannedBudget,
            actualRealization: p.actualRealization,
            remainingBudget: p.remainingBudget,
            absorptionPercent: p.absorptionPercent,
          })),
          summaryTotals: [
            {
              label: "Total Anggaran RAB Final",
              value: summary.totalPlannedBudget,
              format: "currency",
            },
            {
              label: "Total Realisasi Aktual",
              value: summary.totalActualRealization,
              format: "currency",
            },
            {
              label: "Total Sisa Anggaran",
              value: summary.totalRemainingBudget,
              format: "currency",
            },
            {
              label: "Serapan Keseluruhan",
              value: summary.overallAbsorptionPercent,
              format: "percent",
            },
          ],
        };
      }

      case "rab-revisions": {
        const [rabs, projects] = await Promise.all([
          rabDocumentRepository.findAll(),
          projectRepository.findAll(),
        ]);
        const projectMap = new Map(projects.map((p) => [p.id, p]));
        const sorted = [...rabs]
          .filter((r) => {
            if (query.projectId && r.projectId !== query.projectId) return false;
            if (query.status && r.status !== query.status) return false;
            if (query.startDate && r.documentDate < query.startDate) return false;
            if (query.endDate && r.documentDate > query.endDate) return false;
            if (searchLower) {
              const hay = `${r.documentNumber} ${r.title}`.toLowerCase();
              if (!hay.includes(searchLower)) return false;
            }
            return true;
          })
          .sort((a, b) => a.projectId.localeCompare(b.projectId) || b.version - a.version);

        return {
          reportType: type,
          title: "Laporan Riwayat Revisi Dokumen RAB",
          documentNumber: docNum,
          generatedAt: now,
          companySnapshot,
          filtersApplied,
          columns: [
            { key: "projectName", label: "Proyek", format: "text" },
            { key: "documentNumber", label: "No. Dokumen", format: "text" },
            { key: "version", label: "Versi", align: "center", format: "number" },
            { key: "documentDate", label: "Tanggal", format: "date" },
            { key: "status", label: "Status", format: "text" },
            { key: "grandTotal", label: "Grand Total", align: "right", format: "currency" },
          ],
          rows: sorted.map((r) => ({
            projectName: projectMap.get(r.projectId)?.name ?? r.projectId,
            documentNumber: r.documentNumber,
            version: r.version,
            documentDate: r.documentDate,
            status: r.status,
            grandTotal: r.grandTotal,
          })),
          summaryTotals: [{ label: "Total Versi Dokumen", value: sorted.length, format: "number" }],
        };
      }
    }
  }

  async exportReport(
    type: ReportType,
    query: ReportQuery,
    format: "pdf" | "excel",
    actor: AdminUser,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const dataset = await this.buildReportDataset(type, query);
    const buffer =
      format === "pdf"
        ? await generateReportPdfBuffer(dataset)
        : await generateReportExcelBuffer(dataset);

    const filename = `laporan-${type}.${format === "pdf" ? "pdf" : "xlsx"}`;
    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (isVercelBlobConfigured()) {
      await filesService.archiveBufferToVercelBlob({
        buffer,
        pathname: `${VERCEL_BLOB_PREFIXES.REPORTS}/${filename}`,
        contentType,
        originalName: filename,
        entityType: "reports",
        entityId: type,
        actor,
      });
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "REPORT_EXPORTED",
      entityType: "reports",
      entityId: type,
      summary: `Mengekspor ${dataset.title} dalam format ${format.toUpperCase()}`,
    });

    return {
      buffer,
      filename,
      contentType,
    };
  }

  async exportSingleRab(
    rabId: string,
    format: "pdf" | "excel",
    actor: AdminUser,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const detail = await rabService.getRabDetail(rabId);
    const buffer =
      format === "pdf"
        ? await generateSingleRabPdfBuffer(detail)
        : await generateSingleRabExcelBuffer(detail);

    const safeNumber = detail.documentNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeNumber}.${format === "pdf" ? "pdf" : "xlsx"}`;
    const contentType =
      format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (isVercelBlobConfigured()) {
      await filesService.archiveBufferToVercelBlob({
        buffer,
        pathname: `${VERCEL_BLOB_PREFIXES.RAB_EXPORTS}/${filename}`,
        contentType,
        originalName: filename,
        entityType: "rab_documents",
        entityId: rabId,
        actor,
      });
    }

    await activityLogService.record({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: "RAB_EXPORTED",
      entityType: "rab_documents",
      entityId: rabId,
      summary: `Mengekspor dokumen RAB ${detail.documentNumber} (${format.toUpperCase()})`,
    });

    return {
      buffer,
      filename,
      contentType,
    };
  }
}

export const reportsService = new ReportsService();
