import {
  Boxes,
  CloudDownload,
  Database,
  FileSpreadsheet,
  FlaskConical,
  KeyRound,
  LineChart,
  Lock,
  Percent,
  QrCode,
  ReceiptText,
  ScrollText,
  ShoppingBag,
  Store,
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
