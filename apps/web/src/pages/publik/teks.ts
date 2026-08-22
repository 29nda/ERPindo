import type { Dual } from "../../i18n";

/**
 * Naskah enam halaman publik baru (Fase 38d).
 *
 * ## Kenapa naskahnya di berkas data, bukan di dalam JSX
 *
 * Halaman publik yang sudah ada menulis naskahnya lewat `L(lang, "…", "…")`
 * di tengah JSX. Bentuk itu punya dua cacat yang baru terlihat setelah
 * `sapu-gaya` ada:
 *
 * 1. `L()` menerima dua string **posisional**. Tidak ada yang mencegah
 *    pasangan tertukar atau sisi Inggris yang disalin dari sisi Indonesia, dan
 *    tidak ada yang bisa menemukannya. `Dual` bernama: sisi yang hilang adalah
 *    galat tipe.
 * 2. Parser `sapu-gaya.mjs` mengenali bentuk `kunci: { id, en }` dan bisa
 *    diarahkan ke berkas mana pun. Ia **tidak akan pernah** bisa melihat
 *    `L(lang, "…", "…")`. Menaruh naskah di sini adalah satu-satunya cara
 *    membawanya ke bawah gerbang gaya.
 *
 * Enam halaman ditaruh dalam satu berkas, bukan enam, karena nadanya harus
 * konsisten satu sama lain — dan nada paling mudah menyimpang ketika
 * halamannya ditulis berjauhan.
 *
 * ## Nada
 *
 * Tunduk pada `docs/posisi-produk.md` §5: percaya diri, berpendapat, dan tidak
 * menggurui. Pembacanya profesional yang sudah menjalankan perusahaan.
 */

/** Alamat surel yang dipasang di halaman kontak dan kaki halaman. */
export const SUREL_KONTAK = "halo@erpindo.id";

/** Harga bulanan, dikalikan untuk biaya kepemilikan tiga tahun. */
export const BULAN_TIGA_TAHUN = 36;

