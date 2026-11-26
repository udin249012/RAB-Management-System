import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AhspAnalysis, WorkItem } from "@rab/shared-types";
import { ahspApi } from "@/services/api/ahspApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

interface AhspCopyModalProps {
  source: AhspAnalysis | null;
  workItems: WorkItem[];
  onClose: () => void;
  onCopied: () => Promise<void>;
}

export function AhspCopyModal({ source, workItems, onClose, onCopied }: AhspCopyModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [workItemId, setWorkItemId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!source) return;
    setCode(`${source.code}-COPY`);
    setName(`${source.name} (Salinan)`);
    setWorkItemId(source.workItemId);
  }, [source]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source) return;
    setSaving(true);
    try {
      await ahspApi.copy(source.id, {
        code: code.trim(),
        name: name.trim() || undefined,
        workItemId: workItemId || undefined,
      });
      toast.success("Analisis AHSP berhasil disalin");
      onClose();
      await onCopied();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyalin analisis AHSP"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(source)}
      onClose={onClose}
      title={`Salin Analisis: ${source?.code ?? ""}`}
      maxWidthClassName="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="copy-code">Kode AHSP Baru</Label>
          <Input id="copy-code" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="copy-name">Nama Analisis Baru</Label>
          <Input id="copy-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="copy-work">Pekerjaan Tujuan</Label>
          <Select id="copy-work" value={workItemId} onChange={(e) => setWorkItemId(e.target.value)}>
            {workItems.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyalin..." : "Salin AHSP"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
