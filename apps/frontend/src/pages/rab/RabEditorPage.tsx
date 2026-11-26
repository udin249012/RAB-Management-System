import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calculator, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RabItemMode, type AhspAnalysis, type Project, type Unit } from "@rab/shared-types";
import { rabCreateSchema } from "@rab/shared-validation";
import { ahspApi } from "@/services/api/ahspApi";
import { catalogApi } from "@/services/api/catalogApi";
import { projectsApi } from "@/services/api/projectsApi";
import { rabApi } from "@/services/api/rabApi";
import { settingsApi } from "@/services/api/settingsApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency } from "@/utils/formatters";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface DraftItemRow {
  sectionName: string;
  mode: RabItemMode;
  ahspId: string;
  name: string;
  volume: string;
  unitSnapshot: string;
  unitPriceSnapshot: string;
}

interface DraftAdditionalCost {
  name: string;
  amount: string;
  notes: string;
}

export function RabEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [ahspList, setAhspList] = useState<AhspAnalysis[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [overheadPercent, setOverheadPercent] = useState("10");
  const [profitPercent, setProfitPercent] = useState("5");
  const [taxPercent, setTaxPercent] = useState("11");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItemRow[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState<DraftAdditionalCost[]>([]);

  const ahspMap = useMemo(() => new Map(ahspList.map((a) => [a.id, a])), [ahspList]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const loadData = useCallback(async () => {
    setLoadingInit(true);
    try {
      const [prjRes, ahspRes, unitsRes] = await Promise.all([
        projectsApi.list({ page: 1, limit: 100 }),
        ahspApi.list({ page: 1, limit: 100, isActive: "true" }),
        catalogApi.listUnits(),
      ]);
      setProjects(prjRes.items);
      setAhspList(ahspRes.items);
      setUnits(unitsRes);

      if (id) {
        const detail = await rabApi.getById(id);
        setProjectId(detail.projectId);
        setTitle(detail.title);
        setDocumentDate(detail.documentDate);
        setOverheadPercent(String(detail.overheadPercent));
        setProfitPercent(String(detail.profitPercent));
        setTaxPercent(String(detail.taxPercent));
        setNotes(detail.notes ?? "");
        setItems(
          detail.items.map((item) => ({
            sectionName: item.sectionName,
            mode: item.mode,
            ahspId: item.ahspId ?? "",
            name: item.name,
            volume: String(item.volume),
            unitSnapshot: item.unitSnapshot,
            unitPriceSnapshot: String(item.unitPriceSnapshot),
          })),
        );
        setAdditionalCosts(
          (detail.additionalCosts ?? []).map((c) => ({
            name: c.name,
            amount: String(c.amount),
            notes: c.notes ?? "",
          })),
        );
      } else {
        try {
          const settings = await settingsApi.getSettings();
          setOverheadPercent(String(settings.defaultOverheadPercent));
          setProfitPercent(String(settings.defaultProfitPercent));
          setTaxPercent(String(settings.defaultTaxPercent));
        } catch {
          // Fallback to existing defaults if settings unavailable
        }
        setProjectId(prjRes.items[0]?.id ?? "");
        setItems([
          {
            sectionName: "Pekerjaan Persiapan",
            mode: RabItemMode.MANUAL,
            ahspId: ahspRes.items[0]?.id ?? "",
            name: "",
            volume: "1",
            unitSnapshot: unitsRes[0]?.symbol ?? "ls",
            unitPriceSnapshot: "0",
          },
        ]);
      }
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memuat editor RAB"));
    } finally {
      setLoadingInit(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addItem = (mode: RabItemMode) => {
    const defaultAhsp = ahspList[0];
    setItems((prev) => [
      ...prev,
      {
        sectionName: prev[prev.length - 1]?.sectionName ?? "Pekerjaan Utama",
        mode,
        ahspId: defaultAhsp?.id ?? "",
        name: mode === RabItemMode.AHSP ? (defaultAhsp?.name ?? "") : "",
        volume: "1",
        unitSnapshot:
          mode === RabItemMode.AHSP
            ? (unitMap.get(defaultAhsp?.unitId ?? "")?.symbol ?? "-")
            : (units[0]?.symbol ?? "m2"),
        unitPriceSnapshot:
          mode === RabItemMode.AHSP ? String(defaultAhsp?.unitPriceTotal ?? 0) : "0",
      },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<DraftItemRow>) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const next = { ...row, ...patch };
        if (patch.ahspId && next.mode === RabItemMode.AHSP) {
          const selectedAhsp = ahspMap.get(patch.ahspId);
          if (selectedAhsp) {
            next.name = selectedAhsp.name;
            next.unitSnapshot = unitMap.get(selectedAhsp.unitId)?.symbol ?? "-";
            next.unitPriceSnapshot = String(selectedAhsp.unitPriceTotal);
          }
        }
        return next;
      }),
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      projectId,
      title: title.trim(),
      documentDate,
      overheadPercent: Number(overheadPercent) || 0,
      profitPercent: Number(profitPercent) || 0,
      taxPercent: Number(taxPercent) || 0,
      notes: notes.trim() || undefined,
      additionalCosts: additionalCosts
        .filter((c) => c.name.trim().length > 0)
        .map((c) => ({
          name: c.name.trim(),
          amount: Number(c.amount) || 0,
          notes: c.notes.trim() || undefined,
        })),
      items: items.map((item, idx) => ({
        sectionName: item.sectionName.trim(),
        order: idx + 1,
        mode: item.mode,
        ...(item.mode === RabItemMode.AHSP
          ? {
              ahspId: item.ahspId,
              name: item.name.trim() || undefined,
              volume: Number(item.volume),
            }
          : {
              name: item.name.trim(),
              volume: Number(item.volume),
              unitSnapshot: item.unitSnapshot.trim(),
              unitPriceSnapshot: Number(item.unitPriceSnapshot),
            }),
      })),
    };

    const parsed = rabCreateSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data RAB belum lengkap atau tidak valid");
      return;
    }

    setSaving(true);
    try {
      const saved =
        isEditing && id ? await rabApi.update(id, parsed.data) : await rabApi.create(parsed.data);
      toast.success(isEditing ? "Dokumen RAB berhasil diperbarui" : "Dokumen RAB berhasil dibuat");
      navigate(`/rab/${saved.id}`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan dokumen RAB"));
    } finally {
      setSaving(false);
    }
  };

  // Preview estimate (authoritative calculation happens in backend)
  const previewSubtotal = items.reduce((sum, item) => {
    const vol = Number(item.volume) || 0;
    const price =
      item.mode === RabItemMode.AHSP
        ? (ahspMap.get(item.ahspId)?.unitPriceTotal ?? 0)
        : Number(item.unitPriceSnapshot) || 0;
    return sum + vol * price;
  }, 0);

  if (loadingInit) return <LoadingState rows={6} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditing ? "Edit Dokumen RAB" : "Buat Dokumen RAB Baru"}
        description="Gabungkan item manual dan pekerjaan berbasis AHSP. Perhitungan akhir dan snapshot harga diproses oleh backend."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/rab">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Umum Dokumen</CardTitle>
            <CardDescription>Identitas proyek, judul dokumen, dan parameter biaya</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="rab-prj">Proyek</Label>
                <Select
                  id="rab-prj"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                >
                  <option value="">Pilih Proyek</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rab-title">Judul Dokumen RAB</Label>
                <Input
                  id="rab-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="RAB Pekerjaan Sipil & Arsitektur"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="rab-date">Tanggal Dokumen</Label>
                <Input
                  id="rab-date"
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rab-oh">Overhead (%)</Label>
                <Input
                  id="rab-oh"
                  type="number"
                  step="any"
                  value={overheadPercent}
                  onChange={(e) => setOverheadPercent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rab-profit">Profit (%)</Label>
                <Input
                  id="rab-profit"
                  type="number"
                  step="any"
                  value={profitPercent}
                  onChange={(e) => setProfitPercent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rab-tax">Pajak / PPN (%)</Label>
                <Input
                  id="rab-tax"
                  type="number"
                  step="any"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rab-notes">Catatan Dokumen</Label>
              <Textarea
                id="rab-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Syarat, asumsi teknis, atau catatan tambahan..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Daftar Pekerjaan RAB</CardTitle>
              <CardDescription>
                Tambahkan item secara manual maupun otomatis mengambil harga &amp; komponen AHSP.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem(RabItemMode.MANUAL)}
              >
                <Plus className="h-4 w-4" />
                Item Manual
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => addItem(RabItemMode.AHSP)}
                disabled={ahspList.length === 0}
              >
                <Calculator className="h-4 w-4" />
                Item Berbasis AHSP
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item, idx) => {
              const selectedAhsp = item.mode === RabItemMode.AHSP ? ahspMap.get(item.ahspId) : null;
              const unitPrice =
                item.mode === RabItemMode.AHSP
                  ? (selectedAhsp?.unitPriceTotal ?? 0)
                  : Number(item.unitPriceSnapshot) || 0;
              const lineSubtotal = (Number(item.volume) || 0) * unitPrice;

              return (
                <div key={idx} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Baris #{idx + 1} —{" "}
                      {item.mode === RabItemMode.AHSP ? "Otomatis AHSP" : "Input Manual"}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus pekerjaan baris ${idx + 1}`}
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs">Kategori / Bagian Pekerjaan</Label>
                      <Input
                        value={item.sectionName}
                        onChange={(e) => updateItem(idx, { sectionName: e.target.value })}
                        placeholder="Pekerjaan Struktur"
                        required
                      />
                    </div>

                    {item.mode === RabItemMode.AHSP ? (
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-xs">Pilih Analisis AHSP</Label>
                        <Select
                          value={item.ahspId}
                          onChange={(e) => updateItem(idx, { ahspId: e.target.value })}
                          required
                        >
                          <option value="">Pilih AHSP</option>
                          {ahspList.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name} ({formatCurrency(a.unitPriceTotal)})
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-xs">Nama Pekerjaan</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(idx, { name: e.target.value })}
                          placeholder="Nama item pekerjaan"
                          required
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Volume</Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.0001"
                        value={item.volume}
                        onChange={(e) => updateItem(idx, { volume: e.target.value })}
                        required
                      />
                    </div>

                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-xs">Satuan</Label>
                      {item.mode === RabItemMode.AHSP ? (
                        <Input
                          value={
                            unitMap.get(selectedAhsp?.unitId ?? "")?.symbol ?? item.unitSnapshot
                          }
                          disabled
                        />
                      ) : (
                        <Input
                          value={item.unitSnapshot}
                          onChange={(e) => updateItem(idx, { unitSnapshot: e.target.value })}
                          required
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Harga Satuan</Label>
                      {item.mode === RabItemMode.AHSP ? (
                        <Input value={formatCurrency(unitPrice)} disabled />
                      ) : (
                        <Input
                          type="number"
                          step="any"
                          value={item.unitPriceSnapshot}
                          onChange={(e) => updateItem(idx, { unitPriceSnapshot: e.target.value })}
                          required
                        />
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs font-medium text-muted-foreground">
                    Estimasi Subtotal Baris:{" "}
                    <span className="text-foreground font-semibold">
                      {formatCurrency(lineSubtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Biaya Tambahan (Opsional)</CardTitle>
              <CardDescription>
                Biaya mobilisasi, perizinan, atau biaya pendukung lain
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAdditionalCosts((prev) => [...prev, { name: "", amount: "0", notes: "" }])
              }
            >
              <Plus className="h-4 w-4" />
              Tambah Biaya
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {additionalCosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada biaya tambahan.</p>
            ) : (
              additionalCosts.map((cost, idx) => (
                <div key={idx} className="grid gap-3 sm:grid-cols-12 items-center">
                  <div className="sm:col-span-5">
                    <Input
                      placeholder="Nama biaya tambahan"
                      value={cost.name}
                      onChange={(e) =>
                        setAdditionalCosts((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, name: e.target.value } : c)),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Nominal"
                      value={cost.amount}
                      onChange={(e) =>
                        setAdditionalCosts((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, amount: e.target.value } : c)),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      placeholder="Keterangan"
                      value={cost.notes}
                      onChange={(e) =>
                        setAdditionalCosts((prev) =>
                          prev.map((c, i) => (i === idx ? { ...c, notes: e.target.value } : c)),
                        )
                      }
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus biaya tambahan baris ${idx + 1}`}
                      onClick={() => setAdditionalCosts((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border bg-card p-5">
          <div>
            <p className="text-xs text-muted-foreground">Estimasi Subtotal Pekerjaan</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(previewSubtotal)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" asChild>
              <Link to="/rab">Batal</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Menghitung & Menyimpan..." : "Simpan & Hitung RAB"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default RabEditorPage;
