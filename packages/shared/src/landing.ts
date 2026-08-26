/**
 * Naskah halaman publik yang dipakai DUA sisi — Fase 31c.
 *
 * ## Cacat yang membuat berkas ini ada
 *
 * FAQ ditulis di dua tempat yang tidak saling tahu:
 *
 * - `apps/api/src/routes/landingSeo.ts` — 5 tanya-jawab, hanya bahasa
 *   Indonesia, disuntikkan sebagai JSON-LD `FAQPage` + `<noscript>` untuk
 *   perayap mesin pencari.
 * - `apps/web/src/pages/landing/sections.ts` — 11 tanya-jawab dwibahasa, yang
 *   benar-benar dilihat manusia.
 *
 * Komentar di sisi server berbunyi "selaras dengan FAQ di landing". **Tidak
 * satu pun pertanyaannya sama.** Keduanya sudah berjalan sendiri-sendiri entah
 * sejak kapan, dan tak ada gerbang yang bisa melihatnya karena tidak ada satu
 * pun berkas yang memuat keduanya.
 *
 * Akibatnya bukan sekadar rapi-tidak-rapi. Panduan data terstruktur Google
 * menuntut isi `FAQPage` **benar-benar tampak di halaman yang sama**; markup
 * yang menjanjikan jawaban yang tidak ada di halaman adalah pelanggaran yang
 * bisa membuat rich result dicabut.
 *
 * Karena `@erpindo/shared` diimpor oleh `apps/api` maupun `apps/web`, satu
 * sumber di sini menutup celah itu untuk selamanya — dan uji di
 * `packages/shared/test` mengunci agar keduanya tidak bisa berpisah lagi.
 */

/** Nilai dwibahasa. Bentuknya sama dengan `Dual` di `apps/web/src/i18n`. */
export type TeksDwibahasa = { id: string; en: string };

export type TanyaJawab = { q: TeksDwibahasa; a: TeksDwibahasa };

/**
 * FAQ resmi halaman depan — satu-satunya sumber.
 *
 * Urutan penting: lima teratas adalah yang paling menentukan keputusan membeli,
 * dan lima itu pula yang diangkat ke JSON-LD (`FAQ_RICH_RESULT`). Sisanya tetap
 * tampil di halaman.
 *
 * Ditulis ulang seluruhnya pada Fase 31c — naskah sebelumnya berpangkal pada
 * aplikasi lama dan menyebut "pilihan paket" yang sudah tidak ada sejak
 * harga tunggal diberlakukan.
 */
export const FAQ_LANDING: TanyaJawab[] = [
  {
    q: {
      id: "Berapa biayanya, dan apa yang saya dapat?",
      en: "What does it cost, and what do I get?",
    },
    a: {
      id: "Rp 499.000 per perusahaan per bulan. Satu harga, seluruh modul terbuka, dan pengguna tak terbatas. Tidak ada paket yang lebih mahal, jadi tidak ada fitur yang terkunci, dan menambah karyawan tidak menambah tagihan.",
      en: "Rp 499,000 per company per month. One price, every module unlocked, unlimited users. There is no pricier tier, so nothing is locked away — and adding staff never adds to your bill.",
    },
  },
  {
    q: {
      id: "Bisakah saya mencobanya tanpa mendaftar?",
      en: "Can I try it without signing up?",
    },
    a: {
      id: "Dapat. Demo publik berisi satu perusahaan dengan data setahun penuh di seluruh modul, mulai dari penjualan, stok, dan gaji sampai laporan keuangannya. Semuanya dapat ditelusuri tanpa akun dan tanpa kartu kredit. Tidak ada masa coba, dan itu disengaja: demo yang sudah terisi lebih jujur daripada aplikasi kosong yang harus Anda isi sendiri lebih dulu.",
      en: "Yes. The public demo holds one company with a full year of data across every module — sales, stock, payroll, right through to the financial statements. Explore it with no account and no credit card. There is no free trial, and that is deliberate: a demo already full of data tells you more than an empty app you must fill in yourself first.",
    },
  },
  {
    q: {
      id: "Apakah data saya benar-benar milik saya?",
      en: "Is my data really mine?",
    },
    a: {
      id: "Ya, dan itu dapat diperiksa. Tiap perusahaan memiliki basis data sendiri yang terpisah, bukan satu tabel besar berisi seluruh pelanggan. Isinya dapat diunduh kapan saja sebagai ZIP berisi CSV per tabel, termasuk setelah langganan berakhir.",
      en: "Yes, and you can verify it. Each company gets its own separate database — not one large table holding every customer. You can download the whole thing at any time as a ZIP of per-table CSVs, including after your subscription ends.",
    },
  },
  {
    q: {
      id: "Apakah mengikuti aturan pajak Indonesia?",
      en: "Does it follow Indonesian tax rules?",
    },
    a: {
      id: "Ya. PPN dihitung otomatis di faktur, termasuk DPP nilai lain 11/12 sesuai PMK 131/2024. Faktur keluaran diunduh sebagai XML yang langsung diimpor ke Coretax DJP. Penggajian menghitung PPh 21 metode TER berikut BPJS Kesehatan dan Ketenagakerjaan.",
      en: "Yes. VAT is computed automatically on invoices, including the 11/12 alternative tax base under PMK 131/2024. Output invoices download as XML that imports straight into Coretax (DJP). Payroll computes PPh 21 using the TER method plus BPJS health and employment contributions.",
    },
  },
  {
    q: {
      id: "Kami sudah memakai sistem lain. Seberapa berat pindahnya?",
      en: "We already run another system. How hard is the switch?",
    },
    a: {
      id: "Tidak berat, dan tidak perlu konsultan. Produk, kontak, dan saldo awal diimpor dari berkas CSV atau Excel dengan pratinjau serta laporan per baris, sehingga baris yang bermasalah terlihat sebelum apa pun tersimpan. Saldo awal menjadi satu jurnal pembuka yang otomatis seimbang, jadi pembukuan tidak dimulai dari kosong dan tidak ada tanggal potong yang harus dinegosiasikan.",
      en: "Not hard, and no consultant needed. Products, contacts, and opening balances import from CSV/Excel with a preview and per-row report — bad rows surface before anything is saved. Opening balances become a single opening entry that balances itself, so your books do not start from zero and there is no cut-over date to negotiate.",
    },
  },
  {
    q: {
      id: "Bisakah satu akun mengelola beberapa perusahaan?",
      en: "Can one account manage several companies?",
    },
    a: {
      id: "Dapat. Tiap badan usaha berdiri sendiri dengan basis datanya masing-masing, lalu Laba Rugi dan Neraca konsolidasi disusun lintas perusahaan, lengkap dengan eliminasi transaksi antar-perusahaan.",
      en: "Yes. Each entity stands on its own with its own database, then consolidated P&L and Balance Sheet are assembled across companies — including elimination of inter-company transactions.",
    },
  },
  {
    q: {
      id: "Bisakah hak akses dibatasi per peran dan per cabang?",
      en: "Can access be limited by role and by branch?",
    },
    a: {
      id: "Dapat. Peran diatur per modul, sehingga kasir cukup melihat layar kasir dan staf gudang cukup melihat stok. Hak akses juga dapat dibatasi per dimensi seperti cabang atau cost center. Setiap perubahan penting tercatat di audit log beserta pelakunya, dan akses dapat dikunci ke daftar IP kantor.",
      en: "Yes. Roles are set per module — a cashier sees only the till, warehouse staff only stock — and access can also be scoped per dimension such as branch or cost centre. Every significant change is recorded in the audit log with who made it, and access can be restricted to your office IP list.",
    },
  },
  {
    q: {
      id: "Bagaimana cara membayarnya?",
      en: "How do I pay?",
    },
    a: {
      id: "Secara daring lewat Xendit, memakai QRIS, transfer bank, kartu, atau dompet elektronik. Akun aktif otomatis begitu pembayaran terkonfirmasi. Untuk grup usaha yang membutuhkan pendampingan, pertanyaannya dapat dikirim ke halo@erpindo.id.",
      en: "Online through Xendit, using QRIS, bank transfer, card, or e-wallet. Your account activates automatically once payment clears. For business groups that need hands-on help, write to halo@erpindo.id.",
    },
  },
  {
    q: {
      id: "Kalau saya berhenti berlangganan, data saya hilang?",
      en: "If I stop subscribing, do I lose my data?",
    },
    a: {
      id: "Tidak. Akun beralih ke mode baca-saja, dan Anda tetap dapat membuka, mencari, serta mengunduh seluruh data kapan pun. Berhenti membayar menghentikan pencatatan baru, bukan akses ke catatan lama.",
      en: "No. The account switches to read-only — you can still open, search, and download everything at any time. Stopping payment stops new record-keeping, not access to the old records.",
    },
  },
];

