import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Copy, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  AhspAnalysis,
  AhspDetail,
  Material,
  PaginationMeta,
  Unit,
  WorkItem,
} from "@rab/shared-types";
import { ahspApi } from "@/services/api/ahspApi";
import { catalogApi } from "@/services/api/catalogApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { formatCurrency } from "@/utils/formatters";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AhspBuilderModal } from "@/features/ahsp/AhspBuilderModal";
import { AhspCopyModal } from "@/features/ahsp/AhspCopyModal";
import { AhspDetailModal } from "@/features/ahsp/AhspDetailModal";

export function AhspPage() {
  const [items, setItems] = useState<AhspAnalysis[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<AhspDetail | null>(null);
  const [viewingDetail, setViewingDetail] = useState<AhspDetail | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [copySource, setCopySource] = useState<AhspAnalysis | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AhspAnalysis | null>(null);
  const [deleting, setDeleting] = useState(false);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const loadLookups = useCallback(async () => {
    try {
      const [matsRes, worksRes, unitsRes] = await Promise.all([
        catalogApi.listMaterials({ page: 1, limit: 100 }),
        catalogApi.listWorkItems({ page: 1, limit: 100 }),
        catalogApi.listUnits(),
      ]);
      setMaterials(matsRes.items);
      setWorkItems(worksRes.items);
      setUnits(unitsRes);
    } catch {
      // Errors surfaced when opening builder if lookups unavailable
    }
  }, []);

  const fetchAhspList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ahspApi.list({
        page,
        limit: 15,
        search: search.trim() || undefined,
        isActive: statusFilter || undefined,
      });
      setItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat daftar analisis AHSP"));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    void fetchAhspList();
  }, [fetchAhspList]);

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await ahspApi.getById(id);
      setViewingDetail(detail);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memuat detail AHSP"));
    }
  };

  const handleOpenEdit = async (id: string) => {
    try {
      const detail = await ahspApi.getById(id);
      setEditingDetail(detail);
      setBuilderOpen(true);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memuat data AHSP untuk diedit"));
    }
  };

  const handleRecalculate = async (id: string) => {
    setRecalculating(true);
    try {
      const updated = await ahspApi.recalculate(id);
      setViewingDetail(updated);
      toast.success("Harga AHSP berhasil disinkronkan dari katalog");
      await fetchAhspList();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyinkronkan harga AHSP"));
    } finally {
      setRecalculating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ahspApi.remove(deleteTarget.id);
      toast.success("Analisis AHSP berhasil dihapus");
      setDeleteTarget(null);
      await fetchAhspList();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus analisis AHSP"));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<AhspAnalysis>[] = [
    {
      accessorKey: "code",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-semibold">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama Analisis Pekerjaan",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            Satuan: {unitMap.get(row.original.unitId)?.symbol ?? "-"} • v{row.original.version}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "materialTotal",
      header: "Material",
      cell: ({ row }) => formatCurrency(row.original.materialTotal),
    },
    {
      accessorKey: "laborTotal",
      header: "Tenaga Kerja",
      cell: ({ row }) => formatCurrency(row.original.laborTotal),
    },
    {
      accessorKey: "equipmentTotal",
      header: "Peralatan",
      cell: ({ row }) => formatCurrency(row.original.equipmentTotal),
    },
    {
      accessorKey: "unitPriceTotal",
      header: "Harga Satuan",
      cell: ({ row }) => (
        <span className="font-semibold text-primary">
          {formatCurrency(row.original.unitPriceTotal)}
        </span>
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
            title="Lihat Detail Analisis"
            aria-label={`Detail analisis ${row.original.name}`}
            onClick={() => handleViewDetail(row.original.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Edit Analisis"
            aria-label={`Edit analisis ${row.original.name}`}
            onClick={() => handleOpenEdit(row.original.id)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Salin Analisis"
            aria-label={`Salin analisis ${row.original.name}`}
            onClick={() => setCopySource(row.original)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Hapus Analisis"
            aria-label={`Hapus analisis ${row.original.name}`}
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
        title="Analisis Harga Satuan (AHSP)"
        description="Susun koefisien material, tenaga kerja, dan peralatan untuk menghitung harga satuan pekerjaan secara otomatis di backend."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingDetail(null);
              setBuilderOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Buat Analisis AHSP
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3 max-w-2xl">
        <div className="relative sm:col-span-2">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Cari kode, nama analisis, atau referensi SNI..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
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

      {error ? (
        <ErrorState message={error} onRetry={fetchAhspList} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          emptyTitle="Belum ada analisis AHSP"
          emptyDescription="Buat analisis pekerjaan dengan memilih item pekerjaan dari katalog serta komponen material, tenaga kerja, dan peralatan."
        />
      )}

      <AhspBuilderModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        editingDetail={editingDetail}
        materials={materials}
        workItems={workItems}
        units={units}
        onSaved={fetchAhspList}
      />

      <AhspDetailModal
        detail={viewingDetail}
        onClose={() => setViewingDetail(null)}
        onRecalculate={handleRecalculate}
        recalculating={recalculating}
      />

      <AhspCopyModal
        source={copySource}
        workItems={workItems}
        onClose={() => setCopySource(null)}
        onCopied={fetchAhspList}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Hapus Analisis AHSP"
        description={`Yakin ingin menghapus analisis "${deleteTarget?.name}" (${deleteTarget?.code})? AHSP yang sudah dipakai pada dokumen RAB tidak dapat dihapus.`}
      />
    </div>
  );
}

export default AhspPage;
