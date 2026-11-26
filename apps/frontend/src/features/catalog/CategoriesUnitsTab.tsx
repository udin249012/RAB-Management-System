import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  MaterialCategoryGroup,
  WorkCategoryType,
  type MaterialCategory,
  type Unit,
  type WorkCategory,
} from "@rab/shared-types";
import { catalogApi } from "@/services/api/catalogApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { MATERIAL_GROUP_LABELS, WORK_TYPE_LABELS } from "./labels";

interface CategoriesUnitsTabProps {
  units: Unit[];
  materialCategories: MaterialCategory[];
  workCategories: WorkCategory[];
  onRefresh: () => Promise<void>;
}

type ModalMode =
  | { type: "unit"; item?: Unit }
  | { type: "matCat"; item?: MaterialCategory }
  | { type: "workCat"; item?: WorkCategory }
  | null;

export function CategoriesUnitsTab({
  units,
  materialCategories,
  workCategories,
  onRefresh,
}: CategoriesUnitsTabProps) {
  const [modal, setModal] = useState<ModalMode>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [group, setGroup] = useState<MaterialCategoryGroup>(MaterialCategoryGroup.MATERIAL);
  const [workType, setWorkType] = useState<WorkCategoryType>(WorkCategoryType.CONSTRUCTION);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openUnitModal = (item?: Unit) => {
    setCode(item?.code ?? "");
    setName(item?.name ?? "");
    setSymbol(item?.symbol ?? "");
    setIsActive(item?.isActive ?? true);
    setModal({ type: "unit", item });
  };

  const openMatCatModal = (item?: MaterialCategory) => {
    setCode(item?.code ?? "");
    setName(item?.name ?? "");
    setGroup(item?.group ?? MaterialCategoryGroup.MATERIAL);
    setIsActive(item?.isActive ?? true);
    setModal({ type: "matCat", item });
  };

  const openWorkCatModal = (item?: WorkCategory) => {
    setCode(item?.code ?? "");
    setName(item?.name ?? "");
    setWorkType(item?.type ?? WorkCategoryType.CONSTRUCTION);
    setIsActive(item?.isActive ?? true);
    setModal({ type: "workCat", item });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.type === "unit") {
        if (modal.item) {
          await catalogApi.updateUnit(modal.item.id, { code, name, symbol, isActive });
        } else {
          await catalogApi.createUnit({ code, name, symbol, isActive });
        }
      } else if (modal.type === "matCat") {
        if (modal.item) {
          await catalogApi.updateMaterialCategory(modal.item.id, { code, name, group, isActive });
        } else {
          await catalogApi.createMaterialCategory({ code, name, group, isActive });
        }
      } else if (modal.type === "workCat") {
        if (modal.item) {
          await catalogApi.updateWorkCategory(modal.item.id, {
            code,
            name,
            type: workType,
            isActive,
          });
        } else {
          await catalogApi.createWorkCategory({ code, name, type: workType, isActive });
        }
      }
      toast.success("Data referensi berhasil disimpan");
      setModal(null);
      await onRefresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan data referensi"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kind: "unit" | "matCat" | "workCat", id: string) => {
    try {
      if (kind === "unit") await catalogApi.deleteUnit(id);
      if (kind === "matCat") await catalogApi.deleteMaterialCategory(id);
      if (kind === "workCat") await catalogApi.deleteWorkCategory(id);
      toast.success("Data referensi berhasil dihapus");
      await onRefresh();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus data referensi"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Satuan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Master Satuan</CardTitle>
          <Button size="sm" variant="outline" onClick={() => openUnitModal()}>
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada satuan.</p>
          ) : (
            units.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {u.name} <span className="text-muted-foreground">({u.symbol})</span>
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">{u.code}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={u.isActive ? "default" : "secondary"}>
                    {u.isActive ? "Aktif" : "Off"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit satuan ${u.name}`}
                    onClick={() => openUnitModal(u)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus satuan ${u.name}`}
                    onClick={() => handleDelete("unit", u.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Kategori Material */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Kategori Material &amp; Alat</CardTitle>
          <Button size="sm" variant="outline" onClick={() => openMatCatModal()}>
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {materialCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kategori material.</p>
          ) : (
            materialCategories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.code} • {MATERIAL_GROUP_LABELS[c.group]}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit kategori ${c.name}`}
                    onClick={() => openMatCatModal(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus kategori ${c.name}`}
                    onClick={() => handleDelete("matCat", c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Kategori Pekerjaan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Kategori Pekerjaan &amp; Jasa</CardTitle>
          <Button size="sm" variant="outline" onClick={() => openWorkCatModal()}>
            <Plus className="h-4 w-4" />
            Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {workCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kategori pekerjaan.</p>
          ) : (
            workCategories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.code} • {WORK_TYPE_LABELS[c.type]}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit kategori pekerjaan ${c.name}`}
                    onClick={() => openWorkCatModal(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus kategori pekerjaan ${c.name}`}
                    onClick={() => handleDelete("workCat", c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={
          modal?.type === "unit"
            ? modal.item
              ? "Edit Satuan"
              : "Tambah Satuan"
            : modal?.type === "matCat"
              ? modal.item
                ? "Edit Kategori Material"
                : "Tambah Kategori Material"
              : modal?.item
                ? "Edit Kategori Pekerjaan"
                : "Tambah Kategori Pekerjaan"
        }
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Kode</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          {modal?.type === "unit" && (
            <div className="space-y-1.5">
              <Label>Simbol</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="m2, kg, OH"
                required
              />
            </div>
          )}
          {modal?.type === "matCat" && (
            <div className="space-y-1.5">
              <Label>Grup</Label>
              <Select
                value={group}
                onChange={(e) => setGroup(e.target.value as MaterialCategoryGroup)}
              >
                {Object.entries(MATERIAL_GROUP_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {modal?.type === "workCat" && (
            <div className="space-y-1.5">
              <Label>Tipe Pekerjaan</Label>
              <Select
                value={workType}
                onChange={(e) => setWorkType(e.target.value as WorkCategoryType)}
              >
                {Object.entries(WORK_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Status aktif
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
