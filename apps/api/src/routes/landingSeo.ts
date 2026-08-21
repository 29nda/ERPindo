import { FAQ_RICH_RESULT, PLAN_LIMITS, PLANS } from "@erpindo/shared";
import { Hono, type Context } from "hono";
import type { AppEnv, Env } from "../env";

/**
 * SEO landing (Fase 14d). Halaman utama `/` adalah SPA (CSR). Worker menyisipkan
 * data terstruktur JSON-LD (Organization, SoftwareApplication+Offers, FAQPage) +
 * blok <noscript> ke shell SPA saat penyajian server, tanpa mengubah aplikasi —
 * shell tetap memuat root & skrip SPA, jadi aplikasi berjalan normal, sementara
 * crawler menerima rich data + konten teks meski JavaScript mati.
 *
 * PENTING: `/` masuk `run_worker_first` di wrangler.jsonc.
 */

function origin(env: Env, reqUrl: string): string {
  return (env.APP_URL ?? new URL(reqUrl).origin).replace(/\/$/, "");
}

/**
 * FAQ untuk rich result — DIIMPOR, bukan ditulis ulang di sini (Fase 31c).
 *
 * Sampai fase ini berkas ini memuat daftarnya sendiri berisi lima tanya-jawab,
 * dengan komentar "selaras dengan FAQ di landing". Daftar itu **tidak punya
 * satu pun pertanyaan yang sama** dengan FAQ yang benar-benar tampil di
 * halaman. Keduanya berpisah entah sejak kapan, dan tidak ada gerbang yang
 * bisa melihatnya: tak satu berkas pun memuat kedua daftar sekaligus.
 *
 * Itu bukan soal kerapian. Panduan data terstruktur Google menuntut isi
 * `FAQPage` benar-benar tampak di halaman yang sama — markup yang menjanjikan
 * jawaban yang tidak ada di halaman bisa membuat rich result-nya dicabut.
 *
 * Kini keduanya membaca `FAQ_LANDING` dari `@erpindo/shared`, dan uji
 * `packages/shared/test/landing.test.ts` mengunci agar tidak berpisah lagi.
 */
const FAQ = FAQ_RICH_RESULT;

function jsonLd(base: string): string {
  // Satu paket, satu penawaran (Fase 30). Tetap berbentuk daftar karena
  // schema.org `offers` memang menerima daftar, dan bentuknya tidak perlu
  // berubah bila suatu saat ada penawaran tahunan.
  const priceOffer = PLANS.map((p) => ({
    "@type": "Offer",
    name: PLAN_LIMITS[p].label,
    price: PLAN_LIMITS[p].pricePerMonth,
    priceCurrency: "IDR",
    category: "monthly subscription",
  }));
  const blocks = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ERPindo",
      url: base,
      logo: `${base}/pwa-512.png`,
      description: "ERP multi-tenant untuk usaha Indonesia — akuntansi, POS, stok, HR/payroll, dan pajak dalam satu aplikasi.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ERPindo",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS (PWA)",
      url: base,
      offers: priceOffer,
      description: "Akuntansi double-entry, kasir POS, stok, penggajian PPh 21 TER, hingga e-Faktur. Demo publik berisi data nyata lintas seluruh modul, tanpa perlu mendaftar.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];
  return blocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, "\\u003c")}</script>`)
    .join("\n");
}

/** Konten teks minimal untuk crawler tanpa JS (SPA butuh JS untuk render penuh). */
function noscriptBlock(base: string): string {
  const faqHtml = FAQ.map(([q, a]) => `<h3>${q}</h3><p>${a}</p>`).join("");
  return `<noscript><div>
