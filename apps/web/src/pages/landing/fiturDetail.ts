import {
  BookOpenCheck,
  Boxes,
  Building2,
  ClipboardCheck,
  Combine,
  Factory,
  FileSpreadsheet,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  ReceiptText,
  Repeat,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Dual } from "../../i18n";

/**
 * Konten mendalam per modul untuk halaman `/fitur` (Fase 18f).
 *
 * Dipisah dari `sections.ts` supaya berkas itu tetap fokus pada halaman depan,
 * TETAPI sengaja tinggal di folder yang sama: keduanya harus dirawat bersama
 * agar landing dan `/fitur` tidak saling bertentangan.
 *
 * Bentuk tiap entri mengikuti urutan yang benar-benar dipikirkan calon pemakai:
 * masalah yang ia rasakan → apa yang aplikasi lakukan → apa hasilnya. Bukan
 * daftar kemampuan, karena daftar kemampuan tidak menjawab "buat saya apa".
 *
 * Gambar memakai tangkapan layar produk NYATA yang sudah ada di
 * `public/landing/` dan `public/panduan/` (diregenerasi tema terang pada 18a).
 */
export type ModulDetail = {
  id: string;
  icon: LucideIcon;
  nama: Dual;
  /** Masalah yang dirasakan sebelum memakai ERPindo. */
  masalah: Dual;
  /** Bagaimana ERPindo mengerjakannya — langkah konkret, bukan kata sifat. */
  cara: Dual[];
  /** Hasil yang didapat, sedapat mungkin bisa diperiksa sendiri. */
  hasil: Dual;
  /**
   * Tangkapan layar produk NYATA. Opsional (Fase 24c): beberapa modul belum
   * punya tangkapan layarnya sendiri, dan meminjam milik modul lain akan
   * menampilkan layar yang bukan miliknya. Lebih baik tanpa gambar daripada
   * dengan gambar yang salah.
   *
   * Fase 25b: dua modul terakhir yang tak bergambar (Kas & Bank, Asisten AI)
   * sudah punya miliknya sendiri — kini SELURUH entri bergambar. Sifat opsional
   * ini sengaja dipertahankan untuk modul yang ditambahkan kelak.
   */
  gambar?: string;
};

