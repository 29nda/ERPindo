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
// Fase 38p — `formatRupiah` pindah ke `@erpindo/shared` (glosarium §6 memang
// sudah menyatakannya di sana; sampai fase ini pernyataan itu tidak benar).
export { formatRupiah } from "@erpindo/shared";
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
      id: "Tagihannya per badan usaha, bukan per kepala. Mau menambah 10 orang atau 200 orang, angkanya tetap sama.",
      en: "You are billed per legal entity, never per head. Add 10 people or 200 — the figure does not move.",
    },
  },
  {
    icon: Percent,
    value: { id: "Pajak terhitung otomatis", en: "Tax calculated automatically" },
    label: {
      id: "PPN, PPh 21 metode TER, dan BPJS dihitung sendiri oleh sistem. Berkas XML-nya siap diunggah ke Coretax DJP.",
      en: "VAT, PPh 21 (TER method), and BPJS calculated automatically. The XML imports straight into Coretax.",
    },
  },
  {
    icon: Building2,
    value: { id: "Banyak badan usaha, satu akun", en: "Many entities, one account" },
    label: {
      id: "Tiap badan usaha memakai basis data sendiri. Laporan konsolidasi disusun lintas perusahaan, lengkap dengan eliminasi antar-perusahaan.",
      en: "Each legal entity gets its own database. Consolidated reports span companies, intercompany eliminations included.",
    },
  },
  {
    icon: Database,
    value: { id: "Data tetap milik Anda", en: "Your data stays yours" },
    label: {
      id: "Seluruh tabel dapat diunduh sebagai berkas CSV kapan saja, termasuk setelah langganan berakhir.",
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
    title: { id: "Jual di kasir, pembukuannya ikut tercatat", en: "Sell at the till, the books record themselves" },
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
    title: { id: "Buat faktur dalam hitungan detik", en: "Raise an invoice in seconds" },
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
    title: { id: "Lihat untung rugi kapan saja", en: "Check your profit any time" },
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
    title: { id: "Hitung gaji dan PPh 21 sekali klik", en: "Run payroll and PPh 21 in one click" },
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
    title: { id: "Pantau stok tanpa selisih", en: "Track stock without discrepancies" },
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
    erpindo: { id: "Cukup mencatat sekali. Stok dan tagihan pelanggan ikut terisi.", en: "Record once. Stock and receivables fill themselves in." },
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
    manual: { id: "Sering selisih, dan modal barang hanya dikira-kira", en: "Often mismatched, cost of goods is guesswork" },
    erpindo: { id: "Modal barang terhitung otomatis, dan barang yang mendekati kedaluwarsa keluar lebih dulu.", en: "Cost of goods is calculated automatically. Stock nearest to expiry goes out first." },
  },
  {
    topic: { id: "Melihat untung rugi", en: "Seeing profit and loss" },
    manual: { id: "Menyusunnya butuh berhari-hari di akhir bulan", en: "Assembled over days at month end" },
    erpindo: { id: "Laporannya siap kapan pun Anda buka.", en: "The report is ready whenever you open it." },
  },
  {
    topic: { id: "Menagih pelanggan", en: "Chasing payment" },
    manual: { id: "Keterlambatan baru diketahui saat kas menipis", en: "You notice only when cash runs low" },
    erpindo: { id: "Faktur yang jatuh tempo langsung tampil di halaman depan.", en: "Overdue invoices appear on your home screen straight away." },
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


/**
 * Empat pertanyaan yang biasanya muncul sebelum memutuskan (Fase 40c).
 *
 * ## Kenapa bentuknya berubah
 *
 * Seksi ini dulu berjudul "Empat sebab proyek ERP gagal" dan memajang tiga
 * persentase kegagalan industri (34%, 35%, 38%). Bentuk itu keputusan Fase 37c
 * yang berpijak pada `docs/posisi-produk.md`: pembeli perusahaan disebut
 * paling takut proyeknya gagal seperti yang dulu.
 *
 * Keputusan pemilik pada Fase 40c membatalkannya. Alasannya: seluruh halaman
 * jadi berbicara dari sudut pandang ORANG DALAM INDUSTRI ERP — proyek
 * pemasangan, tingkat kegagalan, taksonomi penyebab pembengkakan biaya —
 * padahal pembacanya menjalankan perusahaan sendiri dan tidak mengikuti
 * industri perangkat lunak. Halaman yang membuka dengan statistik kegagalan
 * kategorinya sendiri menjelaskan bisnis ERP, bukan menjelaskan produknya.
 *
 * Posisi seksi ini di corong TIDAK berubah: ia tetap menjawab keberatan
 * sebelum tombol daftar. Yang berubah, keberatannya kini ditulis sebagai
 * pertanyaan yang benar-benar diajukan pelanggan, bukan sebagai kegagalan yang
 * dialami vendor lain.
 *
 * Argumen kegagalan ERP tidak hilang dari situs. Ia tetap hidup di `/tentang`,
 * halaman yang memang menjelaskan kenapa produk ini dibangun, lengkap dengan
 * sumbernya.
 *
 * Aturan yang mengikat isi tabel ini tidak berubah: tiap jawaban harus bisa
 * ditunjuk barisnya di produk, dan tidak boleh berbunyi seperti janji.
 */
export const PERTANYAAN_SEBELUM_MULAI: { tanya: Dual; jawaban: Dual }[] = [
  {
    tanya: { id: "Data yang sudah ada bagaimana?", en: "What happens to the data we already have?" },
    jawaban: {
      id: "Produk, kontak, dan saldo awal diimpor dari berkas Excel atau CSV. Tiap baris ditampilkan lebih dulu sebagai pratinjau, jadi baris yang bermasalah terlihat sebelum apa pun tersimpan. Saldo awal masuk sebagai satu jurnal pembuka yang otomatis seimbang.",
      en: "Products, contacts, and opening balances import from an Excel or CSV file. Every row is previewed first, so problem rows surface before anything is saved. Opening balances enter as a single opening entry that balances itself.",
    },
  },
  {
    tanya: { id: "Tim kami perlu dilatih dulu?", en: "Does our team need training first?" },
    jawaban: {
      id: "Tidak perlu menunggu pelatihan untuk menilainya. Demo publik sudah berisi satu perusahaan dengan data setahun penuh, dan tim Anda dapat menelusurinya lebih dulu tanpa mendaftar serta tanpa biaya.",
      en: "You do not need training to judge it. The public demo already holds a company with a full year of data, and your team can explore it first without signing up and without paying.",
    },
  },
  {
    tanya: { id: "Nanti ada biaya tambahan?", en: "Will there be extra charges later?" },
    jawaban: {
      id: "Satu harga per perusahaan per bulan, dan seluruh modul sudah terbuka sejak hari pertama. Tidak ada fitur yang dikunci untuk dijual menyusul, dan menambah pengguna tidak menambah tagihan.",
      en: "One price per company per month, with every module unlocked from day one. No feature is held back to be sold later, and adding users does not add to the bill.",
    },
  },
  {
    tanya: { id: "Kalau suatu saat kami berhenti?", en: "What if we stop subscribing?" },
    jawaban: {
      id: "Seluruh data dapat diunduh sebagai berkas CSV kapan saja, termasuk setelah langganan berakhir. Akun beralih ke mode baca-saja, jadi catatan lama tetap dapat dibuka dan dicari.",
      en: "All your data downloads as CSV files at any time, including after the subscription ends. The account switches to read-only, so old records stay open and searchable.",
    },
  },
];
