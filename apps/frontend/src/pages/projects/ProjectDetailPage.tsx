import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, MapPin, Trash2, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { StorageProvider, type ProjectDetail, type ProjectStatus } from "@rab/shared-types";
import { projectsApi } from "@/services/api/projectsApi";
import { filesApi } from "@/services/api/filesApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { isFirebaseClientConfigured, uploadFileToFirebaseStorage } from "@/services/firebase";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_VARIANTS } from "@/features/projects/labels";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await projectsApi.getById(id);
      setProject(detail);
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat detail proyek"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!project) return;
    try {
      await projectsApi.update(project.id, { status: newStatus });
      toast.success("Status proyek diperbarui");
      await fetchDetail();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengubah status proyek"));
    }
  };

  const handleUploadDocument = async (file: File | undefined) => {
    if (!file || !project) return;
    if (!isFirebaseClientConfigured()) {
      toast.error("Firebase Storage belum dikonfigurasi pada environment frontend.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFileToFirebaseStorage(file, `projects/documents/${project.id}`);
      const metadata = await filesApi.registerMetadata({
        storageProvider: StorageProvider.FIREBASE_STORAGE,
        ...uploaded,
        entityType: "projects",
        entityId: project.id,
      });
      await projectsApi.update(project.id, {
        documentFileIds: [...(project.documentFileIds ?? []), metadata.id],
      });
      toast.success("Dokumentasi proyek berhasil diunggah");
      await fetchDetail();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengunggah dokumentasi proyek"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = async (fileId: string) => {
    if (!project) return;
    try {
      await projectsApi.update(project.id, {
        documentFileIds: (project.documentFileIds ?? []).filter((fid) => fid !== fileId),
      });
      await filesApi.removeMetadata(fileId);
      toast.success("Dokumen dihapus dari proyek");
      await fetchDetail();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus dokumen"));
    }
  };

  if (loading) return <LoadingState rows={5} />;
  if (error || !project) {
    return <ErrorState message={error ?? "Proyek tidak ditemukan"} onRetry={fetchDetail} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${project.code} — ${project.name}`}
        description={project.location}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/projects">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Daftar Proyek
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Informasi Proyek</CardTitle>
              <CardDescription>Identitas, pemilik, penanggung jawab, dan jadwal</CardDescription>
            </div>
            <Badge variant={PROJECT_STATUS_VARIANTS[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Pemilik Proyek</p>
                  <p className="font-medium">{project.ownerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Penanggung Jawab</p>
                  <p className="font-medium">{project.picName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Lokasi</p>
                  <p className="font-medium">{project.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Periode Pelaksanaan</p>
                  <p className="font-medium">
                    {project.startDate} s/d {project.targetEndDate}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
              <p className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {project.description || "Tidak ada deskripsi tambahan."}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <span className="text-xs font-medium text-muted-foreground">Ubah Status:</span>
              <div className="w-52">
                <Select
                  value={project.status}
                  onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                >
                  {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dokumentasi Proyek</CardTitle>
            <CardDescription>Foto dan dokumen pendukung proyek</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors">
              <Upload className="h-4 w-4 text-primary" />
              <span>{uploading ? "Mengunggah..." : "Unggah Foto / Dokumen"}</span>
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void handleUploadDocument(e.target.files?.[0])}
              />
            </label>

            {project.documents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada dokumentasi proyek terunggah.
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {project.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-2 p-2.5 text-xs"
                  >
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 truncate text-primary hover:underline"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.originalName}</span>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus dokumen ${doc.originalName}`}
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
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

export default ProjectDetailPage;
