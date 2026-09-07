/**
 * Struktur konten panduan — satu sumber kebenaran untuk halaman `/panduan`,
 * ekspor Markdown ke `docs/panduan/` (`scripts/export-panduan-md.mjs`), dan
 * sejak Fase 55d juga untuk Worker yang menyajikannya kepada perayap.
 *
 * ## Kenapa isinya pindah ke `packages/shared`
 *
 * `/panduan` terdaftar di `sitemap.xml` — kita menyuruh Google mengindeksnya —
 * tetapi tidak pernah disajikan Worker. Perayap dan mesin penjawab yang tidak
 * menjalankan JavaScript menerima cangkang SPA kosong bertajuk beranda, tanpa
 * canonical. Dua puluh lima modul panduan, badan naskah terbesar di situs ini,
 * tidak terbaca oleh pembaca yang justru diundang `robots.txt` satu per satu.
 *
 * Worker tidak bisa mengimpor dari `apps/web`, jadi isinya pindah ke sini —
 * tempat yang memang dibaca keduanya.
 */

export type GuideSection = {
  heading: string;
  /** Paragraf penjelasan. */
  body?: string[];
  /** Langkah bernomor. */
  steps?: string[];
  /** Tips / hal yang perlu diperhatikan. */
  tips?: string[];
  /**
   * Peragaan beranimasi untuk seksi ini (Fase 38f).
   *
   * Menggantikan `image`/`imageAlt` yang menunjuk tangkapan layar `.webp`.
   * Sifatnya tetap OPSIONAL: seksi yang berisi penjelasan konsep, bukan alur
   * yang bisa diperagakan, lebih baik tampil tanpa apa pun.
   *
   * Peragaan panduan dirender `sekaliJalan` — berhenti di keadaan akhir dan
   * menawarkan tombol ulang. Pembaca panduan sedang mencocokkan layarnya
   * sendiri dengan yang di dokumen, dan gerak yang terus berulang mengganggu
   * pekerjaan itu; di halaman jualan justru sebaliknya.
   *
   * Bertipe `string`, bukan `PeragaanId` (Fase 55d): peragaan hidup di
   * `apps/web` dan paket ini tidak boleh bergantung padanya. Yang hilang dari
   * pemeriksaan tipe DIGANTI uji `apps/web/test/panduan-peragaan.test.ts` yang
   * menuntut tiap nilai di sini benar-benar ada di `PERAGAAN` — pemeriksaan
   * yang justru lebih kuat, karena ia juga menangkap peragaan yang DIHAPUS,
   * sesuatu yang tipe union tidak pernah bisa lihat pada nilai yang sudah
   * terlanjur tertulis.
   */
  peragaan?: string;
};

export type GuideModule = {
  slug: string;
  title: string;
  /** Rute halaman terkait di aplikasi (untuk tombol "Buka di aplikasi"). */
  appPath?: string;
  intro: string;
  sections: GuideSection[];
};
