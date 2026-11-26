# Arsitektur RAB Management System

## Gambaran Umum

Aplikasi ini menggunakan arsitektur **Monorepo** (`pnpm workspaces`) yang memisahkan secara tegas antara **Frontend** (`apps/frontend`), **Backend** (`apps/backend`), **Shared Packages** (`packages/*`), dan **Infrastructure** (`infrastructure/*`).

## Peta Modul

### Frontend (`apps/frontend`)

- **Providers & Auth**: `ThemeProvider`, `AuthProvider` (Firebase Client Auth + verifikasi backend `/api/v1/auth/verify`), `authStore` (Zustand), `axiosClient` (penyisipan Bearer token otomatis).
- **Layout & Navigation**: `AdminLayout` responsif (Sidebar 8 menu utama, Topbar, Breadcrumb, Dark/Light mode).
- **Halaman Lazy-Loaded**:
  - `DashboardPage` (`/dashboard`)
  - `ProjectsPage` (`/projects`), `ProjectDetailPage` (`/projects/:id`)
  - `RabListPage` (`/rab`), `RabEditorPage` (`/rab/new`, `/rab/:id/edit`), `RabDetailPage` (`/rab/:id`)
  - `CatalogPage` (`/catalog`) — Material & Peralatan, Pekerjaan & Jasa, Kategori & Satuan
  - `AhspPage` (`/ahsp`)
  - `MonitoringPage` (`/monitoring`)
  - `ReportsPage` (`/reports`)
  - `SettingsPage` (`/settings`)

### Backend (`apps/backend`)

- **Security Pipeline**: `helmet`, `cors`, `express-rate-limit`, `authMiddleware` (verifikasi Firebase ID Token), `adminMiddleware` (validasi admin aktif pada collection `admins`), `validateRequest` (Zod), `notFoundHandler`, dan `errorHandler` terpusat.
- **Modul Domain (`/api/v1`)**:
  - `auth` & `users` — Verifikasi sesi, profil admin, daftar admin.
  - `catalog` — Satuan, kategori material, material & peralatan (riwayat harga + import/export Excel), kategori pekerjaan, katalog pekerjaan/jasa.
  - `ahsp` — Engine kalkulasi koefisien × harga komponen, versioning, duplikasi, sinkronisasi katalog.
  - `projects` — CRUD proyek, kode proyek otomatis, dokumentasi proyek.
  - `rab` — RAB manual & berbasis AHSP, kalkulasi overhead/profit/pajak/biaya tambahan, snapshot harga/koefisien, finalisasi permanen, revisi dokumen.
  - `monitoring` — Realisasi biaya (khusus RAB Final), perbandingan varians anggaran, agregasi dashboard.
  - `reports` — 8 jenis laporan, generator PDF (`pdfkit`) & Excel (`exceljs`).
  - `files` — Metadata terpusat untuk Firebase Storage & arsip otomatis Vercel Blob.
  - `settings` — Profil perusahaan, logo, format penomoran, default pajak/overhead/profit.

### Shared Packages (`packages/*`)

- `@rab/shared-types`: Kontrak tipe data domain, enum status, dan envelope response API.
- `@rab/shared-validation`: Skema Zod bersama untuk sinkronisasi validasi frontend & backend.
- `@rab/shared-config`: Konfigurasi TypeScript dan Prettier bersama.