<h1>ERPindo — ERP untuk usaha Indonesia</h1>
<p>Akuntansi double-entry, kasir POS, stok, penggajian (PPh 21 TER), dan pajak (PPN, e-Faktur/Coretax) dalam satu aplikasi. Pengguna tak terbatas. Telusuri demo publik berisi data nyata lintas seluruh modul tanpa mendaftar.</p>
<p>Satu paket, satu harga: Rp${PLAN_LIMITS.lengkap.pricePerMonth.toLocaleString("id-ID")} per perusahaan per bulan — seluruh modul terbuka, pengguna tak terbatas.</p>
<p><a href="${base}/daftar">Daftar &amp; berlangganan</a> · <a href="${base}/masuk">Masuk</a> · <a href="${base}/panduan">Panduan</a> · <a href="${base}/blog">Blog</a></p>
${faqHtml}
</div></noscript>`;
}

/**
 * Ringkasan modul untuk halaman `/fitur` (Fase 18f) — versi teks untuk crawler.
 * Sengaja diringkas, BUKAN menyalin seluruh isi halaman: <noscript> ada untuk
 * memberi crawler inti maknanya, dan menyalin ratusan baris ke shell HTML akan
 * memperbesar setiap muat halaman bagi pengunjung yang JS-nya normal.
 */
const MODUL_RINGKAS: [nama: string, isi: string][] = [
  ["Akuntansi & Jurnal", "Setiap transaksi otomatis membuat jurnal double-entry saat disimpan. Bagan akun standar Indonesia sudah terpasang, jurnal tidak pernah dihapus (koreksi lewat jurnal pembalik), dan tutup buku mengunci angka final."],
  ["Faktur & Pembayaran", "Sekali posting menyelesaikan jurnal, stok, dan piutang. PPN 0/11/12% dan diskon per baris otomatis, termasuk DPP nilai lain 11/12 sesuai PMK 131/2024."],
  ["Kasir (POS)", "Sesi shift kas dengan selisih otomatis terjurnal, pembayaran non-tunai multi-tender (QRIS/kartu/e-wallet), dan tetap berjualan saat internet putus lewat PWA."],
  ["Stok & Gudang", "Multi-gudang dengan HPP rata-rata bergerak dihitung ulang di setiap transaksi, lot & kedaluwarsa FEFO, ambang stok minimum, dan stok opname sebagai jurnal penyesuaian."],
  ["Gaji & PPh 21", "PPh 21 metode TER terbaru dan BPJS dihitung otomatis, slip gaji & formulir 1721-A1 siap cetak, beban gaji langsung terjurnal."],
  ["Pajak & e-Faktur", "PPN keluaran/masukan terkumpul otomatis dari faktur, ekspor XML siap impor Coretax DJP, plus PPh Final UMKM dan PPh 23."],
  ["Laporan Keuangan", "Laba Rugi, Neraca, Arus Kas, Buku Besar, dan Umur Piutang/Utang dibaca langsung dari jurnal kapan pun, bisa per dimensi/cost center, ekspor Excel."],
  ["Multi-perusahaan & Konsolidasi", "Beberapa perusahaan dari satu akun, laporan konsolidasi lintas perusahaan, dan faktur multi mata uang dengan selisih kurs saat pelunasan."],
  ["Keamanan & Kepemilikan Data", "Satu database terpisah per perusahaan, peran & hak akses per modul, 2FA, pembatasan IP, audit log, dan unduh seluruh data sebagai ZIP CSV kapan pun."],
  // Fase 24c: daftar ini sebelumnya memuat 9 modul dari ±21 yang benar-benar
  // ada — perayap melihat produk yang jauh lebih kecil daripada kenyataannya.
  // Disamakan dengan MODUL_DETAIL di apps/web/src/pages/landing/fiturDetail.ts;
  // keduanya harus dirawat bersama.
  ["Dasbor & Mulai Cepat", "Penjualan, laba bulan berjalan, kas & bank, piutang, utang, dan persediaan dalam satu layar — tiap kartu bisa diklik menuju laporan sumbernya. Widget peringatan menandai faktur jatuh tempo, stok menipis, dan beban yang melonjak."],
  ["Pembelian & Pengadaan", "Alur permintaan (PR) → pesanan (PO) → penerimaan (GRN); penerimaan otomatis menjadi faktur pembelian dan stok masuk. Produk di bawah stok minimum menjadi usulan pembelian sekali klik."],
  ["Persetujuan Berjenjang", "Aturan per jenis dokumen dan ambang nilai, persetujuan berurutan per peran, antrean pribadi tiap penyetuju, dan jejak siapa menyetujui apa dan kapan."],
  ["Kas & Bank", "Saldo tiap dompet dengan mutasi berjalan, impor rekening koran CSV (BCA/Mandiri/BRI) dengan pencocokan otomatis nominal & tanggal, aturan auto-match tersimpan, dan kas kecil sistem dana tetap."],
  ["Aset Tetap", "Penyusutan garis lurus maupun saldo menurun dibukukan otomatis tiap bulan, penyusutan fiskal berdampingan untuk koreksi SPT, pelepasan aset berlaba/rugi, dan revaluasi ke nilai wajar lewat Ekuitas."],
  ["CRM & Penawaran", "Papan kanban funnel, aktivitas follow-up bertenggat yang masuk notifikasi, form penangkap lead publik, penawaran bermasa berlaku yang sekali klik menjadi faktur, dan laporan konversi per sumber."],
  ["Anggaran", "Target pendapatan & beban per akun per bulan, realisasi otomatis dari jurnal, dan laporan selisih (varians) berwarna."],
  ["Proyek", "Pendapatan & biaya ber-tag proyek, RAB vs realisasi, papan tugas kanban dengan penanggung jawab & tenggat, Gantt berdependensi, timesheet jam × tarif, dan termin penagihan menjadi faktur jasa."],
  ["Kontrak & Tagihan Berulang", "Kontrak menerbitkan faktur otomatis tiap periode, produk jasa tanpa stok, harga khusus per grup pelanggan, dan template jurnal berulang untuk biaya tetap."],
  ["Manufaktur & QC", "Resep produk (BoM), perintah produksi biaya gabungan, upah & overhead masuk harga pokok tanpa terhitung dua kali, work center dengan tarif per jam dan routing biaya standar vs aktual, serta inspeksi QC."],
  ["Pemeliharaan Aset", "Jadwal servis berkala per aset yang menerbitkan work order sendiri, work order ad-hoc, riwayat per aset, dan biaya perbaikan yang dijurnal ke asetnya."],
  ["Helpdesk", "Tiket berprioritas dengan penugasan tim, balasan pelanggan dipisah dari catatan internal, dan umur tiket ditandai warna."],
  ["Asisten AI", "Tanya cara pakai dengan bahasa sehari-hari berpijak panduan, mode Laporan yang menjawab dari buku Anda sendiri secara baca-saja, draf jurnal seimbang yang tetap diputuskan manusia, dan ringkasan mingguan dihitung dari jurnal."],
];

function noscriptFitur(base: string): string {
  const isi = MODUL_RINGKAS.map(([n, t]) => `<h2>${n}</h2><p>${t}</p>`).join("");
  return `<noscript><div>
