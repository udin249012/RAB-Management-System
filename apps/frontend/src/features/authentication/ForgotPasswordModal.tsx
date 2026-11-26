import { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";
import { z } from "zod";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/services/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

interface ForgotPasswordModalProps {
  open: boolean;
  initialEmail: string;
  onClose: () => void;
}

const resetEmailSchema = z.string().trim().email("Masukkan alamat email administrator yang valid");

export function ForgotPasswordModal({ open, initialEmail, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
    }
  }, [open, initialEmail]);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = resetEmailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Email tidak valid");
      return;
    }

    if (!isFirebaseClientConfigured()) {
      toast.error("Konfigurasi Firebase Client belum diatur pada environment.");
      return;
    }

    setSending(true);
    try {
      const auth = getFirebaseClientAuth();
      await sendPasswordResetEmail(auth, parsed.data);
      toast.success("Tautan reset password telah dikirim jika email terdaftar.");
      onClose();
    } catch {
      toast.error("Gagal mengirim email reset password. Hubungi administrator IT internal.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset Password Administrator"
      description="Tautan reset password akan dikirim melalui Firebase Authentication ke email administrator yang terdaftar."
      maxWidthClassName="max-w-sm"
    >
      <form onSubmit={handleSendReset} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reset-email-input">Email Administrator</Label>
          <Input
            id="reset-email-input"
            type="email"
            placeholder="admin@perusahaan.co.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" size="sm" disabled={sending}>
            {sending ? "Mengirim..." : "Kirim Tautan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
