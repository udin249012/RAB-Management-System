import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { CopyPlus, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RabStatus, type PaginationMeta, type Project, type RabDocument } from "@rab/shared-types";
import { rabApi } from "@/services/api/rabApi";
import { projectsApi } from "@/services/api/projectsApi";
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
import { RAB_STATUS_LABELS, RAB_STATUS_VARIANTS } from "@/features/rab/labels";

export function RabListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<RabDocument[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<RabDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  useEffect(() => {
    void projectsApi
      .list({ page: 1, limit: 100 })
      .then((res) => setProjects(res.items))
      .catch(() => {});
  }, []);

  const fetchRabs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rabApi.list({
        page,
        limit: 15,
        search: search.trim() || undefined,
        projectId: projectFilter || undefined,
        status: statusFilter || undefined,
      });
      setItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat daftar dokumen RAB"));
    } finally {
      setLoading(false);
    }
  }, [page, search, projectFilter, statusFilter]);

  useEffect(() => {
    void fetchRabs();
  }, [fetchRabs]);

  const handleCreateRevision = async (rabId: string) => {
    try {
      const rev = await rabApi.createRevision(rabId);
      toast.success(`Revisi v${rev.version} (${rev.documentNumber}) berhasil dibuat`);
      navigate(`/rab/${rev.id}/edit`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal membuat revisi RAB"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await rabApi.remove(deleteTarget.id);
      toast.success("Dokumen RAB berhasil dihapus");
      setDeleteTarget(null);
      await fetchRabs();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus dokumen RAB"));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<RabDocument>[] = [
    {
      accessorKey: "documentNumber",
      header: "No. Dokumen",
      cell: ({ row }) => (
        <Link
          to={`/rab/${row.original.id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.original.documentNumber}
        </Link>
      ),
    },
    {
      accessorKey: "title",
      header: "Judul RAB & Proyek",
      cell: ({ row }) => {
        const prj = projectMap.get(row.original.projectId);
        return (
          <div>
            <Link to={`/rab/${row.original.id}`} className="font-medium hover:underline">
              {row.original.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              {prj ? `${prj.code} — ${prj.name}` : row.original.projectId} • v{row.original.version}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "documentDate",
      header: "Tanggal",
      cell: ({ row }) => <span className="text-xs">{row.original.documentDate}</span>,
    },
    {
      accessorKey: "grandTotal",
      header: "Grand Total",
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.grandTotal)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={RAB_STATUS_VARIANTS[row.original.status]}>
          {RAB_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const isImmutable =
          row.original.status === RabStatus.FINAL || row.original.status === RabStatus.ARCHIVED;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              asChild
              title="Detail Dokumen RAB"
              aria-label={`Detail RAB ${row.original.documentNumber}`}
            >
              <Link to={`/rab/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {!isImmutable && (
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="Edit RAB"
                aria-label={`Edit RAB ${row.original.documentNumber}`}
              >
                <Link to={`/rab/${row.original.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              title="Buat Revisi Baru"
              aria-label={`Buat revisi ${row.original.documentNumber}`}
              onClick={() => handleCreateRevision(row.original.id)}
            >
              <CopyPlus className="h-4 w-4" />
            </Button>
            {!isImmutable && (
              <Button
                variant="ghost"
                size="icon"
                title="Hapus RAB"
                aria-label={`Hapus RAB ${row.original.documentNumber}`}
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen RAB"
        description="Susun Rencana Anggaran Biaya secara manual maupun otomatis berbasis AHSP dengan snapshot harga dan riwayat revisi."
        actions={
          <Button size="sm" asChild>
            <Link to="/rab/new">
              <Plus className="h-4 w-4" />
              Buat RAB Baru
            </Link>
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Cari nomor dokumen atau judul RAB..."
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
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Status</option>
          {Object.entries(RAB_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchRabs} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          emptyTitle="Belum ada dokumen RAB"
          emptyDescription="Buat dokumen RAB pertama Anda dengan memilih proyek dan menambahkan item manual atau berbasis AHSP."
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Hapus Dokumen RAB"
        description={`Yakin ingin menghapus dokumen "${deleteTarget?.documentNumber}"? Dokumen Final, Arsip, atau yang sudah memiliki realisasi anggaran tidak dapat dihapus.`}
      />
    </div>
  );
}

export default RabListPage;
