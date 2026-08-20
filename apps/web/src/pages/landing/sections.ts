import {
  Building2,
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
  type LucideIcon,
} from "lucide-react";
import { FAQ_LANDING } from "@erpindo/shared";
import type { PeragaanId } from "../../peragaan";
import type { Dual } from "../../i18n";

/**
 * Konten seksi landing — dipisah dari markup agar mudah dirawat. Seluruh teks
 * dwibahasa `{ id, en }` (Fase 14f); komponen memilih via `pick(x, lang)`.
 */

/**
 * Empat bukti di bawah hero — pertanyaan yang benar-benar ditanyakan pembeli.
 *
 * Fase 32e mengganti isinya: sebelumnya butir pertama berbunyi "2.000+ uji
 * otomatis dijalankan tiap kali kode berubah". Itu metrik pengembang, dan
 * memajangnya ke pemilik toko justru membuat halaman terbaca seperti agensi
 * menjual keahlian ngoding.
 *
 * Empat butir sekarang menjawab: harganya berapa, cocok dengan pajak Indonesia
 * atau tidak, kalau internet mati bagaimana, dan datanya milik siapa.
 */
export const TRUST_POINTS: { value: Dual; label: Dual; icon: LucideIcon }[] = [
  {
    icon: Wallet,
    value: { id: "Pengguna tak terbatas", en: "Unlimited users" },
    label: {
      id: "Rp 499.000 per bulan per badan usaha. Tambah 10 atau 200 orang, tagihannya tidak bergerak.",
      en: "Rp 499,000 a month per legal entity. Add 10 people or 200 — the bill does not move.",
    },
  },
  {
    icon: Percent,
    value: { id: "Kepatuhan bawaan", en: "Compliance built in" },
    label: {
      id: "PPN, PPh 21 metode TER, dan BPJS terhitung otomatis. XML-nya langsung diimpor ke Coretax DJP.",
      en: "VAT, PPh 21 (TER method), and BPJS calculated automatically. The XML imports straight into Coretax.",
    },
  },
  {
    icon: Building2,
    value: { id: "Multi-entitas", en: "Multi-entity" },
    label: {
      id: "Tiap badan usaha punya basis data sendiri. Laporan konsolidasi disusun lintas perusahaan, termasuk eliminasi antar-perusahaan.",
      en: "Each legal entity gets its own database. Consolidated reports span companies, intercompany eliminations included.",
    },
  },
  {
    icon: Database,
    value: { id: "Tanpa kunci vendor", en: "No vendor lock-in" },
    label: {
      id: "Seluruh tabel dapat diunduh sebagai CSV kapan saja — termasuk setelah langganan berakhir.",
      en: "Every table downloads as CSV any time — including after the subscription ends.",
    },
  },
];

export type ShowcaseItem = {
  id: string;
  label: Dual;
  icon: LucideIcon;
  /**
   * Peragaan yang diputar untuk butir ini (Fase 38b).
   *
   * Dulu `image: string` berisi jalur `.webp`. Bertipe `string`, jadi salah
   * ketik nama berkas lolos typecheck, lolos lint, lolos uji, dan baru terlihat
   * sebagai gambar rusak di halaman jualan. `PeragaanId` menutup kelas itu:
   * peragaan yang tidak terdaftar adalah galat kompilasi.
   */
  peragaan: PeragaanId;
  title: Dual;
  benefits: Dual[];
};

