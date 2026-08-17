import {
  BookOpenCheck,
  Boxes,
  CloudDownload,
  Coins,
  Database,
  Factory,
  FileSpreadsheet,
  FlaskConical,
  KeyRound,
  Landmark,
  LineChart,
  Lock,
  Percent,
  QrCode,
  ReceiptText,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Store,
  Target,
  UsersRound,
  Wallet,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { FAQ_LANDING } from "@erpindo/shared";
import type { Dual } from "../../i18n";

/**
 * Konten seksi landing — dipisah dari markup agar mudah dirawat. Seluruh teks
 * dwibahasa `{ id, en }` (Fase 14f); komponen memilih via `pick(x, lang)`.
 */

/**
 * Empat bukti di bawah hero. Tiap butir kini berikon (Fase 27a) — sebelumnya
 * hanya teks, dan tiga dari empat "angka"-nya bukan angka sehingga bilah ini
 * terbaca seperti deretan statistik yang statistiknya hilang.
 *
 * Angka uji diperbarui Fase 27a: 555 unit + 1.113 smoke + 337 cek simulasi UI =
 * 2.005. Ditulis "2.000+" — dibulatkan KE BAWAH supaya klaimnya tetap benar
 * meski suite bergerak. Angka sebelumnya (1.300+, ditulis Fase 18e) sudah
 * tertinggal jauh; klaim kepercayaan yang basi melemahkan halamannya sendiri.
 */
export const TRUST_POINTS: { value: Dual; label: Dual; icon: LucideIcon }[] = [
  { icon: FlaskConical, value: { id: "2.000+", en: "2,000+" }, label: { id: "uji otomatis dijalankan tiap kali kode berubah", en: "automated tests run on every code change" } },
  { icon: Database, value: { id: "1 database / perusahaan", en: "1 database / company" }, label: { id: "data Anda tidak bercampur dengan siapa pun", en: "your data never mixes with anyone else's" } },
  { icon: Percent, value: { id: "PPh 21 TER · Coretax", en: "PPh 21 TER · Coretax" }, label: { id: "mengikuti aturan pajak Indonesia terbaru", en: "follows the latest Indonesian tax rules" } },
  { icon: WifiOff, value: { id: "Jalan tanpa internet", en: "Works offline" }, label: { id: "kasir tetap melayani saat koneksi putus", en: "the cashier keeps serving when the line drops" } },
];

export type ShowcaseItem = {
  id: string;
  label: Dual;
  icon: LucideIcon;
  image: string;
  title: Dual;
  benefits: Dual[];
};

export const SHOWCASE: ShowcaseItem[] = [
  {
    id: "pos",
    label: { id: "Kasir (POS)", en: "POS Cashier" },
    icon: Store,
    image: "/landing/showcase-pos.webp",
    title: { id: "Kasir cepat yang langsung masuk pembukuan", en: "A fast cashier that flows straight into your books" },
    benefits: [
      { id: "Layar kasir ringkas dengan pencarian produk kilat & diskon per item", en: "A tidy cashier screen with instant product search & per-item discounts" },
      { id: "Sesi shift kas — buka, jual, tutup; selisih kas otomatis terjurnal", en: "Cash shift sessions — open, sell, close; cash variance auto-journaled" },
      { id: "Cetak struk berlogo dan tetap bisa berjualan saat offline (PWA)", en: "Print branded receipts and keep selling offline (PWA)" },
    ],
  },
  {
    id: "faktur",
    label: { id: "Faktur & PPN", en: "Invoices & VAT" },
    icon: ReceiptText,
    image: "/landing/showcase-penjualan.webp",
    title: { id: "Faktur profesional dalam hitungan detik", en: "Professional invoices in seconds" },
    benefits: [
      { id: "Sekali posting: jurnal, stok, dan piutang beres bersamaan", en: "Post once: journal, stock, and receivables all settle together" },
      { id: "PPN 0/11/12% + diskon per baris dihitung otomatis", en: "VAT 0/11/12% + per-line discounts calculated automatically" },
      { id: "Salah input? Batalkan atau retur — pembukuan terbalik dengan persis", en: "Mistake? Void or return — the books reverse exactly" },
    ],
  },
  {
    id: "laporan",
    label: { id: "Laporan Keuangan", en: "Financial Reports" },
    icon: LineChart,
    image: "/landing/showcase-laporan.webp",
    title: { id: "Laba rugi & neraca real-time, selalu seimbang", en: "Real-time P&L and balance sheet, always balanced" },
    benefits: [
      { id: "Laba Rugi, Neraca, Arus Kas & umur piutang dari satu sumber: jurnal", en: "P&L, Balance Sheet, Cash Flow & receivables aging from one source: the journal" },
      { id: "Double-entry sungguhan — neraca dijamin seimbang oleh sistem", en: "True double-entry — the system guarantees a balanced sheet" },
      { id: "Ekspor CSV untuk Excel, cetak rapi, dan tutup buku per periode", en: "CSV export for Excel, clean printing, and period close" },
    ],
  },
  {
    id: "gaji",
    label: { id: "Gaji & PPh 21", en: "Payroll & Tax" },
    icon: Wallet,
    image: "/landing/showcase-gaji.webp",
    title: { id: "Gajian sekali klik, pajak sudah dihitung", en: "One-click payroll with tax already computed" },
    benefits: [
      { id: "PPh 21 metode TER terbaru + BPJS Kesehatan & Ketenagakerjaan otomatis", en: "Latest PPh 21 (TER method) + BPJS health & employment, automatic" },
      { id: "Slip gaji per karyawan siap cetak/kirim", en: "Per-employee payslips ready to print/send" },
      { id: "Beban gaji langsung terjurnal — laporan keuangan ikut akurat", en: "Payroll expense auto-journaled — reports stay accurate" },
    ],
  },
  {
    id: "stok",
    label: { id: "Stok & FEFO", en: "Stock & FEFO" },
    icon: Boxes,
    image: "/landing/showcase-stok.webp",
    title: { id: "Stok akurat sampai ke lot kedaluwarsa", en: "Accurate stock down to expiry lots" },
    benefits: [
      { id: "Multi-gudang dengan HPP rata-rata otomatis di setiap penjualan", en: "Multi-warehouse with automatic moving-average COGS on every sale" },
      { id: "Lot & tanggal kedaluwarsa — keluar otomatis yang paling dekat exp (FEFO)", en: "Lots & expiry dates — nearest-expiry goes out first (FEFO)" },
      { id: "Ambang stok minimum + lonceng peringatan sebelum kehabisan", en: "Minimum-stock thresholds + bell alerts before you run out" },
    ],
  },
];

export const FEATURE_GROUPS: { icon: LucideIcon; title: Dual; desc: Dual }[] = [
  { icon: BookOpenCheck, title: { id: "Keuangan & Akuntansi", en: "Finance & Accounting" }, desc: { id: "Jurnal double-entry otomatis, buku besar, neraca, laba rugi, arus kas, dan tutup buku.", en: "Automatic double-entry journals, ledger, balance sheet, P&L, cash flow, and period close." } },
  { icon: ReceiptText, title: { id: "Faktur & Pembayaran", en: "Invoices & Payments" }, desc: { id: "Faktur jual/beli, PPN otomatis, cetak/PDF berkop, catat sampai lunas, retur nota kredit.", en: "Sales/purchase invoices, automatic VAT, branded print/PDF, payment tracking, credit-note returns." } },
  { icon: Boxes, title: { id: "Stok & Gudang", en: "Stock & Warehouse" }, desc: { id: "Stok multi-gudang, HPP rata-rata, lot & kedaluwarsa (FEFO), transfer, dan stok opname.", en: "Multi-warehouse stock, moving-average COGS, lots & expiry (FEFO), transfers, and stock counts." } },
  { icon: Store, title: { id: "Kasir (POS)", en: "POS Cashier" }, desc: { id: "Layar kasir cepat, sesi shift kas, cetak struk, dan tetap jalan saat offline.", en: "Fast cashier screen, cash shift sessions, receipt printing, and offline operation." } },
  { icon: Target, title: { id: "CRM & Helpdesk", en: "CRM & Helpdesk" }, desc: { id: "Pipeline lead & penawaran, konversi ke pelanggan, plus tiket dukungan pelanggan.", en: "Lead & quotation pipeline, conversion to customers, plus customer support tickets." } },
  { icon: UsersRound, title: { id: "HR & Payroll", en: "HR & Payroll" }, desc: { id: "Data karyawan, gaji, hitung PPh 21 metode TER + BPJS, slip gaji & jurnal otomatis.", en: "Employee data, payroll, PPh 21 (TER) + BPJS calculation, payslips & automatic journals." } },
  { icon: Landmark, title: { id: "Aset & Maintenance", en: "Assets & Maintenance" }, desc: { id: "Register aset, penyusutan otomatis, jadwal servis berkala, dan work order berbiaya.", en: "Asset register, automatic depreciation, scheduled servicing, and costed work orders." } },
  { icon: Factory, title: { id: "Manufaktur & QC", en: "Manufacturing & QC" }, desc: { id: "Bill of Materials, perintah produksi biaya gabungan, dan inspeksi QC lulus/karantina.", en: "Bill of Materials, combined-cost production orders, and QC inspection pass/quarantine." } },
  { icon: Coins, title: { id: "Multi-perusahaan & Valas", en: "Multi-company & FX" }, desc: { id: "Kelola banyak perusahaan satu akun, laporan konsolidasi, dan faktur multi mata uang.", en: "Manage many companies from one account, consolidated reports, and multi-currency invoices." } },
  { icon: FileSpreadsheet, title: { id: "Pajak & Kepatuhan", en: "Tax & Compliance" }, desc: { id: "Ekspor e-Faktur XML Coretax, PPN, dan PPh 21 — mengikuti standar perpajakan Indonesia.", en: "e-Faktur XML export for Coretax, VAT, and PPh 21 — following Indonesian tax standards." } },
  { icon: ShieldCheck, title: { id: "Keamanan & Platform", en: "Security & Platform" }, desc: { id: "Database terpisah tiap perusahaan, peran akses, 2FA, audit log, dan PWA offline.", en: "Separate database per company, access roles, 2FA, audit log, and offline PWA." } },
];

export const COMPARISON: { topic: Dual; manual: Dual; erpindo: Dual }[] = [
  { topic: { id: "Catat penjualan", en: "Record a sale" }, manual: { id: "Tulis nota, salin ke buku, hitung ulang di Excel", en: "Write a note, copy to a book, recompute in Excel" }, erpindo: { id: "Sekali input — jurnal, stok & piutang otomatis", en: "One entry — journal, stock & receivables automatic" } },
  { topic: { id: "Hitung PPN & e-Faktur", en: "Compute VAT & e-Faktur" }, manual: { id: "Rekap manual tiap masa pajak, rawan selisih", en: "Manual recap each tax period, error-prone" }, erpindo: { id: "PPN otomatis + unduh XML siap impor Coretax", en: "Automatic VAT + XML download ready for Coretax" } },
  { topic: { id: "Gaji & PPh 21", en: "Payroll & PPh 21" }, manual: { id: "Hitung TER per karyawan di kalkulator/Excel", en: "Compute TER per employee in a calculator/Excel" }, erpindo: { id: "Sekali klik — TER, BPJS, slip gaji & jurnal beres", en: "One click — TER, BPJS, payslips & journals done" } },
  { topic: { id: "Stok & HPP", en: "Stock & COGS" }, manual: { id: "Stok sering selisih, HPP ditebak", en: "Stock often mismatches, COGS is guessed" }, erpindo: { id: "HPP rata-rata otomatis, opname & FEFO tercatat", en: "Automatic moving-average COGS, counts & FEFO recorded" } },
  { topic: { id: "Laporan keuangan", en: "Financial reports" }, manual: { id: "Disusun berhari-hari di akhir bulan", en: "Compiled over days at month-end" }, erpindo: { id: "Laba Rugi & Neraca real-time kapan pun", en: "Real-time P&L & Balance Sheet anytime" } },
  { topic: { id: "Tagihan telat", en: "Late invoices" }, manual: { id: "Baru sadar saat kas menipis", en: "Only noticed when cash runs low" }, erpindo: { id: "Umur piutang + lonceng pengingat jatuh tempo", en: "Receivables aging + due-date reminder bells" } },
];

/** Daftar modul yang semuanya termasuk dalam paket (dipakai seksi Harga). */
export const SINGLE_PLAN_MODULES: Dual[] = [
  { id: "Akuntansi double-entry", en: "Double-entry accounting" },
  { id: "Faktur & PPN (Coretax)", en: "Invoices & VAT (Coretax)" },
  { id: "Kasir (POS) + shift kas", en: "POS cashier + cash shifts" },
  { id: "Stok multi-gudang & FEFO", en: "Multi-warehouse stock & FEFO" },
  { id: "Penjualan SO → Surat Jalan", en: "Sales SO → Delivery Order" },
  { id: "Pembelian & pengadaan", en: "Purchasing & procurement" },
  { id: "Gaji + PPh 21 TER + BPJS", en: "Payroll + PPh 21 TER + BPJS" },
  { id: "Absensi & cuti karyawan", en: "Attendance & employee leave" },
  { id: "CRM pipeline & penawaran", en: "CRM pipeline & quotations" },
  { id: "Proyek, RAB & timesheet", en: "Projects, budgets & timesheets" },
  { id: "Manufaktur, BoM & QC", en: "Manufacturing, BoM & QC" },
  { id: "Aset tetap & penyusutan", en: "Fixed assets & depreciation" },
  { id: "Pajak UMKM & e-Faktur", en: "SME tax & e-Faktur" },
  { id: "Anggaran & rekonsiliasi bank", en: "Budgets & bank reconciliation" },
  { id: "Persetujuan berjenjang", en: "Multi-level approvals" },
  { id: "Laporan lengkap + Excel", en: "Full reports + Excel" },
];

/**
 * Perbandingan implisit per KATEGORI (Fase 13c) — tanpa menyebut merek.
 */
export const CATEGORY_COMPARISON: { label: Dual; rows: Dual[] }[] = [
  { label: { id: "Biaya per pengguna", en: "Cost per user" }, rows: [{ id: "—", en: "—" }, { id: "Naik per user", en: "Rises per user" }, { id: "Rp 300–400rb/user", en: "Rp 300–400k/user" }, { id: "Lisensi mahal", en: "Expensive licenses" }, { id: "Rp 0 (tak terbatas)", en: "Rp 0 (unlimited)" }] },
  { label: { id: "Modul operasional (HR, manufaktur, proyek)", en: "Operational modules (HR, manufacturing, projects)" }, rows: [{ id: "✗", en: "✗" }, { id: "✗", en: "✗" }, { id: "Add-on berbayar", en: "Paid add-on" }, { id: "✓", en: "✓" }, { id: "✓ (paket Business)", en: "✓ (Business plan)" }] },
  { label: { id: "Waktu sampai aktif", en: "Time to go live" }, rows: [{ id: "—", en: "—" }, { id: "Beberapa hari", en: "A few days" }, { id: "Berminggu-minggu", en: "Weeks" }, { id: "Berbulan-bulan", en: "Months" }, { id: "Hari ini", en: "Today" }] },
  { label: { id: "Biaya implementasi", en: "Implementation cost" }, rows: [{ id: "—", en: "—" }, { id: "—", en: "—" }, { id: "Jutaan", en: "Millions" }, { id: "Ratusan juta", en: "Hundreds of millions" }, { id: "Mulai Rp 0 (mandiri)", en: "From Rp 0 (self-serve)" }] },
  { label: { id: "Multi-perusahaan + konsolidasi", en: "Multi-company + consolidation" }, rows: [{ id: "✗", en: "✗" }, { id: "Terbatas", en: "Limited" }, { id: "Add-on", en: "Add-on" }, { id: "✓", en: "✓" }, { id: "✓ (termasuk)", en: "✓ (included)" }] },
];
export const CATEGORY_COMPARISON_HEADERS: Dual[] = [
  { id: "Spreadsheet", en: "Spreadsheet" },
  { id: "Software akuntansi", en: "Accounting software" },
  { id: "ERP per-pengguna", en: "Per-user ERP" },
  { id: "ERP konvensional", en: "Conventional ERP" },
  { id: "ERPindo", en: "ERPindo" },
];

/**
 * Lima jaminan keamanan. Field `icon` ditambahkan Fase 27a: sebelumnya komponen
 * menggambar `ShieldCheck` yang sama untuk kelimanya, sehingga seksi ini tampil
 * sebagai lima perisai identik dan tidak satu pun ikonnya menjelaskan isinya.
 */
export const SECURITY_POINTS: { title: Dual; desc: Dual; icon: LucideIcon }[] = [
  { icon: Database, title: { id: "Database terpisah per perusahaan", en: "Separate database per company" }, desc: { id: "Data Anda tidak bercampur dengan pengguna lain — setiap perusahaan berdiri di database sendiri.", en: "Your data never mixes with other users — each company sits in its own database." } },
  { icon: Lock, title: { id: "Terenkripsi & jurnal terkunci", en: "Encrypted & locked journals" }, desc: { id: "Seluruh lalu lintas lewat HTTPS, kredensial sensitif tersimpan terenkripsi, dan jurnal akuntansi permanen — dikoreksi lewat jurnal pembalik, tak pernah dihapus.", en: "All traffic over HTTPS, sensitive credentials stored encrypted, and accounting journals are permanent — corrected via reversing entries, never deleted." } },
  { icon: KeyRound, title: { id: "Verifikasi dua langkah (2FA)", en: "Two-factor authentication (2FA)" }, desc: { id: "Lindungi akun dengan kode dari aplikasi authenticator, bukan hanya password.", en: "Protect accounts with a code from an authenticator app, not just a password." } },
  { icon: ScrollText, title: { id: "Peran akses & audit log", en: "Access roles & audit log" }, desc: { id: "Atur siapa boleh apa, dan setiap perubahan penting terekam jejaknya.", en: "Control who can do what, and every important change is traced." } },
  { icon: CloudDownload, title: { id: "Data Anda milik Anda", en: "Your data is yours" }, desc: { id: "Unduh seluruh data (ZIP berisi CSV) kapan pun — bahkan setelah langganan berakhir.", en: "Download all your data (a ZIP of CSVs) anytime — even after your subscription ends." } },
];

/**
 * FAQ — DIIMPOR dari `@erpindo/shared` sejak Fase 31c.
 *
 * Dulu daftar ini ditulis di sini (11 tanya-jawab) sementara Worker menyimpan
 * daftarnya sendiri (5 tanya-jawab) untuk JSON-LD, dengan komentar yang
 * menyatakan keduanya selaras. Tidak satu pun pertanyaannya sama. Satu sumber
 * di `packages/shared/src/landing.ts` menutup celah itu; uji di paket yang
 * sama menguncinya.
 */
export const FAQ: { q: Dual; a: Dual }[] = FAQ_LANDING;

/**
 * Kompatibilitas faktual (bukan testimoni karangan). Dipindahkan dari komponen
 * ke sini pada Fase 27a supaya tiap butir bisa berikon — sebelumnya enam pil
 * teks polos, satu-satunya seksi di halaman yang sama sekali tanpa penanda.
 */
export const INTEGRATIONS: { icon: LucideIcon; label: Dual }[] = [
  { icon: QrCode, label: { id: "Pembayaran Xendit (QRIS/VA/e-wallet)", en: "Xendit payments (QRIS/VA/e-wallet)" } },
  { icon: FileSpreadsheet, label: { id: "e-Faktur & Coretax DJP", en: "e-Faktur & Coretax (Indonesian tax)" } },
  { icon: Wallet, label: { id: "PPh 21 (TER) & BPJS", en: "Payroll tax (PPh 21 TER) & BPJS" } },
  { icon: CloudDownload, label: { id: "Backup Google Drive", en: "Google Drive backup" } },
  { icon: ReceiptText, label: { id: "Tagih via WhatsApp", en: "Billing via WhatsApp" } },
  { icon: ShoppingBag, label: { id: "Impor Shopee · Tokopedia · TikTok Shop", en: "Import Shopee · Tokopedia · TikTok Shop" } },
];

export function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}
