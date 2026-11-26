import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ProjectStatus, type Project } from "@rab/shared-types";
import { projectCreateSchema } from "@rab/shared-validation";
import { projectsApi } from "@/services/api/projectsApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_STATUS_LABELS } from "./labels";

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  editingProject: Project | null;
  onSaved: () => Promise<void>;
}

export function ProjectFormModal({
  open,
  onClose,
  editingProject,
  onSaved,
}: ProjectFormModalProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: "",
      location: "",
      ownerName: "",
      picName: "",
      startDate: "",
      targetEndDate: "",
      description: "",
      status: ProjectStatus.PLANNING,
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editingProject) {
      reset({
        name: editingProject.name,
        location: editingProject.location,
        ownerName: editingProject.ownerName,
        picName: editingProject.picName,
        startDate: editingProject.startDate,
        targetEndDate: editingProject.targetEndDate,
        description: editingProject.description,
        status: editingProject.status,
      });
    } else {
      const today = new Date().toISOString().slice(0, 10);
      reset({
        name: "",
        location: "",
        ownerName: "",
        picName: "",
        startDate: today,
        targetEndDate: today,
        description: "",
        status: ProjectStatus.PLANNING,
      });
    }
  }, [open, editingProject, reset]);

  const onSubmit = async (values: {
    name: string;
    location: string;
    ownerName: string;
    picName: string;
    startDate: string;
    targetEndDate: string;
    description: string;
    status: ProjectStatus;
  }) => {
    setSaving(true);
    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, values);
        toast.success("Data proyek berhasil diperbarui");
      } else {
        await projectsApi.create({ ...values, documentFileIds: [] });
        toast.success("Proyek baru berhasil dibuat dengan kode otomatis");
      }
      onClose();
      await onSaved();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan proyek"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingProject ? `Edit Proyek: ${editingProject.code}` : "Tambah Proyek Baru"}
      description={
        editingProject
          ? "Perbarui informasi, jadwal, atau status proyek."
          : "Kode proyek akan dibuat secara otomatis oleh sistem."
      }
      maxWidthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="prj-name">Nama Proyek</Label>
          <Input
            id="prj-name"
            placeholder="Pembangunan Gedung Operasional Utama"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prj-location">Lokasi Proyek</Label>
            <Input id="prj-location" placeholder="Jakarta Selatan" {...register("location")} />
            {errors.location && (
              <p className="text-xs text-destructive">{errors.location.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prj-status">Status Proyek</Label>
            <Select id="prj-status" {...register("status")}>
              {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prj-owner">Pemilik Proyek</Label>
            <Input id="prj-owner" placeholder="PT / Instansi Pemilik" {...register("ownerName")} />
            {errors.ownerName && (
              <p className="text-xs text-destructive">{errors.ownerName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prj-pic">Penanggung Jawab (PIC)</Label>
            <Input id="prj-pic" placeholder="Nama Manajer Proyek" {...register("picName")} />
            {errors.picName && <p className="text-xs text-destructive">{errors.picName.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="prj-start">Tanggal Mulai</Label>
            <Input id="prj-start" type="date" {...register("startDate")} />
            {errors.startDate && (
              <p className="text-xs text-destructive">{errors.startDate.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prj-end">Target Selesai</Label>
            <Input id="prj-end" type="date" {...register("targetEndDate")} />
            {errors.targetEndDate && (
              <p className="text-xs text-destructive">{errors.targetEndDate.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prj-desc">Deskripsi Proyek</Label>
          <Textarea
            id="prj-desc"
            rows={3}
            placeholder="Ruang lingkup pekerjaan..."
            {...register("description")}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Proyek"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
