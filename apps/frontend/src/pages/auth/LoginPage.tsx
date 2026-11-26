import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
import { loginFormSchema, type LoginFormInput } from "@rab/shared-validation";
import { useTheme } from "@/app/providers/ThemeProvider";
import { ArchitecturalShowcaseCanvas } from "@/features/authentication/ArchitecturalShowcaseCanvas";
import { ForgotPasswordModal } from "@/features/authentication/ForgotPasswordModal";
import { useAuthStore } from "@/features/authentication/authStore";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/services/firebase";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/glass-sidebar-utils/liquid-glass";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const authError = useAuthStore((s) => s.authError);
  const firebaseConfigured = isFirebaseClientConfigured();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormInput) => {
    if (!firebaseConfigured) {
      toast.error("Konfigurasi Firebase Client (VITE_FIREBASE_*) belum diatur.");
      return;
    }

    setSubmitting(true);
    try {
      const auth = getFirebaseClientAuth();
      await setPersistence(
        auth,
        rememberSession ? browserLocalPersistence : browserSessionPersistence,
      );
      await signInWithEmailAndPassword(auth, values.email, values.password);
    } catch (error) {
      const message =
        error instanceof Error && error.message.includes("invalid-credential")
          ? "Email atau password administrator tidak sesuai."
          : "Gagal login ke Firebase Authentication. Periksa kredensial dan koneksi Anda.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!firebaseConfigured) {
      toast.error("Konfigurasi Firebase Client (VITE_FIREBASE_*) belum diatur.");
      return;
    }

    setGoogleSubmitting(true);
    try {
      const auth = getFirebaseClientAuth();
      await setPersistence(
        auth,
        rememberSession ? browserLocalPersistence : browserSessionPersistence,
      );
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
        toast.info("Login dengan Google dibatalkan.");
      } else if (code.includes("popup-blocked")) {
        toast.error("Popup browser diblokir. Izinkan popup untuk melanjutkan login Google.");
      } else if (code.includes("operation-not-allowed")) {
        toast.error("Metode login Google belum diaktifkan di Firebase Authentication.");
      } else if (code.includes("unauthorized-domain")) {
        toast.error("Domain aplikasi belum diizinkan pada Firebase Authentication.");
      } else {
        toast.error("Gagal masuk dengan Google. Pastikan akun terdaftar sebagai administrator.");
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground">
      {/* Left Panel: Architectural Blueprint & 3D Construction Showcase */}
      <section className="relative hidden lg:flex lg:w-[55%] min-h-screen bg-[#081226] text-white overflow-hidden flex-col justify-between p-8 xl:p-12">
        <div className="absolute inset-0 blueprint-grid pointer-events-none" />
        <div className="absolute -top-28 -left-24 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-0 w-[28rem] h-[28rem] rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />

        <ArchitecturalShowcaseCanvas />
        <div className="absolute inset-0 bg-gradient-to-t from-[#081226] via-transparent to-[#081226]/70 pointer-events-none z-[1]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-blue-600/30 flex items-center justify-center border border-blue-400/40">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white leading-tight">
              RAB Management System
            </p>
            <p className="text-xs text-sky-300/85 font-medium">Portal Internal Perusahaan</p>
          </div>
        </div>

        <div className="relative z-10 mt-auto space-y-5 max-w-lg">
          <div>
            <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-2">
              Cost Engineering &amp; Project Control
            </span>
            <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-snug">
              Kelola Rencana Anggaran Biaya proyek secara presisi dan terpusat.
            </h2>
            <p className="text-sm text-slate-300/90 mt-2.5 leading-relaxed">
              Pantau struktur BoQ, validasi harga satuan AHSP, dan kontrol realisasi konstruksi
              dalam satu panel administrator yang aman.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="glass-card rounded-xl px-3.5 py-3">
              <p className="text-xs font-semibold text-white">Struktur BoQ</p>
              <p className="text-[11px] text-slate-300/80 mt-0.5">Estimasi &amp; volume rapi</p>
            </div>
            <div className="glass-card rounded-xl px-3.5 py-3">
              <p className="text-xs font-semibold text-white">Kontrol Biaya</p>
              <p className="text-[11px] text-slate-300/80 mt-0.5">Monitoring deviasi</p>
            </div>
            <div className="glass-card rounded-xl px-3.5 py-3">
              <p className="text-xs font-semibold text-white">Akses Terverifikasi</p>
              <p className="text-[11px] text-slate-300/80 mt-0.5">Audit sesi admin</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Panel: Enterprise Frosted Glass Login Form */}
      <section className="relative w-full lg:w-[45%] min-h-screen dot-bg flex flex-col justify-between overflow-hidden p-5 sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 -left-16 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex lg:hidden h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              Akses Khusus Administrator
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
            className="gap-1.5 rounded-2xl border-border/50 bg-[var(--glass-highlight-hover)] backdrop-blur-md hover:bg-[var(--glass-highlight)]"
          >
            {theme === "light" ? (
              <>
                <Moon className="h-3.5 w-3.5" />
                <span>Mode Gelap</span>
              </>
            ) : (
              <>
                <Sun className="h-3.5 w-3.5" />
                <span>Mode Terang</span>
              </>
            )}
          </Button>
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto my-8">
          <LiquidGlass
            variant="frosted"
            className="rounded-[26px] p-6 sm:p-8 space-y-5 text-[var(--glass-foreground)]"
          >
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Masuk ke Sistem</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Masuk menggunakan akun administrator perusahaan yang terdaftar.
              </p>
            </div>

            {!firebaseConfigured && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-300/80 bg-amber-50/85 p-3 text-xs text-amber-900 backdrop-blur-sm dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Variabel <code>VITE_FIREBASE_*</code> belum dikonfigurasi pada environment.
                  Lengkapi <code>.env</code> atau aktifkan emulator lokal.
                </span>
              </div>
            )}

            {authError && (
              <div className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Administrator</Label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@perusahaan.co.id"
                    className="pl-9 rounded-[14px] border-border/60 bg-background/60 backdrop-blur-sm"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan password"
                    className="pl-9 pr-10 rounded-[14px] border-border/60 bg-background/60 backdrop-blur-sm"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground">Ingat sesi di perangkat ini</span>
              </label>

              <Button
                type="submit"
                className="w-full h-11 rounded-[14px] font-semibold shadow-sm"
                disabled={submitting || googleSubmitting}
              >
                {submitting ? "Memverifikasi Sesi..." : "Masuk sebagai Admin"}
              </Button>
            </form>

            <div className="relative flex items-center py-0.5">
              <div className="flex-1 border-t border-border/60" />
              <span className="px-3 text-[11px] font-medium text-muted-foreground">
                Atau masuk dengan
              </span>
              <div className="flex-1 border-t border-border/60" />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={submitting || googleSubmitting}
              className="w-full h-11 rounded-[14px] border-border/60 bg-background/65 font-medium backdrop-blur-sm hover:bg-[var(--glass-highlight)] gap-2.5"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
                <path
                  d="M21.805 12.23c0-.72-.065-1.412-.185-2.078H12v3.93h5.497a4.7 4.7 0 0 1-2.038 3.084v2.562h3.3c1.93-1.778 3.046-4.396 3.046-7.498Z"
                  fill="#4285F4"
                />
                <path
                  d="M12 22c2.755 0 5.066-.914 6.755-2.472l-3.3-2.562c-.914.612-2.084.974-3.455.974-2.658 0-4.908-1.795-5.71-4.208H2.88v2.646A9.997 9.997 0 0 0 12 22Z"
                  fill="#34A853"
                />
                <path
                  d="M6.29 13.732A6.01 6.01 0 0 1 5.975 12c0-.602.104-1.186.315-1.732V7.622H2.88A9.997 9.997 0 0 0 2 12c0 1.613.386 3.14 1.08 4.378l3.21-2.646Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 6.06c1.498 0 2.842.515 3.9 1.525l2.926-2.926C17.06 2.996 14.75 2 12 2a9.997 9.997 0 0 0-9.12 5.622l3.41 2.646C7.092 7.855 9.342 6.06 12 6.06Z"
                  fill="#EA4335"
                />
              </svg>
              <span>{googleSubmitting ? "Menghubungkan Google..." : "Masuk dengan Google"}</span>
            </Button>
          </LiquidGlass>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>Koneksi Terenkripsi · Verifikasi Sesi Terpusat</span>
          </div>
        </div>

        <p className="relative z-10 text-center text-xs text-muted-foreground">
          © 2026 RAB Management System · Internal Enterprise Portal
        </p>
      </section>

      <ForgotPasswordModal
        open={forgotOpen}
        initialEmail={getValues("email")}
        onClose={() => setForgotOpen(false)}
      />
    </div>
  );
}
