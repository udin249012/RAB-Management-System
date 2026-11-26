import { create } from "zustand";
import type { AdminUser } from "@rab/shared-types";

interface AuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  authError: string | null;
  setLoading: (isLoading: boolean) => void;
  setAuthenticated: (admin: AdminUser) => void;
  setUnauthenticated: (error?: string | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  authError: null,
  setLoading: (isLoading) => set({ isLoading }),
  setAuthenticated: (admin) =>
    set({
      admin,
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
      authError: null,
    }),
  setUnauthenticated: (error = null) =>
    set({
      admin: null,
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
      authError: error,
    }),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));
