# RAB Management System

Sistem manajemen **Rencana Anggaran Biaya (RAB)** perusahaan dengan arsitektur monorepo modular berbasis **Vite + React + TypeScript** (Frontend) dan **Node.js + Express + TypeScript** (Backend), terintegrasi dengan **Firebase** (Authentication, Firestore, Storage) dan **Vercel Blob**.

## Struktur Monorepo

- `apps/frontend` — Aplikasi web SPA React + Vite + Tailwind CSS + shadcn/ui
- `apps/backend` — REST API (`/api/v1`) Express.js + Firebase Admin SDK + PDF/Excel Generator
- `packages/shared-types` — Kontrak tipe data dan enum bersama
- `packages/shared-validation` — Skema validasi Zod bersama
- `packages/shared-config` — Konfigurasi TypeScript, ESLint, dan Prettier bersama
- `infrastructure/` — Rules dan konfigurasi Firebase & Vercel
- `docs/` — Dokumentasi arsitektur, skema database, API, pengembangan, dan deployment

## Script Utama

```bash
pnpm install        # Install seluruh dependencies monorepo
pnpm dev            # Menjalankan frontend & backend bersamaan
pnpm dev:frontend   # Menjalankan Vite dev server
pnpm dev:backend    # Menjalankan Express dev server
pnpm build          # Build seluruh packages dan apps
pnpm lint           # Menjalankan ESLint
pnpm typecheck      # Pemeriksaan tipe TypeScript seluruh workspace
pnpm test           # Menjalankan unit & integration tests (Vitest)
```
