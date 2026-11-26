import axios, { AxiosError } from "axios";
import type { ApiErrorResponse } from "@rab/shared-types";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/services/firebase";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  if (isFirebaseClientConfigured()) {
    const auth = getFirebaseClientAuth();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function extractApiErrorMessage(
  error: unknown,
  fallback = "Terjadi kesalahan sistem",
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (data?.error?.message) {
      return data.error.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
