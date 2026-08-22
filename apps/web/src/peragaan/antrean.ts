/**
 * Antrean pemutar peragaan (Fase 38a).
 *
 * ## Kenapa ini ada
 *
 * Halaman `/fitur` memuat 22 peragaan dan satu halaman panduan bisa memuat
 * belasan. Gerbang keterlihatan saja tidak cukup: di layar tinggi, atau bila
 * `rootMargin` disetel longgar, belasan peragaan bisa terlihat sekaligus — dan
 * belasan timer yang menulis state React tiap ~900 ms adalah persis jenis
 * beban yang membuat ponsel menengah tersendat.
 *
 * Antrean ini membatasi kasus TERBURUK, bukan kasus rata-rata: berapa pun yang
 * terlihat, hanya dua yang benar-benar berjalan. Yang lain membeku di bingkai
 * terakhirnya — bukan kosong, jadi tidak ada yang terlihat rusak.
 *
 * Dua, bukan satu: dengan satu slot, peragaan yang berdampingan di layar lebar
 * akan bergantian menyala dan mati, dan itu justru lebih mengganggu daripada
 * dua yang berjalan bersama.
 */

/** Berapa peragaan yang boleh berjalan bersamaan di seluruh halaman. */
const SLOT = 2;

const aktif = new Set<string>();
const menunggu: string[] = [];
const pendengar = new Set<() => void>();

function kabari(): void {
  for (const p of pendengar) p();
}

/** Berlangganan perubahan daftar pemutar aktif. */
export function langgananAntrean(p: () => void): () => void {
  pendengar.add(p);
  return () => pendengar.delete(p);
}

/** `true` bila `id` sedang memegang slot. */
export function memegangSlot(id: string): boolean {
  return aktif.has(id);
}

/**
 * Minta slot untuk `id`. Bila penuh, `id` masuk daftar tunggu dan akan
 * mendapat slot begitu ada yang melepas.
 */
export function mintaSlot(id: string): void {
  if (aktif.has(id) || menunggu.includes(id)) return;
  if (aktif.size < SLOT) {
    aktif.add(id);
    kabari();
    return;
  }
  menunggu.push(id);
}

/** Lepaskan slot `id` dan berikan kepada yang menunggu paling lama. */
export function lepasSlot(id: string): void {
  const punya = aktif.delete(id);
  const i = menunggu.indexOf(id);
  if (i >= 0) menunggu.splice(i, 1);
  if (!punya) return;
  const berikut = menunggu.shift();
  if (berikut) aktif.add(berikut);
  kabari();
}

/** Hanya untuk uji: kembalikan antrean ke keadaan kosong. */
export function setelUlangAntrean(): void {
  aktif.clear();
  menunggu.length = 0;
  kabari();
}
