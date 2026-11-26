import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PaginationMeta, Project } from "@rab/shared-types";
import { projectsApi } from "@/services/api/projectsApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_VARIANTS } from "@/features/projects/labels";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";

export function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsApi.list({
        page,
        limit: 15,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setItems(res.items);
      setMeta(res.meta);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat daftar proyek"));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await projectsApi.remove(deleteTarget.id);
      toast.success("Proyek berhasil dihapus");
      setDeleteTarget(null);
      await fetchProjects();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus proyek"));
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "code",
      header: "Kode Proyek",
      cell: ({ row }) => (
        <Link
          to={`/projects/${row.original.id}`}
          className="font-mono text-xs font-semibold text-primary hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: "name",
      header: "Nama & Lokasi",
      cell: ({ row }) => (
        <div>
          <Link to={`/projects/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
          <p className="text-xs text-muted-foreground">{row.original.location}</p>
        </div>
      ),
    },
    {
      accessorKey: "ownerName",
      header: "Pemilik & PIC",
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.ownerName}</p>
          <p className="text-xs text-muted-foreground">PIC: {row.original.picName}</p>
        </div>
      ),
    },
    {
      id: "schedule",
      header: "Jadwal",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.startDate} s/d {row.original.targetEndDate}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={PROJECT_STATUS_VARIANTS[row.original.status]}>
          {PROJECT_STATUS_LABELS[row.original.status]}
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
            asChild
            title="Detail Proyek"
            aria-label={`Detail proyek ${row.original.name}`}
          >
            <Link to={`/projects/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Edit Proyek"
            aria-label={`Edit proyek ${row.original.name}`}
            onClick={() => {
              setEditingProject(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Hapus Proyek"
            aria-label={`Hapus proyek ${row.original.name}`}
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
        title="Data Proyek"
        description="Kelola daftar proyek perusahaan, penanggung jawab, jadwal, status, dan dokumentasi proyek."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditingProject(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Tambah Proyek
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3 max-w-2xl">
        <div className="relative sm:col-span-2">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Cari kode, nama proyek, lokasi, pemilik, atau PIC..."
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
          {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchProjects} />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          pagination={meta}
          onPageChange={setPage}
          emptyTitle="Belum ada proyek terdaftar"
          emptyDescription="Tambahkan proyek perusahaan untuk mulai menyusun RAB dan memantau realisasi anggaran."
        />
      )}

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingProject={editingProject}
        onSaved={fetchProjects}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Hapus Proyek"
        description={`Yakin ingin menghapus proyek "${deleteTarget?.name}" (${deleteTarget?.code})? Proyek yang sudah memiliki dokumen RAB atau realisasi tidak dapat dihapus.`}
      />
    </div>
  );
}

export default ProjectsPage;
