/**
 * Pintu masuk kerangka peragaan.
 *
 * Data registrinya ada di `daftar.ts` — tanpa React, supaya skrip Node
 * (`scripts/export-panduan-md.mjs`) bisa membacanya tanpa menarik React ke
 * dalam bundelnya.
 */
export { PERAGAAN, SEMUA_PERAGAAN, type PeragaanId } from "./daftar";
export { Peragaan } from "./Peragaan";
export type { Naskah, Panel, Langkah, Sasaran, Nada } from "./tipe";
