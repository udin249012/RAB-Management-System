import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import type { Project, ReportDataset, ReportType } from "@rab/shared-types";
import { projectsApi } from "@/services/api/projectsApi";
import { reportsApi } from "@/services/api/reportsApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const REPORT_TYPES: Array<{ type: ReportType; label: string }> = [
  { type: "rab", label: "Laporan RAB" },
  { type: "projects", label: "Laporan Proyek" },
  { type: "materials", label: "Laporan Material" },
  { type: "work-items", label: "Laporan Pekerjaan" },
  { type: "ahsp", label: "Laporan AHSP" },
  { type: "realizations", label: "Laporan Realisasi" },
  { type: "budget-comparison", label: "Perbandingan Anggaran" },
  { type: "rab-revisions", label: "Riwayat Revisi RAB" },
];

export function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>("rab");
  const [projects, setProjects] = useState<Project[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [dataset, setDataset] = useState<ReportDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void projectsApi
      .list({ page: 1, limit: 100 })
      .then((res) => setProjects(res.items))
      .catch(() => {});
  }, []);

  const currentFilters = useCallback(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      projectId: projectId || undefined,
      status: status || undefined,
      search: search.trim() || undefined,
    }),
    [startDate, endDate, projectId, status, search],
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.fetchReport(selectedType, currentFilters());
      setDataset(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat laporan"));
    } finally {
      setLoading(false);
    }
  }, [selectedType, currentFilters]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = async (format: "pdf" | "excel") => {
    setExporting(format);
    try {
      const blob = await reportsApi.downloadReport(selectedType, currentFilters(), format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-${selectedType}.${format === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Laporan berhasil diekspor ke ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, `Gagal mengekspor ${format.toUpperCase()}`));
    } finally {
      setExporting(null);
    }
  };

  const renderCell = (
    raw: string | number | undefined,
    format: "text" | "currency" | "number" | "percent" | "date" = "text",
  ) => {
    if (raw === undefined || raw === null) return "-";
    if (format === "currency" && typeof raw === "number") return formatCurrency(raw);
    if (format === "number" && typeof raw === "number") return formatNumber(raw);
    if (format === "percent" && typeof raw === "number") return `${formatNumber(raw)}%`;
    return String(raw);
  };

  return (
    <div className="space-y-6">
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Laporan Perusahaan"
          description="Hasilkan laporan resmi RAB, proyek, katalog, AHSP, realisasi, dan varians anggaran dalam format PDF, Excel, dan Cetak."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
                disabled={exporting !== null}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {exporting === "excel" ? "Mengekspor..." : "Export Excel"}
              </Button>
              <Button size="sm" onClick={() => handleExport("pdf")} disabled={exporting !== null}>
                <Download className="h-4 w-4" />
                {exporting === "pdf" ? "Mengekspor..." : "Export PDF"}
              </Button>
            </div>
          }
        />

        {/* 8 Report Types Selector */}
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.type}
              type="button"
              onClick={() => {
                setSelectedType(rt.type);
                setStatus("");
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                selectedType === rt.type
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              {rt.label}
            </button>
          ))}
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="pt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Pencarian</Label>
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  placeholder="Kata kunci..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Proyek</Label>
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Semua Proyek</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Input
                placeholder="Mis. FINAL / ACTIVE"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Mulai</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Akhir</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Corporate Report Document Preview / Printable Area */}
      {loading ? (
        <LoadingState rows={6} />
      ) : error || !dataset ? (
        <ErrorState message={error ?? "Laporan gagal dimuat"} onRetry={loadReport} />
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b pb-4">
              <div>
                <h2 className="text-lg font-bold">{dataset.companySnapshot.companyName}</h2>
                <p className="text-xs text-muted-foreground">{dataset.companySnapshot.address}</p>
                <p className="text-xs text-muted-foreground">
                  {dataset.companySnapshot.phone} • {dataset.companySnapshot.email}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-semibold text-base text-primary">{dataset.title}</p>
                <p className="font-mono text-xs text-muted-foreground">{dataset.documentNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Tanggal Cetak: {dataset.generatedAt.slice(0, 10)}
                </p>
              </div>
            </div>

            {dataset.rows.length === 0 ? (
              <EmptyState
                title="Tidak ada data laporan"
                description="Sesuaikan filter tanggal, proyek, status, atau kata kunci pencarian Anda."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      {dataset.columns.map((col) => (
                        <th
                          key={col.key}
                          className={cn(
                            "px-3 py-2.5",
                            col.align === "right"
                              ? "text-right"
                              : col.align === "center"
                                ? "text-center"
                                : "text-left",
                          )}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dataset.rows.map((row, idx) => (
                      <tr key={idx}>
                        {dataset.columns.map((col) => (
                          <td
                            key={col.key}
                            className={cn(
                              "px-3 py-2.5",
                              col.align === "right"
                                ? "text-right"
                                : col.align === "center"
                                  ? "text-center"
                                  : "text-left",
                            )}
                          >
                            {renderCell(row[col.key], col.format)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {dataset.summaryTotals.length > 0 && (
              <div className="border-t pt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {dataset.summaryTotals.map((total) => (
                  <div key={total.label} className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{total.label}</p>
                    <p className="text-base font-bold mt-0.5">
                      {typeof total.value === "number"
                        ? renderCell(total.value, total.format ?? "number")
                        : total.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ReportsPage;
