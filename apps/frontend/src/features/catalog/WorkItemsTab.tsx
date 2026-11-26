import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PaginationMeta, Unit, WorkCategory, WorkItem } from "@rab/shared-types";
import { workItemCreateSchema, type WorkItemCreateInput } from "@rab/shared-validation";
import { catalogApi } from "@/services/api/catalogApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency } from "@/utils/formatters";
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
import { WORK_TYPE_LABELS } from "./labels";

interface WorkItemsTabProps {
  units: Unit[];
  categories: WorkCategory[];
}

export function WorkItemsTab({ units, categories }: WorkItemsTabProps) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const fetchWorkItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await catalogApi.listWorkItems({
        page,
        limit: 15,
        search: search.trim() || undefined,
        categoryId: categoryFilter || undefined,
        isActive: statusFilter || undefined,
      });
      setItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat katalog pekerjaan"));
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    void fetchWorkItems();
  }, [fetchWorkItems]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(workItemCreateSchema),
    defaultValues: {
      code: "",
      name: "",
      categoryId: "",
      unitId: "",
      description: "",
      basePrice: undefined,
      isActive: true,
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    reset({
      code: "",
      name: "",
      categoryId: categories[0]?.id ?? "",
      unitId: units[0]?.id ?? "",
      description: "",
      basePrice: undefined,
      isActive: true,
    });
    setFormOpen(true);
  };

  const openEditModal = (item: WorkItem) => {
    setEditingItem(item);
    reset({
      code: item.code,
      name: item.name,
      categoryId: item.categoryId,
      unitId: item.unitId,
      description: item.description ?? "",
      basePrice: item.basePrice,
      isActive: item.isActive,
    });
    setFormOpen(true);
  };

  const onSubmitForm = async (values: WorkItemCreateInput) => {
    setSaving(true);
    try {
      if (editingItem) {
        await catalogApi.updateWorkItem(editingItem.id, values);
        toast.success("Item pekerjaan berhasil diperbarui");
      } else {
        await catalogApi.createWorkItem(values);
        toast.success("Item pekerjaan berhasil ditambahkan");
      }
      setFormOpen(false);
      await fetchWorkItems();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan item pekerjaan"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await catalogApi.deleteWorkItem(deleteTarget.id);
      toast.success("Item pekerjaan berhasil dihapus");
      setDeleteTarget(null);
      await fetchWorkItems();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus item pekerjaan"));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<WorkItem>[] = [
    {
      accessorKey: "code",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama Pekerjaan / Jasa",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>
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
            <p className="text-xs text-muted-foreground">{WORK_TYPE_LABELS[cat.type]}</p>
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
      accessorKey: "basePrice",
      header: "Harga Dasar",
      cell: ({ row }) =>
        row.original.basePrice !== undefined ? formatCurrency(row.original.basePrice) : "-",
    },
    {
      id: "ahsp",
      header: "AHSP",
      cell: ({ row }) => (
        <Badge variant={row.original.ahspId ? "accent" : "outline"}>
          {row.original.ahspId ? "Terhubung AHSP" : "Belum Ada AHSP"}
        </Badge>
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
            aria-label={`Edit pekerjaan ${row.original.name}`}
            onClick={() => openEditModal(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Hapus pekerjaan ${row.original.name}`}
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
              placeholder="Cari kode atau nama pekerjaan..."
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

        <Button size="sm" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Tambah Pekerjaan
        </Button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchWorkItems} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          emptyTitle="Belum ada katalog pekerjaan atau jasa"
          emptyDescription="Tambahkan item pekerjaan, jasa teknis, atau tenaga kerja untuk dihubungkan ke modul AHSP."
        />
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingItem ? "Edit Item Pekerjaan / Jasa" : "Tambah Item Pekerjaan / Jasa"}
      >
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="work-code">Kode Pekerjaan</Label>
              <Input id="work-code" placeholder="PKJ-001" {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="work-name">Nama Pekerjaan / Jasa</Label>
              <Input
                id="work-name"
                placeholder="Pemasangan Dinding Bata Merah"
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="work-cat">Kategori Pekerjaan</Label>
              <Select id="work-cat" {...register("categoryId")}>
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
              <Label htmlFor="work-unit">Satuan</Label>
              <Select id="work-unit" {...register("unitId")}>
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

          <div className="space-y-1.5">
            <Label htmlFor="work-base-price">
              Harga Dasar (Opsional, mis. untuk tenaga kerja/jasa)
            </Label>
            <Input id="work-base-price" type="number" step="any" {...register("basePrice")} />
            {errors.basePrice && (
              <p className="text-xs text-destructive">{errors.basePrice.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="work-desc">Deskripsi</Label>
            <Textarea id="work-desc" rows={2} {...register("description")} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 rounded" {...register("isActive")} />
            Pekerjaan berstatus aktif
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Hapus Item Pekerjaan"
        description={`Apakah Anda yakin ingin menghapus pekerjaan "${deleteTarget?.name}" (${deleteTarget?.code})?`}
      />
    </div>
  );
}
