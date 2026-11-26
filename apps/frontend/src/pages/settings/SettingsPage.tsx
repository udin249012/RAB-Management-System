import { useCallback, useEffect, useState } from "react";
import { Archive, ExternalLink, Moon, Save, ShieldCheck, Sun, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { StorageProvider, type AdminUser, type FileMetadata } from "@rab/shared-types";
import { companySettingsUpdateSchema } from "@rab/shared-validation";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useAuthStore } from "@/features/authentication/authStore";
import { filesApi } from "@/services/api/filesApi";
import { settingsApi } from "@/services/api/settingsApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { isFirebaseClientConfigured, uploadFileToFirebaseStorage } from "@/services/firebase";
import { formatDateTime } from "@/utils/formatters";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const currentAdmin = useAuthStore((s) => s.admin);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Company Settings state
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logoFileId, setLogoFileId] = useState<string | undefined>();
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [currency, setCurrency] = useState("IDR");
  const [projectCodeFormat, setProjectCodeFormat] = useState("PRJ-{YYYY}-{SEQ}");
  const [rabNumberFormat, setRabNumberFormat] = useState("RAB/{YYYY}/{MM}/{SEQ}");
  const [defaultTaxPercent, setDefaultTaxPercent] = useState("11");
  const [defaultOverheadPercent, setDefaultOverheadPercent] = useState("10");
  const [defaultProfitPercent, setDefaultProfitPercent] = useState("5");

  // Admin & Archives state
  const [displayName, setDisplayName] = useState(currentAdmin?.displayName ?? "");
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [archives, setArchives] = useState<FileMetadata[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settings, adminList, archiveList] = await Promise.all([
        settingsApi.getSettings(),
        settingsApi.listAdmins(),
        filesApi.listArchives(),
      ]);

      setCompanyName(settings.companyName);
      setAddress(settings.address);
      setPhone(settings.phone);
      setEmail(settings.email);
      setLogoFileId(settings.logoFileId);
      setLogoUrl(settings.logoUrl);
      setCurrency(settings.currency);
      setProjectCodeFormat(settings.projectCodeFormat);
      setRabNumberFormat(settings.rabNumberFormat);
      setDefaultTaxPercent(String(settings.defaultTaxPercent));
      setDefaultOverheadPercent(String(settings.defaultOverheadPercent));
      setDefaultProfitPercent(String(settings.defaultProfitPercent));

      setAdmins(adminList);
      setArchives(archiveList);
      if (currentAdmin) {
        setDisplayName(currentAdmin.displayName);
      }
    } catch (err) {
      setError(extractApiErrorMessage(err, "Gagal memuat pengaturan sistem"));
    } finally {
      setLoading(false);
    }
  }, [currentAdmin]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleUploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!isFirebaseClientConfigured()) {
      toast.error("Firebase Storage belum dikonfigurasi pada environment frontend.");
      return;
    }

    setUploadingLogo(true);
    try {
      const uploaded = await uploadFileToFirebaseStorage(file, "company/logo");
      const meta = await filesApi.registerMetadata({
        storageProvider: StorageProvider.FIREBASE_STORAGE,
        ...uploaded,
        entityType: "company_settings",
        entityId: "default",
      });
      setLogoFileId(meta.id);
      setLogoUrl(meta.url);
      toast.success("Logo berhasil diunggah. Klik Simpan Pengaturan untuk menerapkannya.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal mengunggah logo perusahaan"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      companyName: companyName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      logoFileId,
      currency: currency.trim().toUpperCase(),
      projectCodeFormat: projectCodeFormat.trim(),
      rabNumberFormat: rabNumberFormat.trim(),
      defaultTaxPercent: Number(defaultTaxPercent),
      defaultOverheadPercent: Number(defaultOverheadPercent),
      defaultProfitPercent: Number(defaultProfitPercent),
    };

    const parsed = companySettingsUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Pengaturan perusahaan belum valid");
      return;
    }

    setSavingSettings(true);
    try {
      const updated = await settingsApi.updateSettings(parsed.data);
      setLogoUrl(updated.logoUrl);
      toast.success("Pengaturan perusahaan berhasil disimpan");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menyimpan pengaturan perusahaan"));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await settingsApi.updateMyProfile({ displayName: displayName.trim() });
      setAuthenticated(updated);
      toast.success("Profil administrator diperbarui");
      await loadAll();
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal memperbarui profil administrator"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteArchive = async (fileId: string) => {
    try {
      await filesApi.removeMetadata(fileId);
      toast.success("Arsip dokumen ekspor berhasil dihapus");
      setArchives((prev) => prev.filter((a) => a.id !== fileId));
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Gagal menghapus arsip"));
    }
  };

  if (loading) return <LoadingState rows={6} />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Kelola profil & logo perusahaan, format penomoran dokumen, pajak/overhead/profit, akun admin, tema, dan arsip ekspor."
      />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profil Perusahaan */}
          <Card>
            <CardHeader>
              <CardTitle>Profil &amp; Identitas Perusahaan</CardTitle>
              <CardDescription>
                Ditampilkan pada dokumen RAB dan seluruh laporan resmi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo Perusahaan"
                    className="h-14 w-14 rounded-lg border object-contain bg-white p-1"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    Logo
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-secondary">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <span>{uploadingLogo ? "Mengunggah..." : "Unggah Logo Perusahaan"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => void handleUploadLogo(e.target.files?.[0])}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-company">Nama Perusahaan</Label>
                <Input
                  id="set-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-phone">Nomor Telepon</Label>
                  <Input
                    id="set-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-email">Email Resmi</Label>
                  <Input
                    id="set-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-address">Alamat Perusahaan</Label>
                <Textarea
                  id="set-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Format Nomor & Konfigurasi Keuangan */}
          <Card>
            <CardHeader>
              <CardTitle>Penomoran Dokumen &amp; Parameter Keuangan</CardTitle>
              <CardDescription>
                Mendukung placeholder <code>{"{YYYY}"}</code>, <code>{"{MM}"}</code>, dan{" "}
                <code>{"{SEQ}"}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-currency">Mata Uang</Label>
                  <Input
                    id="set-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-tax">Default Pajak / PPN (%)</Label>
                  <Input
                    id="set-tax"
                    type="number"
                    step="any"
                    value={defaultTaxPercent}
                    onChange={(e) => setDefaultTaxPercent(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="set-oh">Default Overhead (%)</Label>
                  <Input
                    id="set-oh"
                    type="number"
                    step="any"
                    value={defaultOverheadPercent}
                    onChange={(e) => setDefaultOverheadPercent(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="set-profit">Default Profit (%)</Label>
                  <Input
                    id="set-profit"
                    type="number"
                    step="any"
                    value={defaultProfitPercent}
                    onChange={(e) => setDefaultProfitPercent(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-prj-fmt">Format Kode Proyek</Label>
                <Input
                  id="set-prj-fmt"
                  value={projectCodeFormat}
                  onChange={(e) => setProjectCodeFormat(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="set-rab-fmt">Format Nomor Dokumen RAB</Label>
                <Input
                  id="set-rab-fmt"
                  value={rabNumberFormat}
                  onChange={(e) => setRabNumberFormat(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={savingSettings}>
                  <Save className="h-4 w-4" />
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan Perusahaan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pengaturan Akun Admin & Tema */}
        <Card>
          <CardHeader>
            <CardTitle>Akun Administrator &amp; Tampilan</CardTitle>
            <CardDescription>
              Kelola profil admin aktif dan preferensi tema antarmuka
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="adm-name">Nama Tampilan Administrator</Label>
                <div className="flex gap-2">
                  <Input
                    id="adm-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                  <Button type="submit" size="sm" disabled={savingProfile}>
                    {savingProfile ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Tema Antarmuka</p>
                <p className="text-xs text-muted-foreground">
                  Saat ini: {theme === "light" ? "Mode Terang (Corporate White)" : "Mode Gelap"}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                Ganti Tema
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Daftar Administrator Terdaftar
              </p>
              <div className="divide-y rounded-lg border">
                {admins.map((adm) => (
                  <div key={adm.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{adm.displayName}</p>
                        <p className="text-muted-foreground">{adm.email}</p>
                      </div>
                    </div>
                    <Badge variant={adm.isActive ? "default" : "secondary"}>
                      {adm.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arsip Vercel Blob */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-primary" />
              Arsip Dokumen Ekspor (Vercel Blob)
            </CardTitle>
            <CardDescription>
              Riwayat arsip PDF dan Excel yang otomatis tersimpan saat ekspor laporan atau RAB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archives.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada arsip PDF/Excel tersimpan di Vercel Blob.
              </p>
            ) : (
              <div className="divide-y rounded-lg border max-h-80 overflow-y-auto">
                {archives.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline truncate"
                      >
                        <span className="truncate">{file.originalName}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <p className="text-muted-foreground">
                        {formatDateTime(file.createdAt)} • {(file.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus arsip ${file.originalName}`}
                      onClick={() => handleDeleteArchive(file.id)}
                      title="Hapus Arsip"
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

export default SettingsPage;
