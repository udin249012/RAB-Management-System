import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  FolderKanban,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
import type { DashboardSummary } from "@rab/shared-types";
import { monitoringApi } from "@/services/api/monitoringApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PROJECT_STATUS_LABELS } from "@/features/projects/labels";
import { RAB_STATUS_LABELS, RAB_STATUS_VARIANTS } from "@/features/rab/labels";

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await monitoringApi.getDashboard();
      setData(summary);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat ringkasan dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <LoadingState rows={6} />;
  if (error || !data) {
    return (
      <ErrorState message={error ?? "Data dashboard tidak tersedia"} onRetry={fetchDashboard} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ringkasan real-time proyek, dokumen RAB, nilai anggaran, realisasi biaya, dan aktivitas sistem."
      />

      {/* Primary KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Proyek</CardDescription>
            <FolderKanban className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aktif: {data.activeProjects} • Selesai: {data.completedProjects}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Dokumen RAB</CardDescription>
            <FileSpreadsheet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data.totalRabDocuments}</p>
            <p className="text-xs text-muted-foreground mt-1">Seluruh versi &amp; status RAB</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Nilai Anggaran (Final)</CardDescription>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totalPlannedBudget)}</p>
            <p className="text-xs text-muted-foreground mt-1">Akumulasi RAB berstatus Final</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Realisasi &amp; Sisa Anggaran</CardDescription>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.totalRealizedCost)}</p>
            <p
              className={`text-xs mt-1 ${
                data.remainingBudget < 0 ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              Sisa: {formatCurrency(data.remainingBudget)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Grafik Anggaran &amp; Realisasi per Bulan</CardTitle>
            <CardDescription>Perbandingan RAB Final dan pengeluaran aktual bulanan</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {data.monthlyChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Belum ada data transaksi RAB Final atau realisasi bulanan di database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Legend />
                  <Bar dataKey="plannedBudget" name="Anggaran RAB" fill="#2563eb" />
                  <Bar dataKey="actualRealization" name="Realisasi Biaya" fill="#eab308" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Status Proyek</CardTitle>
            <CardDescription>Distribusi status proyek perusahaan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.projectStatusSummary.map((item) => {
              const pct =
                data.totalProjects > 0 ? Math.round((item.count / data.totalProjects) * 100) : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{PROJECT_STATUS_LABELS[item.status]}</span>
                    <span className="text-muted-foreground">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent RAB & Activity Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>RAB Terbaru</CardTitle>
              <CardDescription>5 dokumen RAB terakhir diperbarui</CardDescription>
            </div>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.recentRabs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada dokumen RAB.</p>
            ) : (
              <div className="divide-y">
                {data.recentRabs.map((rab) => (
                  <div
                    key={rab.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/rab/${rab.id}`}
                        className="font-medium text-primary hover:underline truncate block"
                      >
                        {rab.documentNumber} — {rab.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {rab.documentDate} • {formatCurrency(rab.grandTotal)}
                      </p>
                    </div>
                    <Badge variant={RAB_STATUS_VARIANTS[rab.status]}>
                      {RAB_STATUS_LABELS[rab.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Aktivitas Terbaru</CardTitle>
              <CardDescription>Log audit aktivitas administrator</CardDescription>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
            ) : (
              <div className="divide-y">
                {data.recentActivities.map((log) => (
                  <div key={log.id} className="py-2.5 text-xs space-y-0.5">
                    <p className="font-medium text-foreground">{log.summary}</p>
                    <p className="text-muted-foreground">
                      {log.actorEmail} • {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