export const SHOWCASE: ShowcaseItem[] = [
  {
    id: "pos",
    label: { id: "Kasir", en: "Till" },
    icon: Store,
    peragaan: "kasir-shift",
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
    peragaan: "faktur-berantai",
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
    peragaan: "laporan-tersusun",
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
    peragaan: "gaji-sekali-jalan",
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
    peragaan: "stok-tepercaya",
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
    manual: { id: "Menulis nota, menyalinnya ke buku, lalu menghitung ulang di Excel", en: "Write a note, copy it into a book, recompute in Excel" },
    erpindo: { id: "Cukup mencatat sekali; stok dan tagihan ikut terisi sendiri.", en: "Record once. Stock and receivables fill themselves in." },
  },
  {
    topic: { id: "Menghitung PPN", en: "Working out VAT" },
    manual: { id: "Merekap manual tiap masa pajak, dan mudah selisih", en: "Manual recap each tax period, easy to get wrong" },
    erpindo: { id: "PPN terhitung di setiap faktur, dan berkasnya siap diunggah ke Coretax.", en: "VAT is computed on every invoice. The file is ready to upload to Coretax." },
  },
  {
    topic: { id: "Menggaji karyawan", en: "Paying staff" },
    manual: { id: "Menghitung PPh 21 satu per satu di kalkulator", en: "Compute income tax one employee at a time on a calculator" },
    erpindo: { id: "Sekali klik, PPh 21 dan BPJS terhitung serta slip gajinya langsung terbentuk.", en: "One click: income tax, social security, and payslips are done." },
  },
  {
    topic: { id: "Menjaga stok", en: "Keeping stock straight" },
    manual: { id: "Sering selisih, dan modal barang hanya ditebak", en: "Often mismatched, cost of goods is guesswork" },
    erpindo: { id: "Modal barang terhitung otomatis, dan barang yang mendekati kedaluwarsa keluar lebih dulu.", en: "Cost of goods is calculated automatically. Stock nearest to expiry goes out first." },
  },
  {
    topic: { id: "Melihat untung rugi", en: "Seeing profit and loss" },
    manual: { id: "Menyusunnya butuh berhari-hari di akhir bulan", en: "Assembled over days at month end" },
    erpindo: { id: "Laporannya siap kapan pun Anda buka.", en: "The report is ready whenever you open it." },
  },
  {
    topic: { id: "Menagih pelanggan", en: "Chasing payment" },
    manual: { id: "Baru menyadari keterlambatannya saat kas menipis", en: "You notice only when cash runs low" },
    erpindo: { id: "Tagihan yang telah jatuh tempo muncul sendiri di halaman depan.", en: "Overdue invoices surface on your home screen by themselves." },
  },
];

/**
 * Daftar modul yang semuanya termasuk dalam paket (dipakai seksi Harga).
 *
 * Fase 33i — ditulis ulang dengan register yang sama dengan seksi lain di
 * halaman depan. Fase 32e sudah membuang istilah akuntan dari bilah bukti,
 * showcase, dan tabel perbandingan ("jurnal double-entry … neracanya dijamin
 * seimbang" → "Stok langsung berkurang, laporan keuangan terisi"), tetapi
 * daftar ini tertinggal dan masih berbunyi "Akuntansi double-entry",
 * "Stok multi-gudang & FEFO", "Manufaktur, BoM & QC".
 *
 * Letaknya membuat itu mahal: ia ada di seksi **Harga** — layar terakhir
 * sebelum orang memutuskan membayar, dan satu-satunya tempat di halaman depan
 * yang menjanjikan "seluruh modul terbuka". Daftar yang tidak bisa dibaca tidak
 * membuktikan apa pun.
 *
 * Istilah yang TETAP: PPN, PPh 21, TER, BPJS, e-Faktur, Coretax, POS, CRM,
 * Excel. Semuanya kata yang pemilik usaha Indonesia memang memakainya sehari-
 * hari (keputusan Fase 32e); menghindarinya justru membuat daftar ini
 * mengambang.
 */
