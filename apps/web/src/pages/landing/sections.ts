import {
  Boxes,
  CloudDownload,
  Database,
  FileSpreadsheet,
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
  {
    icon: Wallet,
    value: { id: "Satu harga", en: "One price" },
    label: {
      id: "Rp 499.000 sebulan untuk satu perusahaan. Semua fitur terbuka, jumlah karyawan tidak dibatasi.",
      en: "Rp 499,000 a month for one company. Every feature open, no limit on staff.",
    },
  },
  {
    icon: Percent,
    value: { id: "Pajak Indonesia", en: "Indonesian tax" },
    label: {
      id: "PPN dan PPh 21 dihitung otomatis. File e-Faktur siap diunggah ke Coretax.",
      en: "VAT and income tax calculated automatically. e-Faktur files ready to upload to Coretax.",
    },
  },
  {
    icon: WifiOff,
    value: { id: "Kasir tetap jalan", en: "The till keeps working" },
    label: {
      id: "Internet mati, penjualan tetap tercatat. Tersimpan sendiri begitu koneksi kembali.",
      en: "If the internet drops, sales keep recording. They sync themselves once you are back online.",
    },
  },
  {
    icon: Database,
    value: { id: "Data milik Anda", en: "Your data is yours" },
    label: {
      id: "Bisa diunduh kapan saja, termasuk kalau Anda berhenti berlangganan.",
      en: "Download it any time, including after you stop subscribing.",
    },
  },
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
    label: { id: "Kasir", en: "Till" },
    icon: Store,
    image: "/landing/showcase-pos.webp",
    title: { id: "Kasir yang langsung masuk pembukuan", en: "A till that posts straight to your books" },
    benefits: [
      { id: "Cari barang cepat, beri diskon per item, cetak struk berlogo Anda.", en: "Find items fast, discount per line, print receipts with your logo." },
      { id: "Buka shift, jual seharian, tutup shift. Selisih kasnya ikut tercatat.", en: "Open a shift, sell all day, close it. Any cash difference is recorded too." },
      { id: "Internet mati pun tetap bisa berjualan.", en: "You can keep selling even when the internet is down." },
    ],
  },
  {
    id: "faktur",
    label: { id: "Faktur & PPN", en: "Invoices & VAT" },
    icon: ReceiptText,
    image: "/landing/showcase-penjualan.webp",
    title: { id: "Faktur rapi dalam hitungan detik", en: "A tidy invoice in seconds" },
    benefits: [
      { id: "Satu kali simpan: stok berkurang dan tagihan pelanggan ikut tercatat.", en: "Save once: stock drops and the customer's bill is recorded too." },
      { id: "PPN dan diskon per baris dihitung sendiri.", en: "VAT and per-line discounts are worked out for you." },
      { id: "Salah input? Batalkan atau buat retur. Pembukuannya ikut terbalik.", en: "Made a mistake? Void it or raise a return. The books reverse with it." },
    ],
  },
  {
    id: "laporan",
    label: { id: "Laporan keuangan", en: "Financial reports" },
    icon: LineChart,
    image: "/landing/showcase-laporan.webp",
    title: { id: "Untung rugi bisa dilihat kapan saja", en: "Check your profit any time" },
    benefits: [
      { id: "Laba rugi, neraca, dan arus kas tersusun dari transaksi yang sudah Anda catat.", en: "Profit and loss, balance sheet, and cash flow are built from what you already recorded." },
      { id: "Angkanya selalu cocok, karena disusun mesin bukan diketik ulang.", en: "The figures always tie up, because they are assembled, not retyped." },
      { id: "Bisa diunduh ke Excel dan dicetak rapi.", en: "Export to a spreadsheet or print it cleanly." },
    ],
  },
  {
    id: "gaji",
    label: { id: "Gaji & pajak karyawan", en: "Payroll & staff tax" },
    icon: Wallet,
    image: "/landing/showcase-gaji.webp",
    title: { id: "Gajian sekali klik, pajaknya sudah dihitung", en: "One-click payday, tax already worked out" },
    benefits: [
      { id: "PPh 21 dan BPJS terhitung mengikuti aturan yang berlaku sekarang.", en: "Income tax and social security follow the rules in force today." },
      { id: "Slip gaji tiap karyawan siap dicetak atau dikirim.", en: "Each employee's payslip is ready to print or send." },
      { id: "Beban gajinya langsung masuk laporan keuangan.", en: "The wage cost lands in your financial reports right away." },
    ],
  },
  {
    id: "stok",
    label: { id: "Stok", en: "Stock" },
    icon: Boxes,
    image: "/landing/showcase-stok.webp",
    title: { id: "Stok yang angkanya bisa dipercaya", en: "Stock figures you can trust" },
    benefits: [
      { id: "Beberapa gudang sekaligus, dan modal barang terhitung tiap kali ada penjualan.", en: "Several warehouses at once, with cost of goods computed on every sale." },
      { id: "Barang yang paling dekat kedaluwarsa keluar lebih dulu.", en: "Whatever is closest to expiry goes out first." },
      { id: "Diingatkan sebelum stok habis, bukan sesudahnya.", en: "You are warned before you run out, not after." },
    ],
  },
];