export const T_HARGA = {
  judul: { id: "Satu harga, dan tidak ada baris kedua", en: "One price, and no second line item" },
  pengantar: {
    id: "Harga perangkat lunak perusahaan biasanya baru diketahui setelah tiga kali rapat. Halaman ini menyebutnya di baris pertama, beserta seluruh hal yang tidak ditagihkan terpisah.",
    en: "Enterprise software pricing is usually revealed after three meetings. This page states it in the first line, along with everything that is not billed separately.",
  },

  kartuJudul: { id: "Berlangganan ERPindo", en: "ERPindo subscription" },
  kartuSatuan: { id: "per bulan, per perusahaan", en: "per month, per company" },
  kartuCatatan: {
    id: "Ditagih bulanan. Berhenti kapan saja tanpa penalti.",
    en: "Billed monthly. Cancel any time without penalty.",
  },

  termasukJudul: { id: "Yang termasuk", en: "What is included" },
  termasuk: [
    {
      id: "Pengguna tak terbatas. Menambah orang tidak menaikkan tagihan, jadi melatih seluruh tim tidak dihukum biaya.",
      en: "Unlimited users. Adding people does not raise the bill, so training the whole team is not penalised.",
    },
    {
      id: "Seluruh modul terbuka sejak hari pertama. Tidak ada kemampuan yang baru muncul setelah menaikkan paket.",
      en: "Every module is open from day one. No capability appears only after an upgrade.",
    },
    {
      id: "Beberapa badan usaha, masing-masing dengan basis data terpisah, beserta konsolidasi dan eliminasi antar-perusahaan.",
      en: "Multiple legal entities, each with its own database, plus consolidation and intercompany elimination.",
    },
    {
      id: "Kepatuhan pajak Indonesia bawaan: PPN, PPh 21 dengan tarif efektif rata-rata, BPJS, bukti potong 1721-A1, dan ekspor XML Coretax.",
      en: "Indonesian tax compliance built in: VAT, income tax on average effective rates, social security, 1721-A1 slips, and Coretax XML export.",
    },
    {
      id: "Ekspor seluruh data menjadi ZIP berisi CSV per tabel, kapan saja, termasuk setelah berhenti berlangganan.",
      en: "Export all your data as a ZIP of per-table CSVs, at any time, including after you stop subscribing.",
    },
    {
      id: "Pembaruan dan perbaikan mengalir ke seluruh pelanggan bersamaan, tanpa biaya peningkatan versi.",
      en: "Updates and fixes reach every customer at once, with no version upgrade fee.",
    },
  ],

  batasJudul: { id: "Yang memang dibatasi", en: "What is genuinely limited" },
  batasPengantar: {
    id: "Hanya satu, dan disebutkan di sini supaya tidak ditemukan sendiri di bulan kedua.",
    en: "There is only one, and it is stated here so it is not discovered in month two.",
  },
  batasAi: {
    id: "Asisten AI dibatasi 100 permintaan per hari per perusahaan. Batas ini menjaga satu pelanggan tidak menghabiskan alokasi model milik seluruh layanan. Seluruh modul lain tidak berkuota.",
    en: "The AI assistant is capped at 100 requests per day per company. The cap keeps one customer from consuming the model allocation shared by the whole service. No other module has a quota.",
  },

  tigaTahunJudul: { id: "Biaya kepemilikan tiga tahun", en: "Three-year cost of ownership" },
  tigaTahunPengantar: {
    id: "Angka yang biasanya diminta bagian pengadaan. Tidak ada baris implementasi, tidak ada biaya lisensi per kepala, tidak ada biaya peningkatan versi — jadi seluruh kolomnya hanya perkalian.",
    en: "The figure procurement usually asks for. There is no implementation line, no per-seat licence, and no upgrade fee — so the whole column is a multiplication.",
  },
  tigaTahunBaris: { id: "36 bulan × Rp 499.000", en: "36 months × Rp 499,000" },
  tigaTahunCatatan: {
    id: "Yang membuat angka ini bisa dipegang bukan besarnya, melainkan tidak adanya baris lain di bawahnya.",
    en: "What makes this figure dependable is not its size, but the absence of any line beneath it.",
  },

  bandingJudul: { id: "Terhadap kategori, bukan terhadap nama", en: "Against the category, not against names" },
  bandingIsi: {
    id: "ERP untuk perusahaan di Indonesia umumnya dijual mulai puluhan sampai ratusan juta rupiah per tahun, biasanya ditambah biaya implementasi yang ditagih terpisah. Kami tidak menyebut nama pesaing: harga vendor berubah tanpa pemberitahuan, dan angka basi tentang pihak lain merugikan yang menuliskannya.",
    en: "Enterprise ERP in Indonesia typically starts in the tens to hundreds of millions of rupiah per year, usually with implementation billed separately. We do not name competitors: vendor pricing changes without notice, and stale figures about others reflect on whoever published them.",
  },
  bandingSumber: {
    id: "Kalkulator di halaman depan menghitung dari angka yang Anda masukkan sendiri, bukan dari angka kami.",
    en: "The calculator on the home page works from figures you enter yourself, not from ours.",
  },

  cobaJudul: { id: "Tidak ada masa coba gratis", en: "There is no free trial" },
  cobaIsi: {
    id: "Sebagai gantinya ada demo publik berisi data setahun penuh yang bisa dibuka tanpa mendaftar. Masa coba dengan basis data kosong tidak memperlihatkan apa pun yang berguna tentang sebuah ERP.",
    en: "Instead there is a public demo with a full year of data, open without signing up. A trial on an empty database shows nothing useful about an ERP.",
  },

  tenggangJudul: { id: "Bila pembayaran terlambat", en: "If a payment is late" },
  tenggangIsi: {
    id: "Ada masa tenggang tiga hari saat akun tetap bisa menulis seperti biasa. Setelah itu akun menjadi baca-saja — data tidak pernah dihapus, dan ekspornya tetap bisa diunduh.",
    en: "There is a three-day grace period during which the account keeps writing as usual. After that it becomes read-only — data is never deleted, and the export stays available.",
  },
} satisfies Record<string, Dual | Dual[] | unknown>;

