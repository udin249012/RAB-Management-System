# Skema Database Firestore — RAB Management System

Dokumen ini mendefinisikan seluruh collection pada **Cloud Firestore** serta pemisahan penyimpanan file antara **Firebase Storage** dan **Vercel Blob**.

## Prinsip Desain Data

1. **Audit Metadata Wajib**: Setiap dokumen utama menyimpan `id`, `createdAt` (ISO-8601), `updatedAt`, `createdBy` (UID admin), dan `updatedBy` (UID admin).
2. **Backend-Only Writes**: Seluruh mutasi data dilakukan oleh Express Backend melalui **Firebase Admin SDK**. Firestore Security Rules memblokir seluruh direct write dari client agar integritas perhitungan RAB/AHSP dan audit trail terjaga.
3. **Immutability Snapshot pada RAB**: `rab_documents` dan `rab_items` menyimpan snapshot harga satuan, nama satuan, komponen AHSP, dan profil perusahaan pada saat pembuatan/finalisasi. Perubahan data master di masa mendatang tidak memodifikasi dokumen RAB lama.
4. **Safe Deletion Policy**: Data master yang sudah direferensikan oleh AHSP atau RAB tidak boleh dihapus permanen (`hard delete`) jika berpotensi merusak relasi; gunakan penonaktifan (`isActive: false`) atau tolak penghapusan dengan kode error `CONFLICT`.

---

## Daftar Collection (16 Collections)

### 1. `admins`

Document ID = Firebase Auth `uid`.

- `uid`: string
- `email`: string
- `displayName`: string
- `role`: `"ADMIN"`
- `isActive`: boolean
- `lastLoginAt`: string (opsional)
- Audit fields

### 2. `projects`

- `code`: string (unik, auto-generated sesuai format pengaturan)
- `name`: string
- `location`: string
- `ownerName`: string
- `picName`: string
- `startDate`: string (YYYY-MM-DD)
- `targetEndDate`: string (YYYY-MM-DD)
- `description`: string
- `status`: `"PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "CANCELLED"`
- `coverImageFileId`: string (ref `file_metadata`, opsional)
- `documentFileIds`: string[] (ref `file_metadata`)
- Audit fields

### 3. `material_categories`

- `code`: string (unik)
- `name`: string
- `group`: `"MATERIAL" | "EQUIPMENT" | "SUPPLIES" | "SUPPORTING"`
- `isActive`: boolean
- Audit fields

### 4. `materials`

Mencakup material konstruksi, peralatan, perlengkapan, dan bahan pendukung.

- `code`: string (unik)
- `name`: string
- `categoryId`: string (ref `material_categories`)
- `unitId`: string (ref `units`)
- `unitPrice`: number
- `brand`: string (opsional)
- `specification`: string (opsional)
- `description`: string (opsional)
- `supplier`: string (opsional)
- `photoFileId`: string (ref `file_metadata`, opsional)
- `isActive`: boolean
- `priceHistory`: Array<{ `previousPrice`, `newPrice`, `changedAt`, `changedBy`, `reason?` }>
- Audit fields

### 5. `work_categories`

- `code`: string (unik)
- `name`: string
- `type`: `"CONSTRUCTION" | "INSTALLATION" | "TECHNICAL_SERVICE" | "LABOR" | "MAINTENANCE" | "OTHER"`
- `isActive`: boolean
- Audit fields

### 6. `work_items`

- `code`: string (unik)
- `name`: string
- `categoryId`: string (ref `work_categories`)
- `unitId`: string (ref `units`)
- `description`: string (opsional)
- `basePrice`: number (opsional)
- `ahspId`: string (ref `ahsp` aktif terbaru, opsional)
- `isActive`: boolean
- Audit fields

### 7. `units`

- `code`: string (unik, mis. `M2`, `KG`, `OH`)
- `name`: string (mis. `Meter Persegi`)
- `symbol`: string (mis. `m²`)
- `isActive`: boolean
- Audit fields

### 8. `regional_prices`

Referensi harga satuan per wilayah/periode bila perusahaan beroperasi lintas daerah.

- `regionName`: string
- `itemType`: `"MATERIAL" | "WORK_ITEM"`
- `itemId`: string
- `unitPrice`: number
- `effectiveDate`: string
- `source`: string
- Audit fields

### 9. `ahsp`

Header Analisis Harga Satuan Pekerjaan.

- `code`: string
- `workItemId`: string (ref `work_items`)
- `name`: string
- `unitId`: string (ref `units`)
- `version`: number
- `materialTotal`: number
- `laborTotal`: number
- `equipmentTotal`: number
- `unitPriceTotal`: number (`materialTotal + laborTotal + equipmentTotal`)
- `sourceReference`: string (opsional)
- `isActive`: boolean
- Audit fields

