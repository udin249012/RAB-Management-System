import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/features/authentication/authStore";
import { LoadingState } from "@/components/shared/LoadingState";

export function PublicOnlyRoute() {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="w-full max-w-md">
          <LoadingState rows={2} />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
