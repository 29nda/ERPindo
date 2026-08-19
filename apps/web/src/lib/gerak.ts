/**
 * Preferensi gerak pengguna (Fase 35a).
 *
 * Dipisah ke `lib/` karena dua alasan, dan keduanya nyata:
 *
 * 1. Ia memang milik bersama. Peragaan hero adalah animasi pertama di repo ini,
 *    tetapi tidak akan menjadi yang terakhir — dan setiap animasi berikutnya
 *    wajib menghormati preferensi yang sama.
 *
 * 2. `scripts/sapu-i18n.mjs` memindai `pages/**\/*.tsx` dan salah mengenali
 *    string kueri media di dalam berkas komponen sebagai utang teks layar.
 *    Memindahkannya ke `.ts` membuat penyapu melihat yang sebenarnya — tanpa
 *    melonggarkan polanya, dan tanpa memelintir kode hanya demi alat.
 */

/** Kueri media baku untuk "kurangi gerak". */
const KUERI = "(prefers-reduced-motion: reduce)";

/**
 * `true` bila pengguna meminta lebih sedikit gerak.
 *
 * Aman dipanggil saat render server / uji tanpa `window`: tanpa `matchMedia`
 * jawabannya `false`, artinya animasi berjalan seperti biasa di lingkungan yang
 * memang tidak punya preferensi untuk dibaca.
 */
export function kurangiGerak(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(KUERI).matches;
}
