import { useEffect, useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  RabStatus,
  StorageProvider,
  type BudgetRealization,
  type Project,
  type RabDocument,
} from "@rab/shared-types";
import { realizationCreateSchema } from "@rab/shared-validation";
import { monitoringApi } from "@/services/api/monitoringApi";
import { filesApi } from "@/services/api/filesApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { isFirebaseClientConfigured, uploadFileToFirebaseStorage } from "@/services/firebase";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const REALIZATION_CATEGORIES = [
  "Material",
  "Tenaga Kerja",
  "Peralatan",
  "Subkontraktor",
  "Operasional",
  "Lainnya",
];

interface RealizationFormModalProps {
  open: boolean;
  onClose: () => void;
  editingItem: BudgetRealization | null;
  projects: Project[];
  finalRabs: RabDocument[];
  onSaved: () => Promise<void>;
}

export function RealizationFormModal({
  open,
  onClose,
  editingItem,
  projects,
  finalRabs,
  onSaved,
}: RealizationFormModalProps) {
  const [projectId, setProjectId] = useState("");
  const [rabDocumentId, setRabDocumentId] = useState("");
  const [category, setCategory] = useState(REALIZATION_CATEGORIES[0]!);
  const [transactionDate, setTransactionDate] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFileId, setEvidenceFileId] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const projectFinalRabs = useMemo(
    () => finalRabs.filter((r) => r.projectId === projectId && r.status === RabStatus.FINAL),
    [finalRabs, projectId],
  );

  useEffect(() => {
    if (!open) return;
    if (editingItem) {
      setProjectId(editingItem.projectId);
      setRabDocumentId(editingItem.rabDocumentId);
      setCategory(editingItem.category);
      setTransactionDate(editingItem.transactionDate);
      setAmount(String(editingItem.amount));
      setReferenceNumber(editingItem.referenceNumber ?? "");
      setDescription(editingItem.description);
      setEvidenceFileId(editingItem.evidenceFileId);
    } else {
      const defaultProject = projects[0]?.id ?? "";
      const firstRab = finalRabs.find(
        (r) => r.projectId === defaultProject && r.status === RabStatus.FINAL,
      );
      setProjectId(defaultProject);
      setRabDocumentId(firstRab?.id ?? "");
      setCategory(REALIZATION_CATEGORIES[0]!);
      setTransactionDate(new Date().toISOString().slice(0, 10));
      setAmount("");
      setReferenceNumber("");
      setDescription("");
      setEvidenceFileId(undefined);
    }
  }, [open, editingItem, projects, finalRabs]);

  const handleProjectChange = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    const firstRab = finalRabs.find(
      (r) => r.projectId === nextProjectId && r.status === RabStatus.FINAL,
    );
    setRabDocumentId(firstRab?.id ?? "");
  };

  const handleUploadEvidence = async (file: File | undefined) => {
    if (!file || !projectId) return;
    if (!isFirebaseClientConfigured()) {
      toast.error("Firebase Storage belum dikonfigurasi pada environment frontend.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFileToFirebaseStorage(file, `monitoring/evidences/${projectId}`);
      const metadata = await filesApi.registerMetadata({
        storageProvider: StorageProvider.FIREBASE_STORAGE,
        ...uploaded,
        entityType: "budget_realizations",
        entityId: projectId,
      });
      setEvidenceFileId(metadata.id);
      toast.success(`Bukti "${file.name}" berhasil diunggah`);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengunggah bukti transaksi"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      projectId,
      rabDocumentId,
      category,
      transactionDate,
      description: description.trim(),
      amount: Number(amount),
      referenceNumber: referenceNumber.trim() || undefined,
      evidenceFileId,
    };

    const parsed = realizationCreateSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data realisasi belum valid");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await monitoringApi.updateRealization(editingItem.id, parsed.data);
        toast.success("Catatan realisasi biaya berhasil diperbarui");
      } else {
        await monitoringApi.createRealization(parsed.data);
        toast.success("Realisasi biaya berhasil dicatat");
      }
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan realisasi biaya"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingItem ? "Edit Realisasi Biaya" : "Catat Realisasi Biaya Baru"}
      description="Realisasi hanya dapat dikaitkan ke dokumen RAB berstatus Final."
      maxWidthClassName="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="real-prj">Proyek</Label>
          <Select
            id="real-prj"
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
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

        <div className="space-y-1.5">
          <Label htmlFor="real-rab">Dokumen RAB Final</Label>
          <Select
            id="real-rab"
            value={rabDocumentId}
            onChange={(e) => setRabDocumentId(e.target.value)}
            required
          >
            <option value="">Pilih RAB Final</option>
            {projectFinalRabs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.documentNumber} — {r.title} ({formatCurrency(r.grandTotal)})
              </option>
            ))}
          </Select>
          {projectId && projectFinalRabs.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Proyek ini belum memiliki dokumen RAB berstatus Final.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="real-cat">Kategori Realisasi</Label>
            <Select id="real-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {REALIZATION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="real-date">Tanggal Transaksi</Label>
            <Input
              id="real-date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="real-amount">Nominal (IDR)</Label>
            <Input
              id="real-amount"
              type="number"
              step="any"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="real-ref">No. Referensi / Kwitansi</Label>
            <Input
              id="real-ref"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="INV / PO / BKK (opsional)"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="real-desc">Keterangan</Label>
          <Textarea
            id="real-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Uraian pengeluaran aktual..."
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>Bukti Dokumen (Opsional)</Label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-xs font-medium hover:bg-muted/40">
            <Upload className="h-4 w-4 text-primary" />
            <span>
              {uploading
                ? "Mengunggah bukti..."
                : evidenceFileId
                  ? "Bukti terlampir (klik untuk ganti)"
                  : "Unggah foto struk / PDF invoice"}
            </span>
            <input
              type="file"
              className="hidden"
              disabled={uploading}
              onChange={(e) => void handleUploadEvidence(e.target.files?.[0])}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saving || projectFinalRabs.length === 0}>
            {saving ? "Menyimpan..." : "Simpan Realisasi"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
