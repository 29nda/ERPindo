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
      id: "Rp 499.000 per perusahaan per bulan. Satu harga, seluruh modul terbuka, pengguna tak terbatas. Tidak ada paket yang lebih mahal, jadi tidak ada fitur yang terkunci — dan menambah karyawan tidak menambah tagihan.",
      en: "Rp 499,000 per company per month. One price, every module unlocked, unlimited users. There is no pricier tier, so nothing is locked away — and adding staff never adds to your bill.",
    },
  },
  {
    q: {
      id: "Bisakah saya mencobanya tanpa mendaftar?",
      en: "Can I try it without signing up?",
    },
    a: {
      id: "Bisa. Demo publik berisi satu perusahaan dengan data setahun penuh di seluruh modul — penjualan, stok, gaji, sampai laporan keuangannya. Bisa ditelusuri tanpa akun dan tanpa kartu kredit. Tidak ada masa coba, dan itu disengaja: demo yang sudah terisi lebih jujur daripada aplikasi kosong yang harus Anda isi sendiri dulu.",
      en: "Yes. The public demo holds one company with a full year of data across every module — sales, stock, payroll, right through to the financial statements. Explore it with no account and no credit card. There is no free trial, and that is deliberate: a demo already full of data tells you more than an empty app you must fill in yourself first.",
    },
  },
  {
    q: {
      id: "Apakah data saya benar-benar milik saya?",
      en: "Is my data really mine?",
    },
    a: {
      id: "Ya, dan itu dapat diperiksa. Tiap perusahaan memiliki basis data sendiri yang terpisah — bukan satu tabel besar berisi seluruh pelanggan. Isinya dapat diunduh kapan saja sebagai ZIP berisi CSV per tabel, termasuk setelah langganan berakhir.",
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
      id: "Saya sudah punya data di Excel. Harus mulai dari nol?",
      en: "I already have data in Excel. Do I start over?",
    },
    a: {
      id: "Tidak. Produk dan kontak diimpor dari CSV/Excel dengan pratinjau dan laporan per baris, jadi baris yang bermasalah terlihat sebelum apa pun tersimpan. Saldo awal juga bisa dimasukkan supaya pembukuan tidak dimulai dari kosong.",
      en: "No. Products and contacts import from CSV/Excel with a preview and a per-row report, so problem rows surface before anything is saved. Opening balances can be entered too, so your books do not start from zero.",
    },
  },
  {
    q: {
      id: "Bisakah satu akun mengelola beberapa perusahaan?",
      en: "Can one account manage several companies?",
    },
    a: {
      id: "Bisa. Tiap badan usaha berdiri sendiri dengan basis datanya masing-masing, lalu Laba Rugi dan Neraca konsolidasi disusun lintas perusahaan — termasuk eliminasi transaksi antar-perusahaan.",
      en: "Yes. Each entity stands on its own with its own database, then consolidated P&L and Balance Sheet are assembled across companies — including elimination of inter-company transactions.",
    },
  },
  {
    q: {
      id: "Bagaimana kalau internet mati saat sedang melayani pembeli?",
      en: "What if the internet drops while I am serving a customer?",
    },
    a: {
      id: "Kasir tetap berjalan. ERPindo adalah PWA yang dapat dipasang di ponsel, tablet, atau komputer dan tetap terbuka saat koneksi putus; transaksinya menyusul begitu koneksi kembali.",
      en: "The cashier keeps going. ERPindo is a PWA you can install on a phone, tablet, or computer, and it stays open when the line drops; transactions catch up once you are back online.",
    },
  },
  {
    q: {
      id: "Bagaimana cara membayarnya?",
      en: "How do I pay?",
    },
    a: {
      id: "Secara daring lewat Xendit — QRIS, transfer bank, kartu, atau dompet elektronik. Akun aktif otomatis begitu pembayaran terkonfirmasi. Untuk grup usaha atau yang membutuhkan pendampingan implementasi, jadwalkan demo dan tim kami akan menghubungi Anda.",
      en: "Online through Xendit — QRIS, bank transfer, card, or e-wallet. Your account activates automatically once payment clears. For business groups or anyone wanting implementation help, schedule a demo and our team will reach out.",
    },
  },
  {
    q: {
      id: "Kalau saya berhenti berlangganan, data saya hilang?",
      en: "If I stop subscribing, do I lose my data?",
    },
    a: {
      id: "Tidak. Akun beralih ke mode baca-saja — Anda tetap bisa membuka, mencari, dan mengunduh seluruh data kapan pun. Berhenti membayar menghentikan pencatatan baru, bukan akses ke catatan lama.",
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
