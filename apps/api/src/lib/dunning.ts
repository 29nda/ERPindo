import { GRACE_DAYS } from "@erpindo/shared";
/**
 * Dunning — jadwal pengingat sebelum akun jatuh ke mode baca-saja (Fase 20a).
 *
 * Dipisah dari `index.ts` supaya aritmetika jendelanya bisa diuji: bagian yang
 * paling mudah salah di sini bukan pengiriman emailnya, melainkan BATAS
 * jendela — salah tanda atau salah satuan membuat pengingat tak pernah
 * terkirim, dan diamnya tidak kelihatan sampai ada pelanggan yang komplain.
 */

/** Tonggak pengingat, dalam hari sebelum masa berlaku habis. */
export const DUNNING_MILESTONES = [
  { hari: 7, tag: "h7" },
  { hari: 1, tag: "h1" },
] as const;

export type DunningTag = (typeof DUNNING_MILESTONES)[number]["tag"];

const HARI_MS = 86_400_000;

/** Masa tenggang — satu sumber di `@erpindo/shared` (dipakai cron, web, uji). */
export { GRACE_DAYS };

/**
 * Tautan "buka Pengaturan" untuk email siklus langganan (Fase 30j).
 *
 * Diekstrak karena ternary yang sama persis ditulis TIGA KALI di `index.ts` —
 * pengingat sebelum berakhir, masuk masa tenggang, dan masih baca-saja — dan
 * ketiganya diam-diam mengirim email TANPA TAUTAN sepanjang `APP_URL` belum
 * dipasang. Tak satu pun gerbang melihatnya: emailnya tetap terkirim, tetap
 * berbunyi masuk akal, hanya kehilangan satu-satunya tombol yang membuat
 * pemiliknya bisa membayar.
 *
 * Sebagai fungsi, perilakunya bisa dikunci uji. Sebagai ternary yang disalin
 * tiga kali, ia hanya bisa diperiksa dengan membaca — dan membaca sudah
 * melewatkannya selama berbulan-bulan.
 *
 * @param cadangan kalimat pengganti bila `APP_URL` belum dipasang; berbeda per
 *   email karena ajakannya berbeda ("memperpanjang" vs "mengaktifkan kembali").
 */
export function tautanPengaturan(appUrl: string | undefined, cadangan: string): string {
  return appUrl ? `\n\n${appUrl.replace(/\/$/, "")}/app/pengaturan` : `\n\n${cadangan}`;
}

/** Kapan tenant benar-benar jadi baca-saja, dihitung dari tanggal habisnya. */
export function batasBacaSaja(habisPada: string): string {
  return new Date(Date.parse(habisPada) + GRACE_DAYS * HARI_MS).toISOString();
}

/** Sisa hari tenggang (0 bila sudah lewat). Dipakai spanduk aplikasi. */
export function sisaTenggang(habisPada: string, nowMs: number = Date.now()): number {
  return Math.max(Math.ceil((Date.parse(batasBacaSaja(habisPada)) - nowMs) / HARI_MS), 0);
}

/** Sedang dalam masa tenggang: sudah lewat jatuh tempo, belum baca-saja. */
export function dalamTenggang(habisPada: string, nowMs: number = Date.now()): boolean {
  const t = Date.parse(habisPada);
  return nowMs >= t && nowMs < Date.parse(batasBacaSaja(habisPada));
}

/**
 * Jendela satu hari yang berakhir tepat H-`hari`.
 *
 * Cron berjalan tiap jam, jadi tenant yang masa berlakunya menipis akan
 * MELEWATI jendela ini beberapa kali; marker KV yang mencegah kiriman ganda.
 * Jendela sengaja tidak saling tumpang-tindih antar-tonggak.
 */
export function dunningWindow(hari: number, nowMs: number = Date.now()): { bawah: string; atas: string } {
  return {
    bawah: new Date(nowMs + (hari - 1) * HARI_MS).toISOString(),
    atas: new Date(nowMs + hari * HARI_MS).toISOString(),
  };
}

/** Apakah `habisPada` jatuh di dalam jendela tonggak `hari`? */
export function dalamJendela(habisPada: string, hari: number, nowMs: number = Date.now()): boolean {
  const t = Date.parse(habisPada);
  const { bawah, atas } = dunningWindow(hari, nowMs);
  return t > Date.parse(bawah) && t <= Date.parse(atas);
}