export const T_KEAMANAN = {
  judul: { id: "Keamanan yang bisa diperiksa, bukan dijanjikan", en: "Security you can inspect, not just be promised" },
  pengantar: {
    id: "Halaman ini ditulis untuk manajer TI yang sedang menilai vendor. Ia menyebut apa yang benar-benar diterapkan di kode dan operasi, dan menyebut juga apa yang belum ada.",
    en: "This page is written for the IT manager assessing a vendor. It states what is genuinely implemented in the code and operations, and states what is not there yet.",
  },

  isolasiJudul: { id: "Isolasi data antar-perusahaan", en: "Data isolation between companies" },
  isolasiIsi: {
    id: "Tiap perusahaan memiliki basis datanya sendiri, bukan sekadar kolom penanda di tabel bersama. Data dua perusahaan tidak pernah berada dalam satu tabel yang sama, sehingga kesalahan kueri tidak bisa membocorkan data lintas pelanggan.",
    en: "Each company has its own database, not merely a tenant column in a shared table. Two companies' data never share a table, so a mistaken query cannot leak across customers.",
  },

  aksesJudul: { id: "Hak akses dan jejak audit", en: "Access control and audit trail" },
  aksesButir: [
    {
      id: "Peran bawaan Owner, Admin, dan Viewer, ditambah peran kustom yang hak aksesnya diatur per modul.",
      en: "Built-in Owner, Admin, and Viewer roles, plus custom roles with permissions set per module.",
    },
    {
      id: "Pembatasan per dimensi, sehingga seorang manajer cabang hanya melihat pos biaya cabangnya sendiri.",
      en: "Per-dimension restrictions, so a branch manager sees only their own branch's cost centres.",
    },
    {
      id: "Hak akses ditegakkan di sisi server pada tiap permintaan, bukan disembunyikan di antarmuka.",
      en: "Permissions are enforced server-side on every request, not hidden in the interface.",
    },
    {
      id: "Satu uji otomatis memindai seluruh pendaftaran rute dan menggagalkan build bila ada endpoint tanpa penjagaan sesi.",
      en: "An automated test scans every route registration and fails the build if any endpoint lacks a session guard.",
    },
  ],

  masukJudul: { id: "Autentikasi", en: "Authentication" },
  masukButir: [
    {
      id: "Kata sandi disimpan dalam bentuk hash, tidak pernah polos.",
      en: "Passwords are stored hashed, never in plain text.",
    },
    {
      id: "Verifikasi dua langkah dengan aplikasi autentikator, dan rahasianya disimpan terenkripsi.",
      en: "Two-step verification with an authenticator app, its secret stored encrypted.",
    },
    {
      id: "Masuk dengan akun Google, dengan state yang ditandatangani untuk mencegah pemalsuan permintaan.",
      en: "Sign-in with a Google account, using signed state to prevent request forgery.",
    },
  ],

  integritasJudul: { id: "Integritas angka keuangan", en: "Integrity of the financial figures" },
  integritasIsi: {
    id: "Jurnal tidak pernah dihapus atau disunting. Koreksi selalu berupa jurnal pembalik yang bertaut dua arah dengan yang dikoreksinya, sehingga riwayat perubahan tidak bisa dihilangkan. Periode yang sudah ditutup menolak posting mundur.",
    en: "Journal entries are never deleted or edited. A correction is always a reversing entry linked in both directions to what it corrects, so the history cannot be erased. Closed periods reject backdated postings.",
  },

  jaringanJudul: { id: "Perlindungan di lapisan jaringan", en: "Network-layer protection" },
  jaringanButir: [
    {
      id: "Kebijakan keamanan isi halaman yang membatasi asal skrip, gambar, dan koneksi ke domain sendiri.",
      en: "A content security policy limiting script, image, and connection origins to our own domain.",
    },
    {
      id: "Pemaksaan HTTPS selama satu tahun beserta seluruh subdomainnya.",
      en: "HTTPS enforced for one year, including all subdomains.",
    },
    {
      id: "Penyematan halaman di dalam bingkai situs lain ditolak, sehingga klik pengguna tidak bisa dibajak.",
      en: "Embedding the pages in another site's frame is refused, so user clicks cannot be hijacked.",
    },
    {
      id: "Tujuan webhook keluar disaring terhadap alamat jaringan internal, sehingga tidak bisa dipakai memindai jaringan kami dari dalam.",
      en: "Outbound webhook targets are filtered against internal network addresses, so they cannot be used to scan our network from the inside.",
    },
    {
      id: "Pembatasan laju pada jalur sensitif: masuk, pendaftaran, asisten AI, dan ekspor berat.",
      en: "Rate limiting on sensitive paths: sign-in, registration, the AI assistant, and heavy exports.",
    },
  ],

  keluarJudul: { id: "Membawa data Anda pergi", en: "Taking your data with you" },
  keluarIsi: {
    id: "Seluruh isi basis data perusahaan bisa diunduh sebagai ZIP berisi satu CSV per tabel, kapan saja, tanpa meminta bantuan kami. Ini disebut di halaman harga juga, dan disengaja: penguncian pelanggan adalah ketakutan yang wajar, dan jawabannya adalah tombol, bukan kalimat.",
    en: "The entire company database can be downloaded as a ZIP with one CSV per table, at any time, without asking us. It is stated on the pricing page too, deliberately: vendor lock-in is a reasonable fear, and the answer is a button, not a sentence.",
  },

  belumJudul: { id: "Yang belum ada", en: "What is not there yet" },
  belumIsi: {
    id: "ERPindo belum memegang sertifikasi keamanan pihak ketiga seperti ISO 27001 atau SOC 2, dan halaman ini tidak akan menyiratkan sebaliknya. Bila pengadaan Anda mewajibkannya, sebaiknya diketahui sekarang daripada di tahap akhir.",
    en: "ERPindo does not hold third-party security certifications such as ISO 27001 or SOC 2, and this page will not imply otherwise. If your procurement requires one, it is better known now than at the final stage.",
  },
} satisfies Record<string, Dual | Dual[] | unknown>;