### 10. `ahsp_components`

Komponen pembentuk `ahsp`.

- `ahspId`: string (ref `ahsp`)
- `componentType`: `"MATERIAL" | "LABOR" | "EQUIPMENT"`
- `referenceId`: string (ref `materials` atau `work_items` untuk tenaga kerja)
- `referenceCode`: string
- `referenceName`: string
- `unitId`: string
- `unitSymbol`: string
- `coefficient`: number
- `unitPrice`: number
- `subtotal`: number (`coefficient * unitPrice`)
- Audit fields

### 11. `rab_documents`

- `documentNumber`: string (unik, auto-generated)
- `projectId`: string (ref `projects`)
- `title`: string
- `documentDate`: string
- `version`: number
- `parentRabId`: string (ref `rab_documents`, opsional untuk revisi)
- `status`: `"DRAFT" | "REVIEW" | "FINAL" | "REVISION" | "ARCHIVED"`
- `subtotal`: number
- `overheadPercent`: number
- `overheadAmount`: number
- `profitPercent`: number
- `profitAmount`: number
- `taxPercent`: number
- `taxAmount`: number
- `additionalCosts`: Array<{ `id`, `name`, `amount`, `notes?` }>
- `additionalCostsTotal`: number
- `grandTotal`: number
- `notes`: string (opsional)
- `companySnapshot`: object (snapshot profil perusahaan saat finalisasi)
- `finalizedAt`: string (opsional)
- Audit fields

### 12. `rab_items`

- `rabId`: string (ref `rab_documents`)
- `sectionName`: string (kategori/kelompok pekerjaan dalam RAB)
- `order`: number
- `mode`: `"MANUAL" | "AHSP"`
- `workItemId`: string (opsional)
- `ahspId`: string (opsional)
- `name`: string
- `volume`: number
- `unitSnapshot`: string
- `unitPriceSnapshot`: number
- `subtotal`: number (`volume * unitPriceSnapshot`)
- `ahspComponentsSnapshot`: Array<RabComponentSnapshot> (opsional, untuk mode AHSP)
- Audit fields

### 13. `budget_realizations`

Realisasi biaya aktual proyek (terpisah dari angka rencana RAB).

- `projectId`: string (ref `projects`)
- `rabDocumentId`: string (ref `rab_documents` berstatus `FINAL`)
- `category`: string
- `transactionDate`: string
- `description`: string
- `amount`: number
- `referenceNumber`: string (opsional)
- `evidenceFileId`: string (ref `file_metadata`, opsional)
- Audit fields

### 14. `company_settings`

Dokumen singleton dengan ID `default`.

- `companyName`: string
- `address`: string
- `phone`: string
- `email`: string
- `logoFileId`: string (ref `file_metadata`, opsional)
- `currency`: string (default `"IDR"`)
- `projectCodeFormat`: string (mis. `"PRJ-{YYYY}-{SEQ}"`)
- `rabNumberFormat`: string (mis. `"RAB/{YYYY}/{MM}/{SEQ}"`)
- `defaultTaxPercent`: number
- `defaultOverheadPercent`: number
- `defaultProfitPercent`: number
- Audit fields

### 15. `activity_logs`

- `id`: string
- `actorUid`: string
- `actorEmail`: string
- `action`: string (mis. `"PROJECT_CREATED"`, `"RAB_FINALIZED"`)
- `entityType`: string
- `entityId`: string
- `summary`: string
- `metadata`: Record<string, unknown>
- `createdAt`: string

### 16. `file_metadata`

- `storageProvider`: `"FIREBASE_STORAGE" | "VERCEL_BLOB"`
- `storagePath`: string
- `url`: string
- `originalName`: string
- `mimeType`: string
- `sizeBytes`: number
- `entityType`: string
- `entityId`: string
- Audit fields

---

## Strategi Penyimpanan File

| Jenis File                      | Storage Utama    | Path / Prefix                             |
| ------------------------------- | ---------------- | ----------------------------------------- |
| Logo perusahaan                 | Firebase Storage | `company/logo/`                           |
| Foto material & peralatan       | Firebase Storage | `catalog/materials/`                      |
| Foto proyek & dokumen pendukung | Firebase Storage | `projects/covers/`, `projects/documents/` |
| Bukti transaksi realisasi       | Firebase Storage | `monitoring/evidences/`                   |
| Arsip PDF & Excel RAB/Laporan   | Vercel Blob      | `exports/rab/`, `exports/reports/`        |
