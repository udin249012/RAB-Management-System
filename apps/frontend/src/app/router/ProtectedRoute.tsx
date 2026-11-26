import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/authentication/authStore";
import { LoadingState } from "@/components/shared/LoadingState";

export function ProtectedRoute() {
  const location = useLocation();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <LoadingState rows={3} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
