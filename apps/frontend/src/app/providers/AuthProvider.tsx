import { useEffect, type ReactNode } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "sonner";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/services/firebase";
import { verifyAdminSessionApi } from "@/services/api/authApi";
import { extractApiErrorMessage } from "@/services/api/axiosClient";
import { useAuthStore } from "@/features/authentication/authStore";

export function AuthProvider({ children }: { children: ReactNode }) {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      setUnauthenticated(null);
      return;
    }

    const auth = getFirebaseClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUnauthenticated(null);
        return;
      }

      setLoading(true);
      try {
        const token = await firebaseUser.getIdToken();
        const admin = await verifyAdminSessionApi(token);
        setAuthenticated(admin);
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          "Akun tidak memiliki otorisasi administrator",
        );
        await signOut(auth);
        setUnauthenticated(message);
        toast.error(message);
      }
    });

    return () => unsubscribe();
  }, [setAuthenticated, setLoading, setUnauthenticated]);

  return <>{children}</>;
}