export const T_TENTANG = {
  judul: { id: "Kenapa ERPindo dibangun", en: "Why ERPindo was built" },
  pengantar: {
    id: "Bukan karena pasar ERP kekurangan produk. Karena cara produk itu dijual dan dipasang membuat sebagian besar proyeknya gagal, dan kegagalan itu ditanggung pembelinya.",
    en: "Not because the ERP market lacks products. Because the way those products are sold and installed makes most of the projects fail, and the buyer carries that failure.",
  },

  angkaJudul: { id: "Angka yang menjadi titik berangkat", en: "The figures this started from" },
  angkaGagal: { id: "proyek ERP gagal memenuhi tujuan awalnya", en: "of ERP projects miss their original objectives" },
  angkaBiaya: { id: "pembengkakan biaya rata-rata terhadap anggaran", en: "average cost overrun against budget" },
  angkaSumber: {
    id: "Sumber: Panorama Consulting Solutions, ERP Report 2025.",
    en: "Source: Panorama Consulting Solutions, ERP Report 2025.",
  },

  masalahJudul: { id: "Yang sebenarnya gagal", en: "What actually fails" },
  masalahIsi: {
    id: "Yang gagal jarang perangkat lunaknya. Yang gagal adalah proyek pemasangannya: berbulan-bulan menyusun bagan akun, memetakan proses, dan menunggu konsultan — dikerjakan sebelum satu transaksi pun pernah dicatat, jadi seluruh keputusannya diambil tanpa bukti.",
    en: "What fails is rarely the software. It is the implementation project: months of building a chart of accounts, mapping processes, and waiting on consultants — all done before a single transaction has been recorded, so every decision is made without evidence.",
  },

  keputusanJudul: { id: "Keputusan yang diambil", en: "The decision taken" },
  keputusanIsi: {
    id: "ERPindo tidak punya proyek implementasi. Bagan akun standar Indonesia, tarif pajak yang berlaku, dan seluruh modul sudah terpasang pada saat perusahaan Anda dibuat. Transaksi pertama bisa dicatat di menit yang sama, dan penyesuaian dilakukan setelah ada yang bisa disesuaikan.",
    en: "ERPindo has no implementation project. The Indonesian standard chart of accounts, current tax rates, and every module are in place the moment your company is created. The first transaction can be recorded in the same minute, and tuning happens once there is something to tune.",
  },

  konsekuensiJudul: { id: "Konsekuensi yang diterima", en: "The consequences accepted" },
  konsekuensi: [
    {
      id: "Harga tetap per perusahaan, bukan per pengguna. Ini menutup jalur pendapatan yang paling lazim di industri ini, dan itu memang maksudnya: lisensi per kepala menghukum perusahaan yang tumbuh.",
      en: "A fixed price per company, not per user. This closes the most common revenue path in this industry, and that is the point: per-seat licences penalise companies that grow.",
    },
    {
      id: "Tanpa jasa implementasi berbayar. Pendapatan dari jasa membuat vendor diuntungkan oleh produk yang sulit dipasang, dan insentif itu tidak ingin kami miliki.",
      en: "No paid implementation services. Services revenue rewards a vendor for software that is hard to install, and that is an incentive we do not want.",
    },
    {
      id: "Data bisa dibawa pergi kapan saja dalam format yang terbuka. Pelanggan yang bisa pergi adalah pelanggan yang bertahan karena memilih, bukan karena terjebak.",
      en: "Data can be taken away at any time in an open format. A customer who can leave is one who stays by choice, not by entrapment.",
    },
  ],

  janjiJudul: { id: "Aturan yang mengikat naskah ini", en: "The rule that binds this text" },
  janjiIsi: {
    id: "Tidak ada klaim di situs ini yang tidak bisa ditunjuk barisnya di dalam produk. Demo publik berisi data setahun penuh ada justru untuk itu — supaya klaimnya bisa Anda bantah sendiri.",
    en: "No claim on this site is made that cannot be pointed to inside the product. The public demo with a full year of data exists precisely for that — so you can refute the claims yourself.",
  },
} satisfies Record<string, Dual | Dual[] | unknown>;

