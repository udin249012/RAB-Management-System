# Panduan Pengembangan Lokal (Development Guide)

## Prasyarat

- Node.js >= 20
- pnpm >= 9
- Akun/Project Firebase (atau **Firebase Emulator Suite** untuk pengujian lokal tanpa project cloud)

## 1. Instalasi Dependency

```bash
pnpm install
```

## 2. Konfigurasi Environment

Salin `.env.example` menjadi `.env` di root (untuk backend/script) dan `apps/frontend/.env` (untuk Vite):

```bash
cp .env.example .env
cp .env.example apps/frontend/.env
```

> **Penting**: Pastikan hanya variabel berawalan `VITE_` yang diletakkan di `apps/frontend/.env`. Jangan pernah menyalin `FIREBASE_PRIVATE_KEY` atau `BLOB_READ_WRITE_TOKEN` dengan prefix `VITE_`.

## 3. Menjalankan Firebase Emulator (Opsional untuk Lokal)

Jika ingin menjalankan Authentication, Firestore, dan Storage secara lokal:

```bash
firebase emulators:start --config infrastructure/firebase/firebase.json
```

Aktifkan pada `.env`:

- Backend: `USE_FIREBASE_EMULATOR=true`
- Frontend: `VITE_USE_FIREBASE_EMULATOR=true`

## 4. Bootstrap Akun Admin Awal

Jalankan script berikut untuk membuat akun Admin pertama di Firebase Auth & Firestore `admins`, sekaligus `company_settings` dan master satuan awal:

```bash
SEED_ADMIN_EMAIL=admin@perusahaan.co.id SEED_ADMIN_PASSWORD=PasswordKuat123 SEED_ADMIN_NAME="Administrator" pnpm --filter @rab/backend seed:admin
```

## 5. Menjalankan Aplikasi

```bash
pnpm dev            # Menjalankan frontend (5173) & backend (4000) bersamaan
pnpm dev:frontend   # Hanya Vite frontend
pnpm dev:backend    # Hanya Express backend
```

## 6. Pengujian & Kualitas Kode

```bash
pnpm build          # Build seluruh packages & apps
pnpm typecheck      # Pemeriksaan TypeScript di semua workspace
pnpm lint           # Pemeriksaan ESLint
pnpm format:check   # Pemeriksaan format Prettier
pnpm test           # Menjalankan seluruh unit & integration tests (Vitest)
```