<h1>Fitur ERPindo — penjelasan tiap modul</h1>
<p>Penjelasan tiap modul ERPindo: masalah yang dipecahkan, cara kerjanya di dalam aplikasi, dan hasil yang didapat. Akuntansi double-entry, faktur &amp; PPN, kasir POS, stok &amp; gudang, pembelian &amp; pengadaan, persetujuan berjenjang, kas &amp; bank, aset tetap, gaji &amp; PPh 21, pajak &amp; e-Faktur, laporan keuangan, anggaran, proyek, CRM, kontrak berulang, manufaktur &amp; QC, pemeliharaan aset, helpdesk, multi-perusahaan &amp; konsolidasi, asisten AI, serta keamanan data.</p>
${isi}
<p><a href="${base}/">Lihat demo berisi data nyata</a> · <a href="${base}/daftar">Daftar &amp; berlangganan</a> · <a href="${base}/panduan">Panduan</a></p>
</div></noscript>`;
}

/**
 * Ringkasan `<noscript>` untuk empat halaman publik Fase 38d.
 *
 * Sengaja RINGKAS, mengikuti alasan yang sama dengan `noscriptFitur`: blok ini
 * ada supaya perayap dan pembaca tanpa JavaScript mendapat inti halamannya,
 * bukan supaya seluruh isi halaman ditulis dua kali di dua tempat yang akan
 * berpisah diam-diam.
 */
const RINGKAS_PUBLIK: Record<string, [judul: string, isi: string]> = {
  "/harga": [
    "Harga ERPindo",
    `Rp ${PLAN_LIMITS.lengkap.pricePerMonth.toLocaleString("id-ID")} per bulan per perusahaan. Pengguna tak terbatas, seluruh modul terbuka, tanpa biaya implementasi dan tanpa lisensi per pengguna. Biaya kepemilikan tiga tahun adalah 36 kali biaya bulanan, tanpa baris lain di bawahnya.`,
  ],
  "/keamanan": [
    "Keamanan ERPindo",
    "Basis data terpisah per perusahaan, hak akses ditegakkan di sisi server pada tiap permintaan, jurnal yang tidak bisa dihapus atau disunting, dan ekspor seluruh data sebagai CSV kapan saja. ERPindo belum memegang sertifikasi ISO 27001 maupun SOC 2.",
  ],
  "/tentang": [
    "Tentang ERPindo",
    "ERPindo dibangun karena 68% proyek ERP gagal memenuhi tujuannya dengan pembengkakan biaya rata-rata 189%. Yang gagal jarang perangkat lunaknya, melainkan proyek pemasangannya. ERPindo tidak punya proyek implementasi.",
  ],
  "/kontak": [
    "Kontak ERPindo",
    "Demo publik berisi data setahun penuh dapat dibuka tanpa mendaftar. Pertanyaan pengadaan dan keamanan dapat dikirim lewat surel. Pelanggan berjalan memakai menu Dukungan di dalam aplikasi.",
  ],
  "/syarat": [
    "Syarat Layanan ERPindo",
    "Syarat berlangganan ERPindo: biaya per perusahaan per bulan, berhenti kapan saja, data tetap milik pelanggan dan dapat diunduh kapan saja. Naskah lengkap berbahasa Indonesia.",
  ],
  "/privasi": [
    "Kebijakan Privasi ERPindo",
    "Data tiap perusahaan disimpan dalam basis data tersendiri. Data tidak dijual dan tidak dipakai untuk periklanan. Ekspor dan permintaan penghapusan tersedia. Naskah lengkap berbahasa Indonesia.",
  ],
};

function noscriptPublik(jalur: string): (base: string) => string {
  const [judul, isi] = RINGKAS_PUBLIK[jalur] ?? ["ERPindo", ""];
  return (base: string) =>
    `<noscript><div>
