import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AhspComponentType,
  type AhspDetail,
  type Material,
  type Unit,
  type WorkItem,
} from "@rab/shared-types";
import { ahspCreateSchema } from "@rab/shared-validation";
import { ahspApi } from "@/services/api/ahspApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

interface AhspBuilderModalProps {
  open: boolean;
  onClose: () => void;
  editingDetail: AhspDetail | null;
  materials: Material[];
  workItems: WorkItem[];
  units: Unit[];
  onSaved: () => Promise<void>;
}

interface DraftComponentRow {
  componentType: AhspComponentType;
  referenceId: string;
  coefficient: string;
}

const COMPONENT_TYPE_LABELS: Record<AhspComponentType, string> = {
  [AhspComponentType.MATERIAL]: "Material",
  [AhspComponentType.LABOR]: "Tenaga Kerja",
  [AhspComponentType.EQUIPMENT]: "Peralatan",
};

export function AhspBuilderModal({
  open,
  onClose,
  editingDetail,
  materials,
  workItems,
  units,
  onSaved,
}: AhspBuilderModalProps) {
  const [code, setCode] = useState("");
  const [workItemId, setWorkItemId] = useState("");
  const [name, setName] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rows, setRows] = useState<DraftComponentRow[]>([]);
  const [saving, setSaving] = useState(false);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const laborCandidates = useMemo(
    () => workItems.filter((w) => w.basePrice !== undefined && w.isActive),
    [workItems],
  );
  const workItemMap = useMemo(() => new Map(workItems.map((w) => [w.id, w])), [workItems]);

  useEffect(() => {
    if (!open) return;
    if (editingDetail) {
      setCode(editingDetail.code);
      setWorkItemId(editingDetail.workItemId);
      setName(editingDetail.name);
      setSourceReference(editingDetail.sourceReference ?? "");
      setChangeReason("");
      setIsActive(editingDetail.isActive);
      setRows(
        editingDetail.components.map((c) => ({
          componentType: c.componentType,
          referenceId: c.referenceId,
          coefficient: String(c.coefficient),
        })),
      );
    } else {
      const firstWork = workItems[0];
      setCode("");
      setWorkItemId(firstWork?.id ?? "");
      setName(firstWork?.name ?? "");
      setSourceReference("");
      setChangeReason("");
      setIsActive(true);
      setRows([
        {
          componentType: AhspComponentType.MATERIAL,
          referenceId: materials[0]?.id ?? "",
          coefficient: "1",
        },
      ]);
    }
  }, [open, editingDetail, workItems, materials]);

  const addRow = (componentType: AhspComponentType) => {
    const defaultRef =
      componentType === AhspComponentType.LABOR
        ? (laborCandidates[0]?.id ?? "")
        : (materials[0]?.id ?? "");
    setRows((prev) => [...prev, { componentType, referenceId: defaultRef, coefficient: "1" }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateRow = (index: number, patch: Partial<DraftComponentRow>) => {
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row;
        const next = { ...row, ...patch };
        if (patch.componentType && patch.componentType !== row.componentType) {
          next.referenceId =
            patch.componentType === AhspComponentType.LABOR
              ? (laborCandidates[0]?.id ?? "")
              : (materials[0]?.id ?? "");
        }
        return next;
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: code.trim(),
      workItemId,
      name: name.trim(),
      sourceReference: sourceReference.trim() || undefined,
      isActive,
      components: rows.map((r) => ({
        componentType: r.componentType,
        referenceId: r.referenceId,
        coefficient: Number(r.coefficient),
      })),
    };

    const parsed = ahspCreateSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data AHSP belum valid");
      return;
    }

    setSaving(true);
    try {
      if (editingDetail) {
        await ahspApi.update(editingDetail.id, {
          ...parsed.data,
          changeReason: changeReason.trim() || undefined,
        });
        toast.success("Analisis AHSP berhasil diperbarui");
      } else {
        await ahspApi.create(parsed.data);
        toast.success("Analisis AHSP berhasil dibuat");
      }
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan analisis AHSP"));
    } finally {
      setSaving(false);
    }
  };

  const getRowEstimate = (row: DraftComponentRow) => {
    const coeff = Number(row.coefficient) || 0;
    if (row.componentType === AhspComponentType.LABOR) {
      const item = workItemMap.get(row.referenceId);
      const unitPrice = item?.basePrice ?? 0;
      const symbol = item ? (unitMap.get(item.unitId)?.symbol ?? "-") : "-";
      return { unitPrice, symbol, estimate: coeff * unitPrice };
    }
    const mat = materialMap.get(row.referenceId);
    const unitPrice = mat?.unitPrice ?? 0;
    const symbol = mat ? (unitMap.get(mat.unitId)?.symbol ?? "-") : "-";
    return { unitPrice, symbol, estimate: coeff * unitPrice };
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        editingDetail ? `Edit Analisis AHSP: ${editingDetail.code}` : "Buat Analisis AHSP Baru"
      }
      description="Masukkan koefisien sesuai sumber data standar perusahaan. Total akhir dihitung dan disimpan oleh backend."
      maxWidthClassName="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ahsp-code">Kode AHSP</Label>
            <Input
              id="ahsp-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="AHSP-STR-001"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ahsp-work">Pekerjaan (Katalog)</Label>
            <Select
              id="ahsp-work"
              value={workItemId}
              onChange={(e) => {
                const selectedId = e.target.value;
                setWorkItemId(selectedId);
                if (!editingDetail) {
                  const found = workItemMap.get(selectedId);
                  if (found) setName(found.name);
                }
              }}
              required
            >
              <option value="">Pilih Pekerjaan</option>
              {workItems.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ahsp-name">Nama Analisis Pekerjaan</Label>
            <Input id="ahsp-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ahsp-src">Referensi Sumber Koefisien (SNI / Standar Internal)</Label>
            <Input
              id="ahsp-src"
              value={sourceReference}
              onChange={(e) => setSourceReference(e.target.value)}
              placeholder="Mis. Permen PUPR / SNI / Analisa Internal"
            />
          </div>
        </div>

        {editingDetail && (
          <div className="space-y-1.5">
            <Label htmlFor="ahsp-reason">Catatan Revisi</Label>
            <Input
              id="ahsp-reason"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="Alasan perubahan koefisien atau komponen"
            />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Komponen Pembentuk Harga Satuan</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRow(AhspComponentType.MATERIAL)}
              >
                <Plus className="h-3.5 w-3.5" />
                Material
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRow(AhspComponentType.LABOR)}
              >
                <Plus className="h-3.5 w-3.5" />
                Tenaga Kerja
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addRow(AhspComponentType.EQUIPMENT)}
              >
                <Plus className="h-3.5 w-3.5" />
                Peralatan
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
            {rows.map((row, idx) => {
              const est = getRowEstimate(row);
              const options =
                row.componentType === AhspComponentType.LABOR ? laborCandidates : materials;

              return (
                <div
                  key={idx}
                  className="grid gap-2 sm:grid-cols-12 items-center rounded-md border bg-card p-2.5"
                >
                  <div className="sm:col-span-3">
                    <Select
                      value={row.componentType}
                      onChange={(e) =>
                        updateRow(idx, { componentType: e.target.value as AhspComponentType })
                      }
                    >
                      {Object.entries(COMPONENT_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="sm:col-span-4">
                    <Select
                      value={row.referenceId}
                      onChange={(e) => updateRow(idx, { referenceId: e.target.value })}
                    >
                      <option value="">Pilih Komponen</option>
                      {options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.code} — {opt.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      type="number"
                      step="any"
                      min="0.0001"
                      value={row.coefficient}
                      onChange={(e) => updateRow(idx, { coefficient: e.target.value })}
                      placeholder="Koefisien"
                    />
                  </div>

                  <div className="sm:col-span-2 text-xs text-right">
                    <p className="font-medium">{formatCurrency(est.estimate)}</p>
                    <p className="text-muted-foreground">
                      @ {formatCurrency(est.unitPrice)}/{est.symbol}
                    </p>
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus komponen baris ${idx + 1}`}
                      onClick={() => removeRow(idx)}
                      disabled={rows.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Jadikan AHSP aktif untuk item pekerjaan terkait
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Menghitung & Menyimpan..." : "Simpan Analisis"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
