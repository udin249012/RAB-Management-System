import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let emulatorsConnected = false;

export function isFirebaseClientConfigured(): boolean {
  const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
  if (useEmulator) {
    return true;
  }
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
}

export function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
  if (!isFirebaseClientConfigured()) {
    throw new Error(
      "Konfigurasi Firebase Client (VITE_FIREBASE_*) belum lengkap di environment variables.",
    );
  }

  const effectiveConfig = useEmulator
    ? {
        apiKey: firebaseConfig.apiKey || "demo-api-key",
        authDomain: firebaseConfig.authDomain || "demo-rab-management.firebaseapp.com",
        projectId: firebaseConfig.projectId || "demo-rab-management",
        storageBucket: firebaseConfig.storageBucket || "demo-rab-management.appspot.com",
        appId: firebaseConfig.appId || "1:000000000000:web:demo",
      }
    : firebaseConfig;

  return initializeApp(effectiveConfig);
}

export function getFirebaseClientAuth(): Auth {
  const app = getFirebaseClientApp();
  const auth = getAuth(app);
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true" && !emulatorsConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    const storage = getStorage(app);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    emulatorsConnected = true;
  }
  return auth;
}

export function getFirebaseClientStorage(): FirebaseStorage {
  const app = getFirebaseClientApp();
  const storage = getStorage(app);
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true" && !emulatorsConnected) {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    emulatorsConnected = true;
  }
  return storage;
}
