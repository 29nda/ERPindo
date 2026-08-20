import { FAKTUR_BERANTAI } from "./naskah/beranda";
import type { Naskah } from "./tipe";

/**
 * Registri peragaan (Fase 38a).
 *
 * Satu-satunya tempat naskah didaftarkan. Halaman menyebut peragaan lewat
 * `PeragaanId`, bukan lewat impor langsung — sehingga rujukan ke peragaan yang
 * tidak ada adalah galat kompilasi, bukan bingkai kosong yang baru ketahuan
 * saat seseorang membuka halamannya.
 *
 * Itu persis kelas bug yang ditinggalkan pendahulunya: `image: "/landing/…webp"`
 * adalah `string`, jadi salah ketik pada nama berkas lolos typecheck, lolos
 * lint, lolos uji, dan muncul sebagai gambar rusak di halaman jualan.
 */
export const PERAGAAN = {
  "faktur-berantai": FAKTUR_BERANTAI,
} as const satisfies Record<string, Naskah>;

export type PeragaanId = keyof typeof PERAGAAN;

/** Semua naskah sebagai larik — dipakai uji dan penghitungan. */
export const SEMUA_PERAGAAN: Naskah[] = Object.values(PERAGAAN);

export { Peragaan } from "./Peragaan";
export type { Naskah, Panel, Langkah, Sasaran, Nada } from "./tipe";
