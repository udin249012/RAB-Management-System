# Panduan Deployment Production (Deployment Guide)

## 1. Persiapan Firebase Production

1. Buat project Firebase dan aktifkan **Authentication (Email/Password)**, **Cloud Firestore**, serta **Firebase Storage**.
2. Deploy Security Rules dan Indexes dari `infrastructure/firebase/`:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage --config infrastructure/firebase/firebase.json
   ```
3. Buat akun admin awal menggunakan Service Account production (`apps/backend/src/scripts/seedAdmin.ts`).

---

## 2. Deployment Backend (`apps/backend`)

### Opsi A — Layanan Node.js Terpisah (Direkomendasikan untuk Ekspor PDF/Excel & Traffic Stabil)

1. Build workspace dari root:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```
2. Jalankan server:
   ```bash
   node apps/backend/dist/server.js
   ```
3. Atur Environment Variables pada platform hosting (Cloud Run / Railway / Render / VPS):
   - `NODE_ENV=production`
   - `PORT=4000`
   - `CORS_ORIGIN=https://rab-anda.vercel.app`
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`
   - `BLOB_READ_WRITE_TOKEN` (token Vercel Blob untuk arsip otomatis ekspor PDF/Excel)

### Opsi B — Vercel Functions

- Gunakan `apps/backend/src/vercel.ts` sebagai entry point serverless dan referensi `infrastructure/vercel/backend.vercel.json`.

---

## 3. Deployment Frontend (`apps/frontend`) ke Vercel

1. Hubungkan repository GitHub ke Vercel.
2. Konfigurasi Project Settings di Vercel:
   - **Root Directory**: `apps/frontend`
   - **Framework Preset**: `Vite`
   - **Install Command**: `pnpm install --no-frozen-lockfile` (atau jalankan di root monorepo dengan filter `@rab/frontend`)
   - **Build Command**: `pnpm --filter @rab/shared-types build && pnpm --filter @rab/shared-validation build && pnpm --filter @rab/frontend build` (atau gunakan `pnpm build` dari root dengan Output Directory `apps/frontend/dist`).
   - **Output Directory**: `dist` (jika Root Directory = `apps/frontend`)
3. File `apps/frontend/vercel.json` sudah disertakan untuk menangani **SPA Fallback** React Router agar seluruh rute (`/projects`, `/rab/:id`, dll.) tetap berjalan ketika diakses langsung atau di-refresh.
4. Atur Environment Variables di Vercel:
   - `VITE_API_URL=https://api-domain-anda.com/api/v1`
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_USE_FIREBASE_EMULATOR=false`

---

## 4. Verifikasi Pasca-Deployment

1. Buka `https://<backend-domain>/api/v1/health` dan pastikan status `ok`.
2. Buka halaman login frontend, masuk dengan akun admin, dan verifikasi `POST /api/v1/auth/verify` mengembalikan `200`.
3. Uji pembuatan proyek, item katalog, AHSP, finalisasi RAB, pencatatan realisasi, serta ekspor PDF/Excel dan pengecekan arsip di menu Pengaturan.
