import type { PeragaanId } from "../../../peragaan";

/** Struktur konten panduan — satu sumber kebenaran untuk halaman /panduan
 *  dan ekspor Markdown ke docs/panduan/ (scripts/export-panduan-md.mjs). */

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
   */
  peragaan?: PeragaanId;
};

export type GuideModule = {
  slug: string;
  title: string;
  /** Rute halaman terkait di aplikasi (untuk tombol "Buka di aplikasi"). */
  appPath?: string;
  intro: string;
  sections: GuideSection[];
};
