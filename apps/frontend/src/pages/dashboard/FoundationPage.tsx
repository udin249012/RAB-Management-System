import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Layers } from "lucide-react";
import { apiClient } from "@/services/api/axiosClient";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/app/providers/ThemeProvider";

interface HealthPayload {
  status: string;
  service: string;
  timestamp: string;
}

export function FoundationPage() {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkBackend = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ success: boolean; data: HealthPayload }>("/health");
      setHealth(response.data.data);
    } catch {
      setError("Backend belum aktif atau tidak terjangkau.");
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void checkBackend();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-8 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Layers className="h-3.5 w-3.5" />
              Fondasi Monorepo Aktif
            </div>
            <h1 className="text-2xl font-bold tracking-tight">RAB Management System</h1>
            <p className="text-sm text-muted-foreground">
              Frontend Vite + React + TypeScript siap diintegrasikan dengan modul Firebase &amp;
              Express API.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            Mode: {theme === "light" ? "Terang" : "Gelap"}
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Activity className="h-4 w-4 text-primary" />
              Status Koneksi Backend (`/api/v1/health`)
            </span>
            <Button size="sm" variant="secondary" onClick={checkBackend} disabled={loading}>
              {loading ? "Memeriksa..." : "Periksa Ulang"}
            </Button>
          </div>

          {health && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>
                Terhubung ({health.service} — {health.status})
              </span>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </main>
  );
}
