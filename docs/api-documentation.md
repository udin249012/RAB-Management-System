# Dokumentasi REST API (`/api/v1`)

Seluruh endpoint (kecuali `GET /api/v1/health`) wajib menyertakan header:

```text
Authorization: Bearer <Firebase_ID_Token>
```

dan hanya dapat diakses oleh akun administrator aktif (`role: "ADMIN"`, `isActive: true`).

## Format Respons Standar

**Sukses**:

```json
{
  "success": true,
  "data": {},
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 },
  "message": "Opsional"
}
```

**Error**:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pesan error",
    "details": [{ "field": "name", "message": "Wajib diisi" }]
  }
}
```

---

## Daftar Endpoint

### 1. Health & Authentication

- `GET /api/v1/health` — Cek status layanan backend (publik).
- `POST /api/v1/auth/verify` — Verifikasi token Firebase & otorisasi admin, memperbarui `lastLoginAt`, dan mencatat audit log.
- `GET /api/v1/auth/me` — Mengambil profil admin aktif saat ini.

### 2. Master Data & Katalog

- `GET /api/v1/units` | `POST /api/v1/units` | `PUT /api/v1/units/:id` | `DELETE /api/v1/units/:id`
- `GET /api/v1/material-categories` | `POST /api/v1/material-categories` | `PUT /api/v1/material-categories/:id` | `DELETE /api/v1/material-categories/:id`
- `GET /api/v1/materials` (query: `page`, `limit`, `search`, `categoryId`, `group`, `isActive`)
- `POST /api/v1/materials` | `GET /api/v1/materials/:id` | `PUT /api/v1/materials/:id` | `DELETE /api/v1/materials/:id`
- `GET /api/v1/materials/export` — Download katalog format `.xlsx`
- `POST /api/v1/materials/import` — Upload multipart field `file` (`.xlsx`)
- `GET /api/v1/work-categories` | `POST /api/v1/work-categories` | `PUT /api/v1/work-categories/:id` | `DELETE /api/v1/work-categories/:id`
- `GET /api/v1/work-items` (query: `page`, `limit`, `search`, `categoryId`, `type`, `isActive`)
- `POST /api/v1/work-items` | `GET /api/v1/work-items/:id` | `PUT /api/v1/work-items/:id` | `DELETE /api/v1/work-items/:id`

### 3. Analisis Harga Satuan Pekerjaan (AHSP)

- `GET /api/v1/ahsp` (query: `page`, `limit`, `search`, `workItemId`, `isActive`)
- `POST /api/v1/ahsp` — Membuat analisis beserta komponen & kalkulasi otomatis di backend.
- `GET /api/v1/ahsp/:id` — Detail analisis AHSP + daftar komponen + riwayat revisi.
- `PUT /api/v1/ahsp/:id` — Memperbarui komponen/koefisien dan menaikkan versi AHSP.
- `POST /api/v1/ahsp/:id/recalculate` — Menyinkronkan harga komponen dari katalog terbaru.
- `POST /api/v1/ahsp/:id/copy` — Menyalin analisis AHSP ke kode baru.
- `DELETE /api/v1/ahsp/:id` — Menghapus AHSP (ditolak jika sudah dipakai pada `rab_items`).

### 4. Proyek & Metadata File

- `GET /api/v1/projects` (query: `page`, `limit`, `search`, `status`)
- `POST /api/v1/projects` — Membuat proyek baru dengan `code` otomatis.
- `GET /api/v1/projects/:id` — Detail proyek beserta metadata file & dokumentasi.
- `PUT /api/v1/projects/:id` | `DELETE /api/v1/projects/:id`
- `GET /api/v1/files` (query: `entityType`, `entityId`)
- `GET /api/v1/files/archives` — Daftar arsip hasil ekspor PDF/Excel di Vercel Blob.
- `POST /api/v1/files/metadata` — Mendaftarkan metadata file hasil upload Firebase Storage.
- `DELETE /api/v1/files/:id` — Menghapus metadata (serta objek Vercel Blob bila berlaku).

### 5. Manajemen RAB

- `GET /api/v1/rab` (query: `page`, `limit`, `search`, `projectId`, `status`)
- `POST /api/v1/rab` — Membuat dokumen RAB (item `MANUAL` & `AHSP`) beserta snapshot harga/koefisien.
- `GET /api/v1/rab/:id` — Detail dokumen RAB, rincian item, rekap kebutuhan sumber daya AHSP.
- `PUT /api/v1/rab/:id` — Mengedit RAB (`DRAFT`/`REVIEW`/`REVISION`; ditolak jika `FINAL`/`ARCHIVED`).
- `POST /api/v1/rab/:id/calculate` — Menghitung ulang total RAB di backend.
- `POST /api/v1/rab/:id/finalize` — Mengunci dokumen menjadi `FINAL` (dan mengarsipkan versi induk bila revisi).
- `POST /api/v1/rab/:id/revisions` — Membuat kloning revisi versi baru dari dokumen RAB.
- `GET /api/v1/rab/:id/revisions` — Daftar riwayat versi RAB pada proyek terkait.
- `PATCH /api/v1/rab/:id/status` — Mengubah status antara `DRAFT`, `REVIEW`, atau `ARCHIVED`.
- `DELETE /api/v1/rab/:id` — Menghapus RAB draft yang belum memiliki relasi.

### 6. Monitoring Anggaran & Dashboard

- `GET /api/v1/realizations` (query: `page`, `limit`, `search`, `projectId`, `rabDocumentId`, `category`, `startDate`, `endDate`)
- `POST /api/v1/realizations` — Mencatat realisasi biaya (wajib terhubung ke RAB berstatus `FINAL`).
- `PUT /api/v1/realizations/:id` | `DELETE /api/v1/realizations/:id`
- `GET /api/v1/monitoring/summary` (query: `projectId`) — Perbandingan anggaran RAB Final vs realisasi, sisa anggaran, serapan %.
- `GET /api/v1/monitoring/dashboard` — Ringkasan metrik dashboard, grafik bulanan, RAB terbaru, dan log aktivitas.

### 7. Laporan

- `GET /api/v1/reports/:type` — Nilai `:type`: `rab`, `projects`, `materials`, `work-items`, `ahsp`, `realizations`, `budget-comparison`, `rab-revisions`. Query: `startDate`, `endDate`, `projectId`, `status`, `search`, `format` (`json` | `pdf` | `excel`).
- `GET /api/v1/reports/rab/:id/export` — Query: `format` (`pdf` | `excel`) untuk mengunduh dokumen RAB individual.

### 8. Pengaturan & Admin

- `GET /api/v1/settings` — Mengambil konfigurasi perusahaan, format penomoran, pajak, overhead, profit.
- `PUT /api/v1/settings` — Memperbarui konfigurasi perusahaan.
- `GET /api/v1/users/admins` — Daftar administrator.
- `PATCH /api/v1/users/me` — Memperbarui `displayName` administrator yang sedang login.
