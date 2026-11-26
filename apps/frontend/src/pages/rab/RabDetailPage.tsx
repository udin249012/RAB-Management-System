import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CopyPlus,
  Download,
  FileSpreadsheet,
  Pencil,
  Printer,
  RefreshCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { AhspComponentType, RabStatus, type RabDetail, type RabDocument } from "@rab/shared-types";
import { rabApi } from "@/services/api/rabApi";
import { reportsApi } from "@/services/api/reportsApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RAB_MODE_LABELS, RAB_STATUS_LABELS, RAB_STATUS_VARIANTS } from "@/features/rab/labels";

const COMPONENT_GROUP_LABELS: Record<AhspComponentType, string> = {
  [AhspComponentType.MATERIAL]: "Material",
  [AhspComponentType.LABOR]: "Tenaga Kerja",
  [AhspComponentType.EQUIPMENT]: "Peralatan",
};

export function RabDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rab, setRab] = useState<RabDetail | null>(null);
  const [revisions, setRevisions] = useState<RabDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, revList] = await Promise.all([rabApi.getById(id), rabApi.listRevisions(id)]);
      setRab(detail);
      setRevisions(revList);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat detail dokumen RAB"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const groupedSections = useMemo(() => {
    if (!rab) return [];
    const map = new Map<string, typeof rab.items>();
    for (const item of rab.items) {
      const list = map.get(item.sectionName) ?? [];
      list.push(item);
      map.set(item.sectionName, list);
    }
    return Array.from(map.entries());
  }, [rab]);

  const handleRecalculate = async () => {
    if (!rab) return;
    setActionLoading(true);
    try {
      const updated = await rabApi.calculate(rab.id);
      setRab(updated);
      toast.success("Kalkulasi RAB diperbarui oleh backend");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghitung ulang RAB"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!rab) return;
    setActionLoading(true);
    try {
      await rabApi.changeStatus(rab.id, { status: RabStatus.REVIEW });
      toast.success("Status dokumen diubah menjadi Review");
      await fetchDetail();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengubah status RAB"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!rab) return;
    setActionLoading(true);
    try {
      await rabApi.finalize(rab.id);
      toast.success("Dokumen RAB resmi difinalisasi dan dikunci");
      await fetchDetail();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memfinalisasi RAB"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRevision = async () => {
    if (!rab) return;
    setActionLoading(true);
    try {
      const rev = await rabApi.createRevision(rab.id);
      toast.success(`Revisi v${rev.version} dibuat`);
      navigate(`/rab/${rev.id}/edit`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal membuat revisi RAB"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportRab = async (format: "pdf" | "excel") => {
    if (!rab) return;
    setActionLoading(true);
    try {
      const blob = await reportsApi.downloadSingleRab(rab.id, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeNum = rab.documentNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `${safeNum}.${format === "pdf" ? "pdf" : "xlsx"}`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Dokumen RAB diekspor ke ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, `Gagal mengekspor RAB (${format.toUpperCase()})`));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState rows={6} />;
  if (error || !rab) {
    return <ErrorState message={error ?? "Dokumen RAB tidak ditemukan"} onRetry={fetchDetail} />;
  }

  const isImmutable = rab.status === RabStatus.FINAL || rab.status === RabStatus.ARCHIVED;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={`${rab.documentNumber} — ${rab.title}`}
          description={`Versi ${rab.version} • Tanggal ${rab.documentDate}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/rab">
                  <ArrowLeft className="h-4 w-4" />
                  Daftar RAB
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Cetak
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportRab("pdf")}
                disabled={actionLoading}
              >
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportRab("excel")}
                disabled={actionLoading}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
              {!isImmutable && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecalculate}
                    disabled={actionLoading}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Hitung Ulang
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/rab/${rab.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  {rab.status === RabStatus.DRAFT && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={actionLoading}
                    >
                      <Send className="h-4 w-4" />
                      Ajukan Review
                    </Button>
                  )}
                  <Button size="sm" onClick={handleFinalize} disabled={actionLoading}>
                    <CheckCircle2 className="h-4 w-4" />
                    Finalisasi RAB
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateRevision}
                disabled={actionLoading}
              >
                <CopyPlus className="h-4 w-4" />
                Buat Revisi
              </Button>
            </div>
          }
        />
      </div>

      {/* Corporate Printable Header */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold">
                {rab.companySnapshot?.companyName ?? "PT Perusahaan Konstruksi Indonesia"}
              </h2>
              <p className="text-xs text-muted-foreground">{rab.companySnapshot?.address}</p>
              <p className="text-xs text-muted-foreground">
                {rab.companySnapshot?.phone} • {rab.companySnapshot?.email}
              </p>
            </div>
            <div className="sm:text-right space-y-1">
              <Badge variant={RAB_STATUS_VARIANTS[rab.status]}>
                {RAB_STATUS_LABELS[rab.status]}
              </Badge>
              <p className="font-mono text-sm font-semibold">{rab.documentNumber}</p>
              <p className="text-xs text-muted-foreground">
                Versi {rab.version} • Tanggal: {rab.documentDate}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Proyek</p>
              <p className="font-medium">
                {rab.project ? `${rab.project.code} — ${rab.project.name}` : rab.projectId}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lokasi</p>
              <p className="font-medium">{rab.project?.location ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pemilik Proyek</p>
              <p className="font-medium">{rab.project?.ownerName ?? "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAB Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rincian Anggaran Biaya Pekerjaan</CardTitle>
          <CardDescription>
            Harga satuan dan koefisien tersimpan sebagai snapshot permanen dokumen.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left">No</th>
                <th className="px-3 py-2.5 text-left">Uraian Pekerjaan</th>
                <th className="px-3 py-2.5 text-left">Metode</th>
                <th className="px-3 py-2.5 text-right">Volume</th>
                <th className="px-3 py-2.5 text-left">Satuan</th>
                <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                <th className="px-3 py-2.5 text-right">Jumlah Harga</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupedSections.map(([sectionName, sectionItems]) => {
                const sectionSubtotal = sectionItems.reduce((sum, i) => sum + i.subtotal, 0);
                return (
                  <Fragment key={sectionName}>
                    <tr className="bg-muted/30 font-semibold">
                      <td colSpan={6} className="px-3 py-2">
                        {sectionName}
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(sectionSubtotal)}</td>
                    </tr>
                    {sectionItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{item.name}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline">{RAB_MODE_LABELS[item.mode]}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right">{formatNumber(item.volume)}</td>
                        <td className="px-3 py-2.5">{item.unitSnapshot}</td>
                        <td className="px-3 py-2.5 text-right">
                          {formatCurrency(item.unitPriceSnapshot)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Aggregated AHSP Resource Needs */}
        <Card>
          <CardHeader>
            <CardTitle>Kebutuhan Material, Tenaga Kerja &amp; Peralatan (AHSP)</CardTitle>
            <CardDescription>
              Rekapitulasi kebutuhan sumber daya dari seluruh item pekerjaan berbasis AHSP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rab.resourceSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada item berbasis AHSP pada dokumen RAB ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">Tipe</th>
                      <th className="px-2 py-2 text-left">Komponen</th>
                      <th className="px-2 py-2 text-right">Kebutuhan</th>
                      <th className="px-2 py-2 text-right">Estimasi Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rab.resourceSummary.map((res) => (
                      <tr key={`${res.componentType}-${res.referenceId}`}>
                        <td className="px-2 py-2">{COMPONENT_GROUP_LABELS[res.componentType]}</td>
                        <td className="px-2 py-2 font-medium">{res.referenceName}</td>
                        <td className="px-2 py-2 text-right">
                          {formatNumber(res.totalQuantity)} {res.unitSymbol}
                        </td>
                        <td className="px-2 py-2 text-right">{formatCurrency(res.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Rekapitulasi Total Biaya</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal Pekerjaan</span>
              <span className="font-medium">{formatCurrency(rab.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overhead ({rab.overheadPercent}%)</span>
              <span>{formatCurrency(rab.overheadAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profit ({rab.profitPercent}%)</span>
              <span>{formatCurrency(rab.profitAmount)}</span>
            </div>
            {rab.additionalCosts.map((c) => (
              <div key={c.id} className="flex justify-between">
                <span className="text-muted-foreground">Biaya Tambahan: {c.name}</span>
                <span>{formatCurrency(c.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pajak / PPN ({rab.taxPercent}%)</span>
              <span>{formatCurrency(rab.taxAmount)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-base font-bold">
              <span>Grand Total RAB</span>
              <span className="text-primary">{formatCurrency(rab.grandTotal)}</span>
            </div>
            {rab.notes && (
              <p className="text-xs text-muted-foreground pt-2 border-t">Catatan: {rab.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revision History */}
      {revisions.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Riwayat Versi &amp; Revisi Dokumen Proyek</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {revisions.map((rev) => (
              <div key={rev.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <Link to={`/rab/${rev.id}`} className="font-medium text-primary hover:underline">
                    {rev.documentNumber} (v{rev.version})
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {rev.documentDate} • {formatCurrency(rev.grandTotal)}
                  </p>
                </div>
                <Badge variant={RAB_STATUS_VARIANTS[rev.status]}>
                  {RAB_STATUS_LABELS[rev.status]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RabDetailPage;
