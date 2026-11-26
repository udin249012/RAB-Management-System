import {
  BarChart3,
  Calculator,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    description: "Ringkasan proyek, anggaran, realisasi, dan aktivitas sistem",
    icon: LayoutDashboard,
  },
  {
    path: "/projects",
    label: "Data Proyek",
    description: "Kelola daftar proyek perusahaan, jadwal, dan dokumentasi",
    icon: FolderKanban,
  },
  {
    path: "/rab",
    label: "Manajemen RAB",
    description: "Penyusunan RAB manual dan otomatis berbasis AHSP",
    icon: FileSpreadsheet,
  },
  {
    path: "/catalog",
    label: "Katalog Material & Pekerjaan",
    description: "Master material, peralatan, jasa, tenaga kerja, kategori, dan satuan",
    icon: Package,
  },
  {
    path: "/ahsp",
    label: "Analisis Harga Satuan (AHSP)",
    description: "Perhitungan koefisien material, tenaga kerja, dan peralatan",
    icon: Calculator,
  },
  {
    path: "/monitoring",
    label: "Monitoring Anggaran",
    description: "Pencatatan realisasi biaya dan perbandingan terhadap RAB final",
    icon: BarChart3,
  },
  {
    path: "/reports",
    label: "Laporan",
    description: "Ekspor laporan PDF, Excel, dan cetak dokumen resmi perusahaan",
    icon: FileText,
  },
  {
    path: "/settings",
    label: "Pengaturan",
    description: "Profil perusahaan, penomoran dokumen, pajak, overhead, dan akun admin",
    icon: Settings,
  },
];
