import { signOut } from "firebase/auth";
import { LogOut, Menu, Moon, Sun, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useAuthStore } from "@/features/authentication/authStore";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/services/firebase";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/glass-sidebar-utils/liquid-glass";
import { Breadcrumb } from "./Breadcrumb";

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const admin = useAuthStore((s) => s.admin);

  const handleLogout = async () => {
    try {
      if (isFirebaseClientConfigured()) {
        await signOut(getFirebaseClientAuth());
      }
      toast.success("Anda telah keluar dari sistem.");
    } catch {
      toast.error("Gagal melakukan logout.");
    }
  };

  return (
    <div className="sticky top-3 z-20">
      <LiquidGlass
        asChild
        variant="frosted"
        className="flex h-16 items-center justify-between gap-4 rounded-[26px] px-4 text-[var(--glass-foreground)] sm:px-6"
      >
        <header>
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenMobileMenu}
              aria-label="Buka menu navigasi"
              className="lg:hidden shrink-0 rounded-xl hover:bg-[var(--glass-highlight-hover)]"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Breadcrumb />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              aria-label="Ubah tema tampilan"
              title={theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
              className="rounded-xl border-border/50 bg-[var(--glass-highlight-hover)] hover:bg-[var(--glass-highlight)]"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {admin && (
              <div className="hidden md:flex items-center gap-2 rounded-2xl border border-border/50 bg-[var(--glass-highlight-hover)] px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div className="text-left leading-tight">
                  <p className="text-xs font-semibold">{admin.displayName}</p>
                  <p className="text-[11px] text-muted-foreground">{admin.email}</p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 rounded-xl border-border/50 bg-[var(--glass-highlight-hover)] hover:bg-[var(--glass-highlight)]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>
      </LiquidGlass>
    </div>
  );
}