export const SINGLE_PLAN_MODULES: Dual[] = [
  { id: "Pembukuan & laporan keuangan", en: "Bookkeeping & financial reports" },
  { id: "Faktur & PPN (Coretax)", en: "Invoices & VAT (Coretax)" },
  { id: "Kasir (POS) & tutup shift", en: "POS cashier & shift close-out" },
  { id: "Stok banyak gudang & kedaluwarsa", en: "Stock across warehouses & expiry" },
  { id: "Pesanan, surat jalan & faktur", en: "Orders, delivery notes & invoices" },
  { id: "Pembelian & pengadaan", en: "Purchasing & procurement" },
  { id: "Gaji + PPh 21 TER + BPJS", en: "Payroll + PPh 21 TER + BPJS" },
  { id: "Absensi & cuti karyawan", en: "Attendance & employee leave" },
  { id: "Calon pelanggan & penawaran", en: "Prospects & quotations" },
  { id: "Proyek, anggaran & catatan jam", en: "Projects, budgets & time logs" },
  { id: "Produksi, resep & pemeriksaan mutu", en: "Production, recipes & quality checks" },
  { id: "Aset tetap & penyusutan", en: "Fixed assets & depreciation" },
  { id: "Pajak badan & e-Faktur", en: "Corporate tax & e-Faktur" },
  { id: "Anggaran & pencocokan rekening koran", en: "Budgets & bank statement matching" },
  { id: "Persetujuan bertingkat", en: "Multi-level approvals" },
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
      id: "Perusahaan Anda memiliki penyimpanan sendiri. Datanya tidak dicampur dengan data pengguna lain.",
      en: "Your company gets its own storage. It is never mixed with other users.",
    },
  },
  {
    icon: ScrollText,
    title: { id: "Catatan keuangan tidak bisa dihapus", en: "Financial records cannot be deleted" },
    desc: {
      id: "Jika ada yang salah, koreksinya dicatat sebagai transaksi baru. Jejaknya tetap utuh, dan inilah yang ditelusuri saat pemeriksaan pajak.",
      en: "If something is wrong, the fix is recorded as a new entry. The trail stays intact — exactly what a tax audit looks for.",
    },
  },
  {
    icon: KeyRound,
    title: { id: "Masuk dengan dua langkah", en: "Two-step sign-in" },
    desc: {
      id: "Selain kata sandi, akun dapat dikunci dengan kode dari ponsel Anda.",
      en: "Beyond a password, your account can be locked with a code from your phone.",
    },
  },
  {
    icon: Lock,
    title: { id: "Atur siapa yang boleh melihat apa", en: "Decide who sees what" },
    desc: {
      id: "Kasir cukup melihat layar kasir, sedangkan staf gudang cukup melihat stok. Setiap perubahan penting tercatat beserta pelakunya.",
      en: "Cashiers see the till, warehouse staff see stock. Every important change records who made it.",
    },
  },
  {
    icon: CloudDownload,
    title: { id: "Data dapat dibawa pergi", en: "You can take your data with you" },
    desc: {
      id: "Unduh seluruhnya kapan saja dalam bentuk berkas Excel, termasuk setelah berhenti berlangganan.",
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

/**
 * Empat penyebab proyek ERP gagal, dan apa yang menggantikannya di sini
 * (Fase 37c).
 *
 * Ini seksi terpenting di halaman bagi pembeli perusahaan, karena ia menjawab
 * keberatan NOMOR SATU — bukan harga, melainkan "proyeknya akan gagal seperti
 * yang dulu". Persentasenya nyata dan bersumber; lihat docs/posisi-produk.md.
 *
 * Aturan yang mengikat isi tabel ini: tiap jawaban harus bisa ditunjuk barisnya
 * di produk. Tidak ada yang boleh berbunyi seperti janji.
 */
export const KEGAGALAN_ERP: { sebab: Dual; angka: Dual; jawaban: Dual }[] = [
  {
    sebab: { id: "Migrasi data yang berantakan", en: "Botched data migration" },
    angka: { id: "34% penyebab pembengkakan biaya", en: "34% of budget overruns" },
    jawaban: {
      id: "Produk dan kontak diimpor dari CSV dengan pratinjau dan laporan per baris, jadi baris bermasalah terlihat sebelum apa pun tersimpan. Saldo awal menjadi satu jurnal pembuka yang otomatis seimbang.",
      en: "Products and contacts import from CSV with a preview and per-row report, so bad rows surface before anything is saved. Opening balances become a single opening entry that balances itself.",
    },
  },
  {
    sebab: { id: "Ruang lingkup yang terus melar", en: "Scope that keeps expanding" },
    angka: { id: "35% penyebab pembengkakan biaya", en: "35% of budget overruns" },
    jawaban: {
      id: "Seluruh modul sudah terbuka sejak hari pertama. Tidak ada yang perlu dinegosiasikan, dibeli menyusul, atau dibuka dengan biaya tambahan.",
      en: "Every module is unlocked from day one. Nothing needs negotiating, buying later, or unlocking for a fee.",
    },
  },
  {
    sebab: { id: "Tim implementasi kurang orang", en: "Understaffed implementation team" },
    angka: { id: "38% penyebab pembengkakan biaya", en: "38% of budget overruns" },
    jawaban: {
      id: "Tidak ada tim implementasi yang perlu disiapkan. Bagan akun standar Indonesia, tarif PPN, PPh 21 metode TER, dan BPJS sudah terpasang saat perusahaan dibuat.",
      en: "There is no implementation team to staff. The Indonesian chart of accounts, VAT rates, PPh 21 TER, and BPJS are in place the moment the company is created.",
    },
  },
  {
    sebab: { id: "Tim menolak memakainya", en: "The team will not adopt it" },
    angka: { id: "penyebab kegagalan paling sering dilaporkan", en: "the most reported cause of failure" },
    jawaban: {
      id: "Demo publik berisi satu perusahaan dengan data setahun penuh. Tim Anda bisa menelusurinya sebelum satu rupiah pun dikeluarkan, dan sebelum satu orang pun dilatih.",
      en: "The public demo holds one company with a full year of data. Your team can explore it before a single rupiah is spent, and before anyone is trained.",
    },
  },
];
