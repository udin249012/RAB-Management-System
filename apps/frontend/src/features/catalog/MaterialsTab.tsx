import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, History, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  StorageProvider,
  type Material,
  type MaterialCategory,
  type PaginationMeta,
  type Unit,
} from "@rab/shared-types";
import { materialCreateSchema, type MaterialCreateInput } from "@rab/shared-validation";
import { catalogApi, type MaterialImportResponse } from "@/services/api/catalogApi";
import { filesApi } from "@/services/api/filesApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { isFirebaseClientConfigured, uploadFileToFirebaseStorage } from "@/services/firebase";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MATERIAL_GROUP_LABELS } from "./labels";

interface MaterialsTabProps {
  units: Unit[];
  categories: MaterialCategory[];
}

export function MaterialsTab({ units, categories }: MaterialsTabProps) {
  const [items, setItems] = useState<Material[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Material | null>(null);
  const [priceReason, setPriceReason] = useState("");
  const [photoFileId, setPhotoFileId] = useState<string | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const [historyItem, setHistoryItem] = useState<Material | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<MaterialImportResponse | null>(null);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.listMaterials({
        page,
        limit: 15,
        search: search.trim() || undefined,
        categoryId: categoryFilter || undefined,
        isActive: statusFilter || undefined,
      });
      setItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat katalog material"));
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    void fetchMaterials();
  }, [fetchMaterials]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(materialCreateSchema),
    defaultValues: {
      code: "",
      name: "",
      categoryId: "",
      unitId: "",
      unitPrice: 0,
      brand: "",
      specification: "",
      description: "",
      supplier: "",
      isActive: true,
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setPriceReason("");
    setPhotoFileId(undefined);
    reset({
      code: "",
      name: "",
      categoryId: categories[0]?.id ?? "",
      unitId: units[0]?.id ?? "",
      unitPrice: 0,
      brand: "",
      specification: "",
      description: "",
      supplier: "",
      isActive: true,
    });
    setFormOpen(true);
  };

  const openEditModal = (item: Material) => {
    setEditingItem(item);
    setPriceReason("");
    setPhotoFileId(item.photoFileId);
    reset({
      code: item.code,
      name: item.name,
      categoryId: item.categoryId,
      unitId: item.unitId,
      unitPrice: item.unitPrice,
      brand: item.brand ?? "",
      specification: item.specification ?? "",
      description: item.description ?? "",
      supplier: item.supplier ?? "",
      isActive: item.isActive,
    });
    setFormOpen(true);
  };

  const handleUploadPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!isFirebaseClientConfigured()) {
      toast.error("Firebase Storage belum dikonfigurasi pada environment frontend.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadFileToFirebaseStorage(file, "catalog/materials");
      const meta = await filesApi.registerMetadata({
        storageProvider: StorageProvider.FIREBASE_STORAGE,
        ...uploaded,
        entityType: "materials",
        entityId: editingItem?.id ?? "draft",
      });
      setPhotoFileId(meta.id);
      toast.success(`Foto "${file.name}" berhasil diunggah`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengunggah foto item"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmitForm = async (values: MaterialCreateInput) => {
    setSaving(true);
    try {
      if (editingItem) {
        await catalogApi.updateMaterial(editingItem.id, {
          ...values,
          photoFileId,
          priceChangeReason: priceReason.trim() || undefined,
        });
        toast.success("Item katalog berhasil diperbarui");
      } else {
        await catalogApi.createMaterial({ ...values, photoFileId });
        toast.success("Item katalog berhasil ditambahkan");
      }
      setFormOpen(false);
      await fetchMaterials();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan item katalog"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await catalogApi.deleteMaterial(deleteTarget.id);
      toast.success("Item katalog berhasil dihapus");
      setDeleteTarget(null);
      await fetchMaterials();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus item katalog"));
    } finally {
      setDeleting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const blob = await catalogApi.exportMaterialsExcel();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "katalog-material.xlsx";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Katalog berhasil diekspor ke Excel");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengekspor Excel"));
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      toast.error("Pilih file .xlsx terlebih dahulu");
      return;
    }
    setImporting(true);
    try {
      const result = await catalogApi.importMaterialsExcel(importFile);
      setImportResult(result);
      toast.success(
        `Import selesai: ${result.createdCount} baru, ${result.updatedCount} diperbarui`,
      );
      await fetchMaterials();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengimpor file Excel"));
    } finally {
      setImporting(false);
    }
  };

  const columns: ColumnDef<Material>[] = [
    {
      accessorKey: "code",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Material / Peralatan",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {(row.original.brand || row.original.specification) && (
            <p className="text-xs text-muted-foreground">
              {[row.original.brand, row.original.specification].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: "Kategori",
      cell: ({ row }) => {
        const cat = categoryMap.get(row.original.categoryId);
        return cat ? (
          <div>
            <p className="text-sm">{cat.name}</p>
            <p className="text-xs text-muted-foreground">{MATERIAL_GROUP_LABELS[cat.group]}</p>
          </div>
        ) : (
          "-"
        );
      },
    },
    {
      id: "unit",
      header: "Satuan",
      cell: ({ row }) => unitMap.get(row.original.unitId)?.symbol ?? "-",
    },
    {
      accessorKey: "unitPrice",
      header: "Harga Satuan",
      cell: ({ row }) => (
        <span className="font-medium">{formatCurrency(row.original.unitPrice)}</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Aktif" : "Nonaktif"}
        </Badge>
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
            title="Riwayat Perubahan Harga"
            aria-label={`Riwayat harga ${row.original.name}`}
            onClick={() => setHistoryItem(row.original)}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Edit Item"
            aria-label={`Edit item ${row.original.name}`}
            onClick={() => openEditModal(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Hapus Item"
            aria-label={`Hapus item ${row.original.name}`}
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-2 sm:grid-cols-3 flex-1">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
            <Input
              placeholder="Cari kode, nama, merek, supplier..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setImportOpen(true);
            }}
          >
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Tambah Item
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchMaterials} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          emptyTitle="Belum ada item material atau peralatan"
          emptyDescription="Tambahkan item katalog secara manual atau melalui fitur Import Excel."
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? "Edit Material / Peralatan" : "Tambah Material / Peralatan"}
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mat-code">Kode Item</Label>
              <Input id="mat-code" placeholder="MAT-001" {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-name">Nama Item</Label>
              <Input id="mat-name" placeholder="Semen Portland 50kg" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mat-cat">Kategori</Label>
              <Select id="mat-cat" {...register("categoryId")}>
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
              {errors.categoryId && (
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-unit">Satuan</Label>
              <Select id="mat-unit" {...register("unitId")}>
                <option value="">Pilih Satuan</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </Select>
              {errors.unitId && <p className="text-xs text-destructive">{errors.unitId.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mat-price">Harga Satuan (IDR)</Label>
              <Input id="mat-price" type="number" step="any" {...register("unitPrice")} />
              {errors.unitPrice && (
                <p className="text-xs text-destructive">{errors.unitPrice.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-brand">Merek</Label>
              <Input id="mat-brand" placeholder="Opsional" {...register("brand")} />
            </div>
          </div>

          {editingItem && (
            <div className="space-y-1.5">
              <Label htmlFor="mat-reason">Alasan Perubahan Harga (jika harga diubah)</Label>
              <Input
                id="mat-reason"
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                placeholder="Mis. Penyesuaian harga supplier kuartal ini"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mat-spec">Spesifikasi</Label>
              <Input
                id="mat-spec"
                placeholder="SNI / ukuran / tipe"
                {...register("specification")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-supplier">Supplier</Label>
              <Input id="mat-supplier" placeholder="Nama vendor/toko" {...register("supplier")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mat-desc">Deskripsi</Label>
            <Textarea id="mat-desc" rows={2} {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label>Foto Item (Opsional)</Label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-2 text-xs font-medium hover:bg-muted/40">
              <Upload className="h-4 w-4 text-primary" />
              <span>
                {uploadingPhoto
                  ? "Mengunggah foto..."
                  : photoFileId
                    ? "Foto terunggah (klik untuk ganti)"
                    : "Unggah foto material/peralatan"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingPhoto}
                onChange={(e) => void handleUploadPhoto(e.target.files?.[0])}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded" {...register("isActive")} />
            Item berstatus aktif dan dapat dipilih pada AHSP / RAB
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Price History Modal */}
      <Modal
        open={Boolean(historyItem)}
        onClose={() => setHistoryItem(null)}
        title={`Riwayat Harga: ${historyItem?.name ?? ""}`}
      >
        <div className="space-y-3">
          {historyItem?.priceHistory?.length ? (
            <div className="divide-y rounded-lg border">
              {historyItem.priceHistory.map((entry, idx) => (
                <div key={idx} className="p-3 text-sm flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(entry.previousPrice)} → {formatCurrency(entry.newPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.reason || "Perubahan harga"} • oleh {entry.changedBy}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDateTime(entry.changedAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan harga.</p>
          )}
        </div>
      </Modal>

      {/* Import Excel Modal */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Katalog Material dari Excel"
        description="Gunakan format kolom yang sama dengan hasil Export Excel (Kode Item, Nama Item, Kode Kategori, Nama Kategori, Kode Satuan, Harga Satuan, Merek, Spesifikasi, Supplier, Status)."
      >
        <div className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          />

          {importResult && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-semibold">Ringkasan Import:</p>
              <p>
                Baru: {importResult.createdCount} | Diperbarui: {importResult.updatedCount} |
                Dilewati: {importResult.skippedCount}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="list-disc pl-4 text-destructive mt-2 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((e) => (
                    <li key={e.row}>
                      Baris {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
              Tutup
            </Button>
            <Button type="button" onClick={handleImportExcel} disabled={importing || !importFile}>
              {importing ? "Mengimpor..." : "Mulai Import"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Hapus Item Katalog"
        description={`Apakah Anda yakin ingin menghapus "${deleteTarget?.name}" (${deleteTarget?.code})? Item yang sudah dipakai pada AHSP tidak dapat dihapus.`}
      />
    </div>
  );
}
