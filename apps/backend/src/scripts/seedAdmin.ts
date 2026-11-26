import "../config/loadEnv.js";
import { AdminRole } from "@rab/shared-types";
import { FIRESTORE_COLLECTIONS } from "../config/collections.js";
import { getFirebaseAuth, getFirestoreDb } from "../config/firebase.js";

/**
 * Bootstrap admin pertama beserta default company_settings & starter units.
 * Jalankan via:
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... SEED_ADMIN_NAME="..." pnpm --filter @rab/backend seed:admin
 */
async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const displayName = process.env.SEED_ADMIN_NAME?.trim() || "System Administrator";

  if (!email || !password || password.length < 8) {
    throw new Error(
      "Harap set environment variable SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (minimal 8 karakter).",
    );
  }

  const auth = getFirebaseAuth();
  const db = getFirestoreDb();
  const now = new Date().toISOString();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    await auth.updateUser(userRecord.uid, { displayName });
  } catch {
    userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
  }

  await auth.setCustomUserClaims(userRecord.uid, { admin: true, role: AdminRole.ADMIN });

  await db.collection(FIRESTORE_COLLECTIONS.ADMINS).doc(userRecord.uid).set(
    {
      id: userRecord.uid,
      uid: userRecord.uid,
      email,
      displayName,
      role: AdminRole.ADMIN,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userRecord.uid,
      updatedBy: userRecord.uid,
    },
    { merge: true },
  );

  const settingsRef = db.collection(FIRESTORE_COLLECTIONS.COMPANY_SETTINGS).doc("default");
  const settingsSnap = await settingsRef.get();
  if (!settingsSnap.exists) {
    await settingsRef.set({
      id: "default",
      companyName: "PT Perusahaan Konstruksi Indonesia",
      address: "Belum diisi",
      phone: "-",
      email,
      currency: "IDR",
      projectCodeFormat: "PRJ-{YYYY}-{SEQ}",
      rabNumberFormat: "RAB/{YYYY}/{MM}/{SEQ}",
      defaultTaxPercent: 11,
      defaultOverheadPercent: 10,
      defaultProfitPercent: 5,
      createdAt: now,
      updatedAt: now,
      createdBy: userRecord.uid,
      updatedBy: userRecord.uid,
    });
  }

  const starterUnits = [
    { id: "unit-m2", code: "M2", name: "Meter Persegi", symbol: "m2" },
    { id: "unit-m3", code: "M3", name: "Meter Kubik", symbol: "m3" },
    { id: "unit-m1", code: "M1", name: "Meter Panjang", symbol: "m" },
    { id: "unit-kg", code: "KG", name: "Kilogram", symbol: "kg" },
    { id: "unit-bh", code: "BH", name: "Buah", symbol: "bh" },
    { id: "unit-oh", code: "OH", name: "Orang Hari", symbol: "OH" },
    { id: "unit-jam", code: "JAM", name: "Jam", symbol: "jam" },
    { id: "unit-ls", code: "LS", name: "Lump Sum", symbol: "ls" },
  ];

  for (const unit of starterUnits) {
    const unitRef = db.collection(FIRESTORE_COLLECTIONS.UNITS).doc(unit.id);
    const snap = await unitRef.get();
    if (!snap.exists) {
      await unitRef.set({
        ...unit,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: userRecord.uid,
        updatedBy: userRecord.uid,
      });
    }
  }

  console.log(`Admin berhasil disiapkan: ${email} (uid: ${userRecord.uid})`);
}

main().catch((error) => {
  console.error("Gagal menjalankan seed-admin:", error);
  process.exit(1);
});