export const MODUL_DETAIL: ModulDetail[] = [
  {
    id: "akuntansi",
    icon: BookOpenCheck,
    nama: { id: "Akuntansi & Jurnal", en: "Accounting & Journals" },
    masalah: {
      id: "Pembukuan dikerjakan dua kali: sekali di buku penjualan, sekali lagi saat menyusun laporan. Begitu ada yang tidak cocok, tidak jelas angka mana yang benar.",
      en: "The books get done twice: once in the sales log, again when compiling reports. When something doesn't match, it's unclear which number is right.",
    },
    cara: [
      {
        id: "Setiap transaksi — faktur, kasir, gaji, penyusutan aset — otomatis membuat jurnal double-entry saat disimpan. Tidak ada langkah 'posting ke akuntansi' yang bisa terlupa.",
        en: "Every transaction — invoice, POS sale, payroll, depreciation — automatically creates a double-entry journal on save. There is no separate 'post to accounting' step to forget.",
      },
      {
        id: "Bagan akun standar Indonesia sudah terpasang sejak hari pertama, dan bisa ditambah sendiri.",
        en: "A standard Indonesian chart of accounts is preloaded from day one, and you can extend it yourself.",
      },
      {
        id: "Jurnal tidak pernah dihapus. Koreksi dilakukan lewat jurnal pembalik, sehingga jejaknya utuh untuk diperiksa.",
        en: "Journals are never deleted. Corrections happen through reversing entries, so the trail stays intact for review.",
      },
      {
        id: "Tutup buku per periode mengunci angka yang sudah final agar tidak berubah diam-diam.",
        en: "Period close locks finalised figures so they cannot change quietly.",
      },
    ],
    hasil: {
      id: "Neraca Saldo selalu seimbang — dan bila tidak, sistem menolak menyimpannya. Laporan dibaca dari satu sumber: jurnal.",
      en: "The trial balance always balances — and if it wouldn't, the system refuses to save. Reports read from a single source: the journal.",
    },
    gambar: "/panduan/akuntansi-1.webp",
  },
  {
    id: "faktur",
    icon: ReceiptText,
    nama: { id: "Faktur & Pembayaran", en: "Invoices & Payments" },
    masalah: {
      id: "Faktur dibuat di Word, PPN dihitung di kalkulator, piutang dicatat di buku terpisah. Yang lewat jatuh tempo baru terasa saat kas menipis.",
      en: "Invoices in Word, VAT on a calculator, receivables in a separate book. Overdue bills only register when cash runs low.",
    },
    cara: [
      {
        id: "Satu kali posting menyelesaikan tiga hal sekaligus: jurnal, pengurangan stok, dan pencatatan piutang.",
        en: "A single posting settles three things at once: the journal, the stock reduction, and the receivable.",
      },
      {
        id: "PPN 0/11/12% dan diskon per baris dihitung otomatis, termasuk DPP nilai lain 11/12 sesuai PMK 131/2024.",
        en: "VAT at 0/11/12% and per-line discounts are computed automatically, including the 11/12 alternative tax base per PMK 131/2024.",
      },
      {
        id: "Salah input bisa dibatalkan atau diretur — pembukuannya terbalik dengan persis, bukan ditimpa.",
        en: "Mistakes can be voided or returned — the books reverse exactly, rather than being overwritten.",
      },
      {
        id: "Umur piutang dan lonceng pengingat jatuh tempo muncul tanpa perlu dicari.",
        en: "Receivables aging and due-date reminder bells surface without being hunted for.",
      },
    ],
    hasil: {
      id: "Faktur berkop siap cetak atau PDF dalam hitungan detik, dan tidak ada tagihan yang lewat tanpa terlihat.",
      en: "Branded invoices ready to print or PDF in seconds, and no bill slips past unseen.",
    },
    gambar: "/landing/showcase-penjualan.webp",
  },
  {
    id: "pos",
    icon: Store,
    nama: { id: "Kasir (POS)", en: "POS Cashier" },
    masalah: {
      id: "Kasir memakai aplikasi terpisah, lalu setoran harian dicatat ulang ke pembukuan. Selisih kas ditemukan berhari-hari kemudian, tanpa tahu shift siapa.",
      en: "The cashier runs on a separate app, then daily takings get re-entered into the books. Cash variances surface days later, with no idea whose shift it was.",
    },
    cara: [
      {
        id: "Layar kasir dengan pencarian produk kilat, diskon per item, dan pembayaran non-tunai (QRIS, kartu, e-wallet) multi-tender.",
        en: "A cashier screen with instant product search, per-item discounts, and multi-tender non-cash payments (QRIS, card, e-wallet).",
      },
      {
        id: "Sesi shift kas: buka dengan kas awal, jual, tutup dengan hitungan fisik. Selisihnya otomatis terjurnal dan tercatat milik shift siapa.",
        en: "Cash shift sessions: open with a starting float, sell, close with a physical count. The variance is auto-journaled and attributed to that shift.",
      },
      {
        id: "Tetap bisa berjualan saat internet putus, karena aplikasinya PWA yang bisa dipasang di perangkat.",
        en: "Keeps selling when the internet drops, because the app is an installable PWA.",
      },
    ],
    hasil: {
      id: "Penjualan hari ini sudah masuk laporan keuangan hari ini — bukan besok, dan bukan setelah diketik ulang.",
      en: "Today's sales are in today's financial reports — not tomorrow, and not after being retyped.",
    },
    gambar: "/landing/showcase-pos.webp",
  },
  {
    id: "stok",
    icon: Boxes,
    nama: { id: "Stok & Gudang", en: "Stock & Warehouse" },
    masalah: {
      id: "Stok di catatan tidak sama dengan stok di rak. HPP ditebak, jadi laba yang dilaporkan sebenarnya tidak diketahui. Barang kedaluwarsa ditemukan saat sudah telat.",
      en: "Recorded stock doesn't match what's on the shelf. COGS is guessed, so reported profit is really unknown. Expired goods are found too late.",
    },
    cara: [
      {
        id: "Stok multi-gudang dengan HPP rata-rata bergerak dihitung ulang otomatis di setiap penjualan dan pembelian.",
        en: "Multi-warehouse stock with moving-average COGS recalculated automatically on every sale and purchase.",
      },
      {
        id: "Lot dan tanggal kedaluwarsa: penjualan mengambil lot yang paling dekat kedaluwarsa lebih dulu (FEFO), otomatis.",
        en: "Lots and expiry dates: sales pull the nearest-expiry lot first (FEFO), automatically.",
      },
      {
        id: "Ambang stok minimum memicu usulan pembelian yang bisa langsung jadi Permintaan Pembelian.",
        en: "Minimum-stock thresholds trigger purchase suggestions that can become a Purchase Request in one click.",
      },
      {
        id: "Stok opname mencatat selisih fisik sebagai jurnal penyesuaian, bukan sebagai angka yang diubah tanpa jejak.",
        en: "Stock counts record physical variances as adjusting journals, not as numbers silently edited.",
      },
    ],
    hasil: {
      id: "Nilai persediaan di neraca berasal dari perhitungan, bukan perkiraan — dan lot yang mau kedaluwarsa muncul sebelum jadi kerugian.",
      en: "Inventory value on the balance sheet comes from calculation, not estimation — and lots nearing expiry surface before they become a loss.",
    },
    gambar: "/landing/showcase-stok.webp",
  },
  {
    id: "payroll",
    icon: Wallet,
    nama: { id: "Gaji & PPh 21", en: "Payroll & Income Tax" },
    masalah: {
      id: "Gaji dihitung di Excel tiap bulan, PPh 21 metode TER dihitung ulang per karyawan, BPJS dicek manual. Beban gaji baru masuk pembukuan belakangan — kalau tidak lupa.",
      en: "Payroll in Excel every month, PPh 21 (TER method) recomputed per employee, BPJS checked by hand. Payroll expense hits the books later — if it isn't forgotten.",
    },
    cara: [
      {
        id: "PPh 21 metode TER terbaru dan BPJS Kesehatan & Ketenagakerjaan dihitung otomatis dari data karyawan.",
        en: "The latest PPh 21 TER method plus BPJS health & employment are computed automatically from employee data.",
      },
      {
        id: "Slip gaji per karyawan siap cetak atau kirim, termasuk formulir 1721-A1.",
        en: "Per-employee payslips ready to print or send, including the 1721-A1 form.",
      },
      {
        id: "Beban gaji, utang BPJS, dan utang PPh langsung terjurnal saat penggajian dijalankan.",
        en: "Payroll expense, BPJS payable, and tax payable are journaled the moment payroll runs.",
      },
      {
        id: "Absensi, cuti, dan kasbon karyawan tercatat di modul yang sama.",
        en: "Attendance, leave, and employee advances live in the same module.",
      },
    ],
    hasil: {
      id: "Gajian jadi pekerjaan sekali klik, dan laporan keuangan bulan itu sudah memuat beban gaji yang benar.",
      en: "Payroll becomes a one-click job, and that month's financial reports already carry the correct payroll expense.",
    },
    gambar: "/landing/showcase-gaji.webp",
  },
  {
    id: "pajak",
    icon: FileSpreadsheet,
    nama: { id: "Pajak & e-Faktur", en: "Tax & e-Faktur" },
    masalah: {
      id: "Tiap masa pajak dimulai dengan merekap ulang faktur satu per satu. Rekapnya rawan selisih, dan formatnya harus disesuaikan lagi untuk Coretax.",
      en: "Every tax period starts by re-tallying invoices one by one. The tally is error-prone, and the format needs reworking again for Coretax.",
    },
    cara: [
      {
        id: "PPN keluaran dan masukan terkumpul otomatis dari faktur yang sudah Anda buat — tidak ada rekap manual.",
        en: "Output and input VAT accumulate automatically from the invoices you already created — no manual tally.",
      },
      {
        id: "Faktur keluaran diekspor sebagai XML yang langsung diimpor ke Coretax DJP.",
        en: "Output invoices export as XML that imports straight into Coretax (DJP).",
      },
      {
        id: "PPh Final UMKM dan PPh 23 dihitung di modul yang sama, lengkap dengan dasar pengenaannya.",
        en: "SME final income tax and PPh 23 are computed in the same module, with their tax bases shown.",
      },
    ],
    hasil: {
      id: "Masa pajak selesai dari data yang sudah ada, bukan dari pekerjaan rekap baru.",
      en: "A tax period is completed from data you already have, not from fresh tallying work.",
    },
    gambar: "/panduan/pajak-1.webp",
  },
  {
    id: "laporan",
    icon: LineChart,
    nama: { id: "Laporan Keuangan", en: "Financial Reports" },
    masalah: {
      id: "Laporan disusun berhari-hari di akhir bulan, dan begitu selesai angkanya sudah tidak menggambarkan keadaan hari ini.",
      en: "Reports take days to compile at month-end, and by the time they're done the numbers no longer describe today.",
    },
    cara: [
      {
        id: "Laba Rugi, Neraca, Arus Kas, Buku Besar, dan Umur Piutang/Utang dibaca langsung dari jurnal, kapan pun diminta.",
        en: "P&L, Balance Sheet, Cash Flow, General Ledger, and Receivables/Payables Aging read straight from the journal, whenever asked.",
      },
      {
        id: "Bisa dilihat per dimensi atau cost center per cabang, bukan hanya total perusahaan.",
        en: "Viewable per dimension or per-branch cost center, not just company totals.",
      },
      {
        id: "Ekspor Excel/CSV untuk diolah lanjut, dan tata cetak yang rapi untuk dilampirkan.",
        en: "Excel/CSV export for further work, and clean print layouts for attachments.",
      },
      {
        id: "Laporan terjadwal bisa dikirim otomatis ke email pada tanggal yang Anda tentukan.",
        en: "Scheduled reports can be emailed automatically on dates you choose.",
      },
    ],
    hasil: {
      id: "Pertanyaan 'bulan ini untung atau rugi' bisa dijawab sekarang, bukan dua minggu lagi.",
      en: "The question \"are we profitable this month\" can be answered now, not in two weeks.",
    },
    gambar: "/landing/showcase-laporan.webp",
  },
  {
    id: "multi",
    icon: Combine,
    nama: { id: "Multi-perusahaan & Konsolidasi", en: "Multi-company & Consolidation" },
    masalah: {
      id: "Tiap badan usaha punya pembukuan sendiri di berkas terpisah. Melihat gambaran gabungan berarti menyalin angka ke spreadsheet ketiga.",
      en: "Each entity keeps its own books in a separate file. Seeing the combined picture means copying figures into a third spreadsheet.",
    },
    cara: [
      {
        id: "Beberapa perusahaan dikelola dari satu akun, dan berpindah antar perusahaan cukup lewat pemilih di sidebar.",
        en: "Several companies managed from one account, switching between them via a sidebar picker.",
      },
      {
        id: "Laporan konsolidasi Laba Rugi & Neraca lintas perusahaan disusun sistem, bukan tangan.",
        en: "Consolidated P&L and Balance Sheet across companies are assembled by the system, not by hand.",
      },
      {
        id: "Faktur multi mata uang dengan kurs tercatat, termasuk selisih kurs saat pelunasan.",
        en: "Multi-currency invoices with recorded rates, including FX differences on settlement.",
      },
    ],
    hasil: {
      id: "Gambaran grup bisa dilihat tanpa menunggu tiap anak usaha mengirim rekap.",
      en: "The group picture is visible without waiting for each subsidiary to send a summary.",
    },
    gambar: "/panduan/konsolidasi-1.webp",
  },
  {
    id: "keamanan",
    icon: ShieldCheck,
    nama: { id: "Keamanan & Kepemilikan Data", en: "Security & Data Ownership" },
    masalah: {
      id: "Data usaha dipegang penyedia yang tidak jelas memisahkannya dari pelanggan lain, dan keluar dari layanan berarti kehilangan riwayat.",
      en: "Business data sits with a provider that isn't clear about separating it from other customers, and leaving means losing your history.",
    },
    cara: [
      {
        id: "Satu database terpisah untuk tiap perusahaan — data Anda tidak berada di tabel yang sama dengan pengguna lain.",
        en: "One separate database per company — your data does not sit in the same tables as anyone else's.",
      },
      {
        id: "Peran & hak akses per modul, verifikasi dua langkah (2FA), pembatasan IP, dan audit log untuk perubahan penting.",
        en: "Per-module roles & permissions, two-factor authentication, IP restrictions, and an audit log for important changes.",
      },
      {
        id: "Seluruh data bisa diunduh sebagai ZIP berisi CSV per tabel, kapan pun — termasuk setelah langganan berakhir.",
        en: "All data downloadable as a ZIP of per-table CSVs, anytime — including after your subscription ends.",
      },
    ],
    hasil: {
      id: "Anda bisa pergi kapan saja dan membawa seluruh riwayat pembukuan Anda. Itu yang membuat 'data Anda milik Anda' bukan sekadar slogan.",
      en: "You can leave whenever you want and take your entire accounting history with you. That is what makes \"your data is yours\" more than a slogan.",
    },
    gambar: "/panduan/pengaturan-1.webp",
  },

  // --- Fase 24c: modul yang sebelumnya tak pernah disebut di halaman jualan ---
  //
  // Halaman ini semula memuat 9 modul dari ±21 yang benar-benar ada. Sejak trial
  // dihapus, calon pelanggan tidak bisa lagi menemukan sisanya dengan mencoba
  // sendiri — jadi yang tidak tertulis di sini praktis tidak ada baginya.
  // Daftarnya disusun terhadap `docs/03-roadmap-lanjutan.md` (23 modul bernomor)
  // sebagai daftar periksa, bukan dari ingatan.
  {
    id: "dashboard",
    icon: LayoutDashboard,
    nama: { id: "Dasbor & Mulai Cepat", en: "Dashboard & Quick Start" },
    masalah: {
      id: "Angka bisnis tersebar di banyak tempat, jadi pertanyaan sesederhana \"bulan ini untung atau rugi?\" butuh membuka beberapa laporan dan menjumlahkan sendiri.",
      en: "Business numbers are scattered, so a question as simple as \"did we profit this month?\" means opening several reports and adding things up yourself.",
    },
    cara: [
      { id: "Satu layar memuat penjualan, laba bulan berjalan, kas & bank, piutang, utang, dan nilai persediaan — semuanya dihitung dari jurnal Anda sendiri.", en: "One screen holds sales, current-month profit, cash and bank, receivables, payables and inventory value — all computed from your own journals." },
      { id: "Tiap kartu bisa diklik menuju laporan sumbernya, jadi angka yang mengejutkan bisa langsung ditelusuri.", en: "Every card links through to the report behind it, so a surprising number can be traced immediately." },
      { id: "Widget peringatan aktif: faktur lewat jatuh tempo, stok menipis, dan beban yang melonjak dibanding kebiasaan tiga bulan terakhir.", en: "Active warning widgets: overdue invoices, low stock, and expenses that spiked against the last three months' pattern." },
      { id: "Checklist \"Mulai cepat\" menuntun pengisian awal; contoh produk & kontak bisa diisikan sekali klik sesuai jenis usaha.", en: "A quick-start checklist guides initial setup; sample products and contacts can be filled in with one click per business type." },
    ],
    hasil: { id: "Kondisi bisnis terbaca dalam hitungan detik setelah masuk, bukan setelah menyusun laporan.", en: "You read the state of the business seconds after signing in, not after assembling a report." },
    gambar: "/landing/hero-dashboard.webp",
  },
  {
    id: "pembelian",
    icon: ShoppingCart,
    nama: { id: "Pembelian & Pengadaan", en: "Purchasing & Procurement" },
    masalah: {
      id: "Barang datang tanpa dokumen yang cocok, dan tagihan pemasok baru ketahuan saat ditagih. Tidak ada jejak siapa memesan apa.",
      en: "Goods arrive without matching paperwork, and supplier bills only surface when they chase you. There is no trace of who ordered what.",
    },
    cara: [
      { id: "Alur lengkap permintaan (PR) → pesanan (PO) → penerimaan barang (GRN), masing-masing berstatus sendiri dan bisa disetujui atau ditolak.", en: "A full requisition (PR) → purchase order (PO) → goods receipt (GRN) flow, each with its own status and an approve/reject step." },
      { id: "Penerimaan barang otomatis menjadi faktur pembelian dan stok masuk — tidak diketik dua kali.", en: "A goods receipt automatically becomes a purchase invoice and a stock-in — never typed twice." },
      { id: "Produk di bawah stok minimum menjadi usulan pembelian sekali klik, tersambung langsung ke alur di atas.", en: "Products below their minimum become one-click purchase suggestions, wired straight into the flow above." },
      { id: "Harga pokok rata-rata diperbarui otomatis tiap penerimaan, termasuk saat satuan besar dikonversi (1 dus = 24 pcs).", en: "Average cost updates automatically on each receipt, including when bulk units convert (1 box = 24 pcs)." },
    ],
    hasil: { id: "Setiap barang yang masuk punya dokumen, harga, dan penanggung jawabnya.", en: "Everything that comes in has a document, a price, and someone accountable for it." },
    gambar: "/panduan/pembelian-1.webp",
  },
  {
    id: "persetujuan",
    icon: ClipboardCheck,
    nama: { id: "Persetujuan Berjenjang", en: "Multi-step Approvals" },
    masalah: {
      id: "Pengeluaran besar disetujui lewat pesan singkat, lalu tidak ada yang bisa membuktikan siapa menyetujui apa ketika ditanya belakangan.",
      en: "Big spends get approved over chat, and later nobody can prove who approved what.",
    },
    cara: [
      { id: "Aturan bisa disetel sendiri per jenis dokumen dan per ambang nilai — misalnya pembelian di atas Rp 5 juta wajib lewat Pemilik.", en: "Rules are configurable per document type and threshold — for example, purchases above Rp 5 million must pass the Owner." },
      { id: "Persetujuan berjalan berurutan per peran, dengan antrean pribadi untuk tiap penyetuju.", en: "Approvals run in sequence per role, with a personal queue for each approver." },
      { id: "Tiap langkah meninggalkan jejak: siapa, kapan, dan disetujui atau ditolak.", en: "Every step leaves a trail: who, when, and approved or rejected." },
    ],
    hasil: { id: "Keputusan pengeluaran punya bukti, bukan ingatan.", en: "Spending decisions have evidence, not recollection." },
    gambar: "/panduan/persetujuan-1.webp",
  },
  {
    id: "kasbank",
    icon: Landmark,
    nama: { id: "Kas & Bank", en: "Cash & Bank" },
    masalah: {
      id: "Saldo di aplikasi dan saldo di rekening tidak pernah sama, dan mencocokkannya berarti membaca mutasi baris demi baris tiap akhir bulan.",
      en: "The balance in your app never matches the bank, and reconciling means reading the statement line by line every month-end.",
    },
    cara: [
      { id: "Saldo tiap dompet (kas, bank, kas kecil) tampil di satu halaman lengkap dengan mutasi saldo berjalan.", en: "Every wallet balance (cash, bank, petty cash) sits on one page with a running-balance ledger." },
      { id: "Rekening koran diimpor dari CSV — format BCA, Mandiri, dan BRI sudah dikenali — lalu dicocokkan otomatis berdasarkan nominal dan tanggal (toleransi ±3 hari).", en: "Bank statements import from CSV — BCA, Mandiri and BRI formats are recognised — then auto-match on amount and date (±3 days tolerance)." },
      { id: "Aturan pencocokan bisa disimpan (kata kunci + toleransi), jadi mutasi yang berulang tiap bulan cocok sendiri.", en: "Matching rules can be saved (keyword + tolerance), so recurring monthly entries match themselves." },
      { id: "Kas kecil memakai sistem dana tetap: sistem menghitung sendiri berapa yang perlu diisikan, jadi angkanya tidak diketik dan tidak bisa salah ketik.", en: "Petty cash uses an imprest system: the app computes the top-up itself, so the figure is never typed and never mistyped." },
    ],
    hasil: { id: "Selisih dengan bank ketahuan saat terjadi, bukan saat tutup buku.", en: "Discrepancies with the bank surface when they happen, not at closing." },
    gambar: "/panduan/kasbank-1.webp",
  },
  {
    id: "aset",
    icon: Building2,
    nama: { id: "Aset Tetap", en: "Fixed Assets" },
    masalah: {
      id: "Penyusutan dihitung di spreadsheet terpisah dan sering telat dibukukan, sehingga laba terlihat lebih besar dari sebenarnya.",
      en: "Depreciation lives in a separate spreadsheet and is often booked late, making profit look bigger than it is.",
    },
    cara: [
      { id: "Register aset dengan nilai perolehan, umur manfaat, dan nilai residu; penyusutan dibukukan otomatis tiap bulan lewat jurnal.", en: "An asset register with cost, useful life and residual value; depreciation is journalled automatically every month." },
      { id: "Metode garis lurus maupun saldo menurun, dan penyusutan fiskal berdampingan bila umur menurut pajak berbeda dari pembukuan.", en: "Straight-line or declining-balance, plus a side-by-side tax depreciation when the fiscal life differs from the book life." },
      { id: "Pelepasan aset (dijual atau dibuang) menghitung laba/rugi sendiri dan menaruhnya di akun yang benar.", en: "Disposal (sold or scrapped) computes the gain or loss itself and posts it to the right account." },
      { id: "Revaluasi ke nilai wajar: kenaikan masuk ke Ekuitas sebagai Surplus Revaluasi, bukan menggelembungkan laba.", en: "Revaluation to fair value: increases go to Equity as a revaluation surplus, never inflating profit." },
    ],
    hasil: { id: "Beban penyusutan masuk tepat waktu, jadi laba yang Anda lihat adalah laba sesungguhnya.", en: "Depreciation lands on time, so the profit you see is the profit you have." },
    gambar: "/panduan/aset-1.webp",
  },
  {
    id: "crm",
    icon: Users,
    nama: { id: "CRM & Penawaran", en: "CRM & Quotations" },
    masalah: {
      id: "Calon pelanggan tercatat di kepala dan di catatan ponsel. Yang lupa di-follow-up baru terasa saat target bulanan meleset.",
      en: "Leads live in your head and your phone's notes. The ones you forgot to follow up only register when the monthly target is missed.",
    },
    cara: [
      { id: "Papan kanban funnel: kartu lead digeser antar tahap, dari baru sampai menang atau kalah.", en: "A kanban funnel: lead cards move between stages, from new through won or lost." },
      { id: "Aktivitas follow-up bertenggat masuk ke lonceng notifikasi saat jatuh tempo, dan lead yang terbengkalai lebih dari 7 hari ditandai.", en: "Follow-up activities carry due dates that ring the notification bell, and leads idle more than 7 days get flagged." },
      { id: "Penawaran punya masa berlaku dan halaman cetak berlogo; sekali klik ia berubah menjadi faktur tanpa mengetik ulang.", en: "Quotes carry a validity period and a branded print page; one click turns one into an invoice with no retyping." },
      { id: "Form penangkap lead publik bisa ditempel di web atau bio media sosial — pengisinya langsung masuk pipeline, ditandai asalnya.", en: "A public lead form can be embedded on your site or social bio — submissions land straight in the pipeline, tagged by source." },
      { id: "Laporan konversi per sumber menunjukkan kanal mana yang benar-benar menghasilkan, bukan yang paling ramai.", en: "Conversion-by-source reporting shows which channel actually closes, not which is loudest." },
    ],
    hasil: { id: "Tidak ada calon pelanggan yang hilang karena lupa dihubungi.", en: "No prospect is lost to a forgotten follow-up." },
    gambar: "/panduan/crm-1.webp",
  },
  {
    id: "anggaran",
    icon: Target,
    nama: { id: "Anggaran", en: "Budgeting" },
    masalah: {
      id: "Target hanya ada di kepala pemilik, jadi pemborosan baru ketahuan setelah uangnya habis.",
      en: "Targets exist only in the owner's head, so overspending only shows once the money is gone.",
    },
    cara: [
      { id: "Tetapkan target pendapatan dan beban per akun per bulan.", en: "Set revenue and expense targets per account per month." },
      { id: "Realisasinya diambil otomatis dari jurnal — tidak ada input kedua yang bisa berbeda dari pembukuan.", en: "Actuals come straight from the journals — there is no second input that can drift from the books." },
      { id: "Laporan selisih (varians) berwarna menunjukkan mana yang lewat target dan sebesar apa.", en: "A colour-coded variance report shows what went over target and by how much." },
    ],
    hasil: { id: "Pemborosan terlihat di pertengahan bulan, saat masih bisa dikoreksi.", en: "Overspending appears mid-month, while it can still be corrected." },
    gambar: "/panduan/anggaran-1.webp",
  },
  {
    id: "proyek",
    icon: FolderKanban,
    nama: { id: "Proyek", en: "Projects" },
    masalah: {
      id: "Untung-rugi per proyek tidak pernah jelas karena biayanya bercampur dengan biaya perusahaan secara keseluruhan.",
      en: "Per-project profitability is never clear because costs blend into the company's overall spending.",
    },
    cara: [
      { id: "Pendapatan dan biaya bisa ditandai per proyek langsung dari faktur maupun jurnal.", en: "Revenue and cost can be tagged per project straight from invoices or journals." },
      { id: "RAB per kategori dibandingkan dengan realisasi jurnal ber-tag, lengkap dengan progress bar.", en: "A cost plan per category is compared against tagged journal actuals, with progress bars." },
      { id: "Papan tugas kanban dengan penanggung jawab, prioritas, tenggat, dan beban kerja per orang; progres proyek dihitung dari tugasnya.", en: "A kanban task board with assignee, priority, due date and per-person workload; project progress derives from the tasks." },
      { id: "Gantt dengan dependensi \"setelah…\" serta baseline rencana vs aktual.", en: "A Gantt chart with \"after…\" dependencies plus planned-vs-actual baselines." },
      { id: "Timesheet (jam × tarif) memunculkan biaya tenaga kerja, dan termin penagihan menjadi faktur jasa yang tertaut ke proyeknya.", en: "Timesheets (hours × rate) surface labour cost, and billing milestones become service invoices linked to the project." },
    ],
    hasil: { id: "Setiap proyek punya angka laba sendiri yang bisa dipertanggungjawabkan.", en: "Every project carries its own defensible profit figure." },
    gambar: "/panduan/proyek-1.webp",
  },
  {
    id: "kontrak",
    icon: Repeat,
    nama: { id: "Kontrak & Tagihan Berulang", en: "Contracts & Recurring Billing" },
    masalah: {
      id: "Pelanggan langganan ditagih manual tiap bulan, dan yang terlewat berarti pendapatan yang hilang diam-diam.",
      en: "Subscription customers are billed by hand each month, and a missed one is revenue quietly lost.",
    },
    cara: [
      { id: "Kontrak menerbitkan faktur otomatis tiap periode, tanpa perlu diingat.", en: "Contracts issue invoices automatically each period, with nothing to remember." },
      { id: "Produk jasa didukung penuh (tanpa stok), termasuk harga khusus per grup pelanggan.", en: "Service products are fully supported (no stock), including price tiers per customer group." },
      { id: "Template jurnal berulang menangani biaya tetap seperti sewa — terbit sekali klik atau otomatis tiap bulan.", en: "Recurring journal templates handle fixed costs like rent — one click, or automatically each month." },
    ],
    hasil: { id: "Pendapatan berulang tertagih sendiri, bulan demi bulan.", en: "Recurring revenue bills itself, month after month." },
    gambar: "/panduan/kontrak-1.webp",
  },
  {
    id: "manufaktur",
    icon: Factory,
    nama: { id: "Manufaktur & QC", en: "Manufacturing & QC" },
    masalah: {
      id: "Harga pokok barang jadi ditebak, karena upah dan listrik pabrik tidak pernah sampai ke nilai barangnya.",
      en: "The cost of finished goods is guesswork, because labour and factory overhead never reach the item's value.",
    },
    cara: [
      { id: "Resep produk (BoM) dan perintah produksi mengubah bahan menjadi barang jadi dengan biaya gabungan.", en: "Bills of materials and production orders turn inputs into finished goods at a combined cost." },
      { id: "Upah dan overhead diisi per batch dan dibagi otomatis per unit — dan sisi lawannya membatalkan beban yang sudah tercatat di gaji, jadi biayanya tidak terhitung dua kali.", en: "Labour and overhead are entered per batch and split per unit — and the contra side reverses the expense already booked in payroll, so nothing is counted twice." },
      { id: "Work center dengan tarif per jam dan routing per produksi, lengkap dengan biaya standar vs aktual dan variannya.", en: "Work centres with hourly rates and per-order routing, with standard-vs-actual cost and variances." },
      { id: "Inspeksi QC memisahkan hasil yang lulus dari yang dikarantina.", en: "QC inspection separates passed output from quarantined output." },
    ],
    hasil: { id: "Harga jual disusun di atas harga pokok yang benar, bukan perkiraan.", en: "Selling prices are built on a true cost, not an estimate." },
    gambar: "/panduan/manufaktur-1.webp",
  },
  {
    id: "maintenance",
    icon: Wrench,
    nama: { id: "Pemeliharaan Aset", en: "Asset Maintenance" },
    masalah: {
      id: "Servis berkala terlewat sampai mesinnya berhenti, dan biaya perbaikannya tidak pernah tercatat sebagai biaya aset itu.",
      en: "Scheduled servicing slips until the machine stops, and the repair cost is never recorded against that asset.",
    },
    cara: [
      { id: "Jadwal servis berkala per aset; tugas terjadwal menerbitkan work order sendiri saat tiba waktunya.", en: "Per-asset service schedules; a scheduled job raises the work order itself when due." },
      { id: "Work order ad-hoc untuk kerusakan mendadak, dengan riwayat lengkap per aset.", en: "Ad-hoc work orders for sudden breakdowns, with full per-asset history." },
      { id: "Biaya tiap perbaikan dijurnal dan menempel pada asetnya.", en: "Each repair cost is journalled and sticks to its asset." },
    ],
    hasil: { id: "Mesin berhenti karena dijadwalkan, bukan karena kaget.", en: "Machines stop on schedule, not by surprise." },
    gambar: "/panduan/maintenance-1.webp",
  },
  {
    id: "helpdesk",
    icon: LifeBuoy,
    nama: { id: "Helpdesk", en: "Helpdesk" },
    masalah: {
      id: "Keluhan pelanggan masuk lewat berbagai kanal dan hilang di antaranya; tidak ada yang tahu mana yang sudah dibalas.",
      en: "Customer complaints arrive across channels and vanish between them; nobody knows which have been answered.",
    },
    cara: [
      { id: "Tiket dengan prioritas, status, dan penugasan ke anggota tim.", en: "Tickets with priority, status and assignment to a team member." },
      { id: "Balasan ke pelanggan dan catatan internal dipisah, jadi diskusi tim tidak pernah ikut terkirim.", en: "Customer replies and internal notes are separate, so team discussion never ships out by accident." },
      { id: "Umur tiket ditandai warna — kuning di atas 24 jam, merah di atas 72 jam.", en: "Ticket age is colour-flagged — amber past 24 hours, red past 72." },
    ],
    hasil: { id: "Tidak ada keluhan yang mengendap tanpa jawaban.", en: "No complaint sits unanswered." },
    gambar: "/panduan/helpdesk-1.webp",
  },
  {
    id: "asisten",
    icon: Sparkles,
    nama: { id: "Asisten AI", en: "AI Assistant" },
    masalah: {
      id: "Istilah akuntansi menghambat orang yang paham bisnisnya tetapi tidak paham jurnal.",
      en: "Accounting jargon blocks people who understand their business but not double-entry.",
    },
    cara: [
      { id: "Tanya cara pakai dengan bahasa sehari-hari; jawabannya berpijak pada panduan aplikasi, bukan karangan.", en: "Ask how to do things in plain language; answers are grounded in the app's own guide, not invented." },
      { id: "Mode Laporan menjawab dari buku Anda sendiri — \"berapa laba bulan ini?\", \"bandingkan dengan bulan lalu\" — bersifat baca-saja dan tidak pernah mengubah data.", en: "Report mode answers from your own books — \"what is this month's profit?\", \"compare with last month\" — read-only, never changing data." },
      { id: "Draf jurnal dari kalimat biasa: usulannya selalu seimbang, dan manusia yang memutuskan untuk memposting.", en: "Journal drafts from ordinary sentences: the suggestion is always balanced, and a human decides to post it." },
      { id: "Ringkasan mingguan berbahasa Indonesia dihitung dari jurnal Anda, bukan ditebak model.", en: "A weekly narrative summary is computed from your journals, not guessed by a model." },
    ],
    hasil: { id: "Pertanyaan bisnis dijawab tanpa harus fasih berbahasa akuntansi.", en: "Business questions get answered without needing to speak accounting." },
    gambar: "/panduan/asisten-1.webp",
  },
];