export const COMPARISON: { topic: Dual; manual: Dual; erpindo: Dual }[] = [
  {
    topic: { id: "Mencatat penjualan", en: "Recording a sale" },
    manual: { id: "Tulis nota, salin ke buku, hitung ulang di Excel", en: "Write a note, copy it into a book, recompute in Excel" },
    erpindo: { id: "Catat sekali. Stok dan tagihan ikut terisi sendiri.", en: "Record once. Stock and receivables fill themselves in." },
  },
  {
    topic: { id: "Menghitung PPN", en: "Working out VAT" },
    manual: { id: "Rekap manual tiap masa pajak, gampang selisih", en: "Manual recap each tax period, easy to get wrong" },
    erpindo: { id: "PPN terhitung di setiap faktur. Filenya siap diunggah ke Coretax.", en: "VAT is computed on every invoice. The file is ready to upload to Coretax." },
  },
  {
    topic: { id: "Menggaji karyawan", en: "Paying staff" },
    manual: { id: "Hitung PPh 21 satu per satu di kalkulator", en: "Compute income tax one employee at a time on a calculator" },
    erpindo: { id: "Sekali klik: PPh 21, BPJS, dan slip gaji langsung jadi.", en: "One click: income tax, social security, and payslips are done." },
  },
  {
    topic: { id: "Menjaga stok", en: "Keeping stock straight" },
    manual: { id: "Sering selisih, modal barang cuma ditebak", en: "Often mismatched, cost of goods is guesswork" },
    erpindo: { id: "Modal barang terhitung otomatis. Barang mendekati kedaluwarsa keluar lebih dulu.", en: "Cost of goods is calculated automatically. Stock nearest to expiry goes out first." },
  },
  {
    topic: { id: "Melihat untung rugi", en: "Seeing profit and loss" },
    manual: { id: "Disusun berhari-hari di akhir bulan", en: "Assembled over days at month end" },
    erpindo: { id: "Laporannya siap kapan pun Anda buka.", en: "The report is ready whenever you open it." },
  },
  {
    topic: { id: "Menagih pelanggan", en: "Chasing payment" },
    manual: { id: "Baru sadar telat saat kas menipis", en: "You notice only when cash runs low" },
    erpindo: { id: "Tagihan yang lewat jatuh tempo muncul sendiri di halaman depan.", en: "Overdue invoices surface on your home screen by themselves." },
  },
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
  {
    icon: Database,
    title: { id: "Data tiap perusahaan disimpan terpisah", en: "Each company is stored separately" },
    desc: {
      id: "Perusahaan Anda punya penyimpanan sendiri. Tidak dicampur dengan pengguna lain.",
      en: "Your company gets its own storage. It is never mixed with other users.",
    },
  },
  {
    icon: ScrollText,
    title: { id: "Catatan keuangan tidak bisa dihapus", en: "Financial records cannot be deleted" },
    desc: {
      id: "Kalau ada yang salah, koreksinya dicatat sebagai transaksi baru. Jejaknya tetap utuh — ini yang dicari saat pemeriksaan pajak.",
      en: "If something is wrong, the fix is recorded as a new entry. The trail stays intact — exactly what a tax audit looks for.",
    },
  },
  {
    icon: KeyRound,
    title: { id: "Masuk dengan dua langkah", en: "Two-step sign-in" },
    desc: {
      id: "Selain password, akun bisa dikunci dengan kode dari HP Anda.",
      en: "Beyond a password, your account can be locked with a code from your phone.",
    },
  },
  {
    icon: Lock,
    title: { id: "Atur siapa boleh melihat apa", en: "Decide who sees what" },
    desc: {
      id: "Kasir cukup melihat kasir, staf gudang cukup melihat stok. Setiap perubahan penting tercatat siapa pelakunya.",
      en: "Cashiers see the till, warehouse staff see stock. Every important change records who made it.",
    },
  },
  {
    icon: CloudDownload,
    title: { id: "Data bisa dibawa pulang", en: "You can take your data with you" },
    desc: {
      id: "Unduh semuanya kapan saja dalam bentuk file Excel, termasuk setelah berhenti berlangganan.",
      en: "Download everything any time as spreadsheet files, including after you stop subscribing.",
    },
  },
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
