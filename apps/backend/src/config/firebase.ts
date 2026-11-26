import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { loadEnvironment } from "./environment.js";
import { AppError } from "../utils/AppError.js";

export function normalizePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  return rawKey.replace(/\\n/g, "\n").trim();
}

export function isFirebaseAdminConfigured(): boolean {
  const env = loadEnvironment();
  if (env.USE_FIREBASE_EMULATOR) {
    return true;
  }
  return Boolean(
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
  );
}

export function getFirebaseAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const env = loadEnvironment();

  if (env.USE_FIREBASE_EMULATOR) {
    process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = env.FIREBASE_AUTH_EMULATOR_HOST;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = env.FIREBASE_STORAGE_EMULATOR_HOST;

    const projectId = env.FIREBASE_PROJECT_ID || "demo-rab-management";
    return initializeApp({
      projectId,
      storageBucket: env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
  }

  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new AppError(
      "Konfigurasi Firebase Admin belum lengkap pada environment variables",
      500,
      "FIREBASE_CONFIG_MISSING",
    );
  }

  return initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: env.FIREBASE_STORAGE_BUCKET || `${env.FIREBASE_PROJECT_ID}.appspot.com`,
  });
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseStorage(): Storage {
  return getStorage(getFirebaseAdminApp());
}