<h1>${judul}</h1>
<p>${isi}</p>
<p><a href="${base}/">Beranda ERPindo</a> · <a href="${base}/fitur">Fitur</a> · <a href="${base}/harga">Harga</a></p>
</div></noscript>`;
}

/** Menyisipkan canonical + JSON-LD + <noscript> ke shell SPA hasil build. */
async function sajikan(c: Context<AppEnv>, jalur: string, noscript: (base: string) => string) {
  const base = origin(c.env, c.req.url);
  // Ambil shell SPA yang sudah dibangun dari ASSETS lalu sisipkan SEO.
  const res = await c.env.ASSETS.fetch(new Request(`${base}/index.html`));
  if (!res.ok) return c.env.ASSETS.fetch(c.req.raw); // fallback: layani apa adanya
  let html = await res.text();
  const canonical = `<link rel="canonical" href="${base}${jalur}" />`;
  html = html.replace("</head>", `${canonical}\n${jsonLd(base)}\n</head>`);
  html = html.replace("</body>", `${noscript(base)}\n</body>`);
  return c.html(html);
}

export const landingSeoRoutes = new Hono<AppEnv>()
  .get("/", (c) => sajikan(c, "/", noscriptBlock))
  // `/fitur` (Fase 18f) mendapat perlakuan SEO yang sama dengan halaman depan —
  // termasuk terdaftar di `run_worker_first` pada wrangler.jsonc dan di
  // sitemap.xml. Tanpa ketiganya, halaman ini hanya SPA kosong bagi crawler.
  .get("/fitur", (c) => sajikan(c, "/fitur", noscriptFitur))
  // Fase 38d — enam halaman publik baru mendapat perlakuan yang sama. Ketiga
  // tempat harus diperbarui bersamaan (rute di sini, `run_worker_first` di
  // wrangler.jsonc, dan sitemap.xml di blog.ts); melewatkan salah satunya
  // menghasilkan halaman yang tampak benar di peramban tetapi kosong bagi
  // perayap — kegagalan yang tidak berbunyi di gerbang mana pun.
  .get("/harga", (c) => sajikan(c, "/harga", noscriptPublik("/harga")))
  .get("/keamanan", (c) => sajikan(c, "/keamanan", noscriptPublik("/keamanan")))
  .get("/tentang", (c) => sajikan(c, "/tentang", noscriptPublik("/tentang")))
  .get("/kontak", (c) => sajikan(c, "/kontak", noscriptPublik("/kontak")))
  .get("/syarat", (c) => sajikan(c, "/syarat", noscriptPublik("/syarat")))
  .get("/privasi", (c) => sajikan(c, "/privasi", noscriptPublik("/privasi")));