export const T_KONTAK = {
  judul: { id: "Menghubungi kami", en: "Getting in touch" },
  pengantar: {
    id: "Untuk sebagian besar pertanyaan, membuka demo lebih cepat daripada menunggu balasan. Untuk sisanya, di bawah ini jalurnya.",
    en: "For most questions, opening the demo is faster than waiting for a reply. For the rest, the routes are below.",
  },

  demoJudul: { id: "Menilai produknya sendiri", en: "Assess the product yourself" },
  demoIsi: {
    id: "Demo publik berisi data setahun penuh: penjualan, pembelian, jurnal, penggajian, dan laporan yang sudah terisi. Tidak perlu mendaftar, dan tidak ada yang menghubungi Anda setelahnya.",
    en: "The public demo holds a full year of data: sales, purchases, journals, payroll, and reports already populated. No sign-up, and nobody contacts you afterwards.",
  },

  surelJudul: { id: "Pertanyaan sebelum berlangganan", en: "Questions before subscribing" },
  surelIsi: {
    id: "Pertanyaan pengadaan, keamanan, atau kebutuhan yang belum terlihat di demo bisa dikirim lewat surel.",
    en: "Procurement, security, or requirements you cannot see in the demo can be sent by email.",
  },

  dukunganJudul: { id: "Sudah berlangganan", en: "Already subscribed" },
  dukunganIsi: {
    id: "Di dalam aplikasi ada menu Dukungan yang mengirim pertanyaan, laporan galat, dan usulan fitur langsung ke pengelola, lengkap dengan status penanganannya. Jalur ini yang paling cepat karena membawa konteks perusahaan Anda.",
    en: "Inside the app there is a Support menu that sends questions, bug reports, and feature requests straight to the maintainer, with their handling status. This route is the fastest because it carries your company's context.",
  },

  jujurJudul: { id: "Yang tidak kami lakukan", en: "What we do not do" },
  jujurIsi: {
    id: "Tidak ada formulir yang meminta nomor telepon lalu menyerahkannya ke tenaga penjual. Tidak ada demo terjadwal yang harus ditunggu seminggu. Demonya sudah tayang, dan harganya sudah tertulis.",
    en: "There is no form asking for your phone number and handing it to a salesperson. There is no scheduled demo to wait a week for. The demo is already live, and the price is already written down.",
  },
} satisfies Record<string, Dual | Dual[] | unknown>;