/**
 * Lima FAQ teratas untuk data terstruktur.
 *
 * Sengaja diambil dari daftar yang sama, bukan disalin: itulah satu-satunya
 * cara memastikan markup rich result benar-benar ada di halamannya. Diambil
 * sisi Indonesia karena halaman disajikan berbahasa Indonesia secara bawaan
 * dan perayap membacanya tanpa menjalankan JavaScript.
 */
export const FAQ_RICH_RESULT: [q: string, a: string][] = FAQ_LANDING.slice(0, 5).map((f) => [
  f.q.id,
  f.a.id,
]);

/**
 * Modul utama ERPindo dalam satu kalimat masing-masing.
 *
 * Satu sumber untuk DUA pembaca mesin yang berbeda: `featureList` di JSON-LD
 * (`apps/api/src/routes/landingSeo.ts`) dan bagian "Modul" di `/llms.txt`
 * (`apps/api/src/routes/blog.ts`). Sebelum ini keduanya akan menjadi dua daftar
 * yang berpisah diam-diam — persis nasib FAQ sebelum Fase 31c, ketika daftar
 * "selaras dengan FAQ di landing" ternyata tidak punya satu pun pertanyaan yang
 * sama dengan FAQ yang benar-benar tampil.
 */
export const FITUR_UTAMA: string[] = [
  "Akuntansi double-entry dengan bagan akun standar Indonesia",
  "Faktur penjualan & pembelian dengan PPN dan diskon per baris",
  "Kasir (POS) dengan shift kas, multi-tender, dan mode luring",
  "Stok multi-gudang dengan HPP rata-rata bergerak dan FEFO",
  "Pembelian & pengadaan: permintaan, pesanan, penerimaan, persetujuan berjenjang",
  "Penggajian dengan PPh 21 metode TER dan BPJS, slip gaji dan 1721-A1",
  "Pajak: PPN, PPh Final UMKM, PPh 23, dan ekspor e-Faktur XML untuk Coretax DJP",
  "Laporan keuangan: laba rugi, neraca, arus kas, buku besar, umur piutang dan utang",
  "Multi-perusahaan dengan laporan konsolidasi dan multi mata uang",
  "Aset tetap dengan penyusutan komersial dan fiskal, revaluasi, dan pelepasan",
  "Manufaktur dengan resep produk, perintah produksi, work center, dan QC",
  "Proyek, anggaran, CRM, kontrak berulang, pemeliharaan aset, dan helpdesk",
  "Asisten AI yang menjawab dari panduan dan dari buku Anda sendiri",
];
