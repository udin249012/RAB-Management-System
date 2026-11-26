import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  RabStatus,
  type BudgetRealization,
  type MonitoringSummaryResponse,
  type PaginationMeta,
  type Project,
  type RabDocument,
} from "@rab/shared-types";
import { monitoringApi } from "@/services/api/monitoringApi";
import { projectsApi } from "@/services/api/projectsApi";
import { rabApi } from "@/services/api/rabApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency } from "@/utils/formatters";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  REALIZATION_CATEGORIES,
  RealizationFormModal,
} from "@/features/monitoring/RealizationFormModal";

export function MonitoringPage() {
  const [summary, setSummary] = useState<MonitoringSummaryResponse | null>(null);
  const [realizations, setRealizations] = useState<BudgetRealization[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [finalRabs, setFinalRabs] = useState<RabDocument[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetRealization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetRealization | null>(null);
  const [deleting, setDeleting] = useState(false);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  useEffect(() => {
    void Promise.all([
      projectsApi.list({ page: 1, limit: 100 }),
      rabApi.list({ page: 1, limit: 100, status: RabStatus.FINAL }),
    ])
      .then(([prjRes, rabRes]) => {
        setProjects(prjRes.items);
        setFinalRabs(rabRes.items);
      })
      .catch(() => {});
  }, []);

  const fetchMonitoring = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, realRes] = await Promise.all([
        monitoringApi.getSummary(projectFilter || undefined),
        monitoringApi.listRealizations({
          page,
          limit: 15,
          projectId: projectFilter || undefined,
          category: categoryFilter || undefined,
          search: search.trim() || undefined,
        }),
      ]);
      setSummary(sumRes);
      setRealizations(realRes.items);
      setMeta(realRes.meta);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat data monitoring anggaran"));
    } finally {
      setLoading(false);
    }
  }, [page, projectFilter, categoryFilter, search]);

  useEffect(() => {
    void fetchMonitoring();
  }, [fetchMonitoring]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await monitoringApi.deleteRealization(deleteTarget.id);
      toast.success("Catatan realisasi berhasil dihapus");
      setDeleteTarget(null);
      await fetchMonitoring();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus realisasi"));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<BudgetRealization>[] = [
    {
      accessorKey: "transactionDate",
      header: "Tanggal",
      cell: ({ row }) => <span className="text-xs">{row.original.transactionDate}</span>,
    },
    {
      id: "project",
      header: "Proyek",
      cell: ({ row }) => {
        const prj = projectMap.get(row.original.projectId);
        return prj ? `${prj.code} — ${prj.name}` : row.original.projectId;
      },
    },
    {
      accessorKey: "category",
      header: "Kategori",
      cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    },
    {
      accessorKey: "description",
      header: "Keterangan",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.description}</p>
          {row.original.referenceNumber && (
            <p className="text-xs text-muted-foreground">Ref: {row.original.referenceNumber}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Nominal",
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.amount)}</span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit realisasi ${row.original.description}`}
            onClick={() => {
              setEditingItem(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Hapus realisasi ${row.original.description}`}
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring Anggaran"
        description="Bandingkan anggaran rencana (RAB Final) dengan realisasi biaya aktual proyek secara terpisah dan akurat."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Catat Realisasi Biaya
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Anggaran Rencana (RAB Final)</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(summary?.totalPlannedBudget ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Realisasi Aktual</CardDescription>
            <CardTitle className="text-xl text-primary">
              {formatCurrency(summary?.totalActualRealization ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sisa Anggaran</CardDescription>
            <CardTitle
              className={`text-xl ${
                (summary?.totalRemainingBudget ?? 0) < 0 ? "text-destructive" : ""
              }`}
            >
              {formatCurrency(summary?.totalRemainingBudget ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Persentase Serapan</CardDescription>
            <CardTitle className="text-xl">{summary?.overallAbsorptionPercent ?? 0}%</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${
                  (summary?.overallAbsorptionPercent ?? 0) > 100 ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${Math.min(summary?.overallAbsorptionPercent ?? 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Project Comparison */}
      {summary && summary.projects.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Grafik Anggaran vs Realisasi per Proyek</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.projects}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="projectCode" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey="plannedBudget" name="Anggaran RAB Final" fill="#2563eb" />
                  <Bar dataKey="actualRealization" name="Realisasi Aktual" fill="#eab308" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perbandingan Anggaran Proyek</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">Proyek</th>
                    <th className="px-2 py-2 text-right">Anggaran</th>
                    <th className="px-2 py-2 text-right">Realisasi</th>
                    <th className="px-2 py-2 text-right">Sisa</th>
                    <th className="px-2 py-2 text-right">Serapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summary.projects.map((p) => (
                    <tr key={p.projectId}>
                      <td className="px-2 py-2 font-medium">
                        {p.projectCode}
                        {p.isOverBudget && (
                          <AlertTriangle className="inline h-3.5 w-3.5 text-destructive ml-1" />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">{formatCurrency(p.plannedBudget)}</td>
                      <td className="px-2 py-2 text-right">
                        {formatCurrency(p.actualRealization)}
                      </td>
                      <td
                        className={`px-2 py-2 text-right ${
                          p.remainingBudget < 0 ? "text-destructive font-semibold" : ""
                        }`}
                      >
                        {formatCurrency(p.remainingBudget)}
                      </td>
                      <td className="px-2 py-2 text-right">{p.absorptionPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters + Realizations Table */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Cari keterangan atau no. referensi..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={projectFilter}
          onChange={(e) => {
            setProjectFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Proyek</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Kategori</option>
          {REALIZATION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchMonitoring} />
      ) : (
        <DataTable
          columns={columns}
          data={realizations}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          emptyTitle="Belum ada pencatatan realisasi biaya"
          emptyDescription="Catat transaksi pengeluaran aktual terhadap dokumen RAB yang telah berstatus Final."
        />
      )}

      <RealizationFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingItem={editingItem}
        projects={projects}
        finalRabs={finalRabs}
        onSaved={fetchMonitoring}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Hapus Realisasi Biaya"
        description={`Yakin ingin menghapus catatan realisasi "${deleteTarget?.description}" senilai ${formatCurrency(deleteTarget?.amount ?? 0)}?`}
      />
    </div>
  );
}

export default MonitoringPage;
