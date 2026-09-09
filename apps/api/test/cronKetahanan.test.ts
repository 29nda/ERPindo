import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Kegagalan satu perusahaan tidak boleh membatalkan pekerjaan harian seluruh
 * platform (Fase 54g).
 *
 * `scheduled()` menyapu SELURUH tenant tiap hari: menurunkan langganan
 * kedaluwarsa ke mode baca-saja, mengirim susulan tagihan, memposting
 * penyusutan aset, mengirim rekap bulanan, mencadangkan ke Google Drive,
 * menagih kontrak, dan menutup buku.
 *
 * Gelung yang tidak membungkus kerjanya dengan try/catch tidak hanya melewatkan
 * sisa tenant di gelungnya sendiri — galatnya melompat keluar dari SELURUH
 * penangan cron, sehingga semua blok sesudahnya batal juga. Satu gangguan KV
 * atau D1 pada satu perusahaan cukup untuk membatalkan pekerjaan harian semua
 * perusahaan, dan satu-satunya tandanya adalah satu baris di log.
 *
 * Lima gelung sudah memakai pola `try { … } catch { console.error(…) }` sejak
 * lama; empat gelung tagihan tidak. Uji ini yang membuat polanya wajib, bukan
 * sekadar kebiasaan — dan ia menemukan gelung kesepuluh pada hari ia ditulis,
 * bukan pada hari cron-nya mati.
 *
 * ## Perluasan Fase 57b: aturannya ikut ke tempat kerjanya
 *
 * Versi pertama uji ini hanya membaca `scheduled()` di `index.ts`. Itu tempat
 * aturannya DITULIS, bukan seluruh tempat ia BERLAKU: blok kelima cron hanya
 * satu baris panggilan (`runWebhookDeliveries`), dan gelung sebenarnya ada di
 * `lib/webhooks.ts` — di seberang batas berkas yang parser ini berhenti di
 * situ. Gelung itu karena itu tidak pernah tersentuh aturannya, dan memang
 * ditemukan telanjang pada Fase 57b.
 *
 * Kelas yang sama dengan glob `pages/*.tsx` yang tidak turun ke subfolder
 * (Fase 20m) dan daftar NETRAL yang hanya dihormati satu saringan (Fase 56b):
 * aturan yang benar, ditegakkan di sebagian tempat saja, dan selisihnya tidak
 * terlihat siapa pun. Karena itu berkas yang kerjanya DIPANGGIL cron ikut
 * disapu di sini.
 */

const AKAR_SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");
const SRC = join(AKAR_SRC, "index.ts");

/**
 * Berkas yang menampung kerja per-item yang dipanggil cron. Menambah pekerjaan
 * cron ke berkas baru berarti menambahkannya ke sini pada commit yang sama —
 * penjaga yang tidak menyapu tempat kerjanya berpindah adalah penjaga yang
 * perlahan berhenti berarti.
 */
const BERKAS_KERJA_CRON = ["lib/webhooks.ts"];

/** Kerja yang membuat sebuah gelung bisa gagal karena sebab di luar kendalinya. */
const SENTUH_JARINGAN = ["env.DB", "getTenantDb", "RATE_KV", "kirimEmail", "fetch("];

type Gelung = { mulai: number; tubuhMulai: number; tubuhSelesai: number; kepala: string };

/** Semua `for (… of …) {` beserta rentang tubuhnya, lewat pencocokan kurung. */
function gelungDalam(kode: string): Gelung[] {
  const hasil: Gelung[] = [];
  /*
   * `[^\n]` bukan `[^)]` (Fase 57b).
   *
   * Pola lama berhenti pada kurung tutup pertama, jadi header yang iterabelnya
   * berupa PANGGILAN — `for (const d of giliranAdil(results)) {` — tidak pernah
   * cocok. Gelungnya karena itu tak terlihat, dan uji yang tidak menemukan
   * gelung apa pun LULUS tanpa memeriksa apa pun.
   *
   * Itu bukan kekhawatiran teoretis: perluasan ke `lib/webhooks.ts` di fase ini
   * mula-mula hijau justru karena cacat ini, dan baru ketahuan ketika
   * perlindungannya sengaja dicabut dan uji-nya TETAP hijau. Karena itu tiap
   * berkas yang disapu kini juga punya asersi jumlah gelung.
   */
  const re = /for \((?:const|let) [^\n]*? of [^\n]*?\) \{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(kode)) !== null) {
    const tubuhMulai = m.index + m[0].length;
    let depth = 1;
    let i = tubuhMulai;
    while (i < kode.length && depth > 0) {
      const ch = kode[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    hasil.push({ mulai: m.index, tubuhMulai, tubuhSelesai: i, kepala: m[0] });
  }
  return hasil;
}

function badanScheduled(): string {
  const isi = readFileSync(SRC, "utf8");
  const awal = isi.indexOf("async function scheduled(");
  expect(awal, "fungsi scheduled() tidak ditemukan — parser uji ini sudah basi").toBeGreaterThan(-1);
  const buka = isi.indexOf("{", awal);
  let depth = 1;
  let i = buka + 1;
  while (i < isi.length && depth > 0) {
    if (isi[i] === "{") depth++;
    else if (isi[i] === "}") depth--;
    i++;
  }
  return isi.slice(buka, i);
}

/** Gelung telanjang di sebuah potongan kode, memakai aturan yang sama. */
function gelungTelanjang(kode: string): string[] {
  const gelung = gelungDalam(kode);
  const telanjang: string[] = [];
  for (const g of gelung) {
    const tubuh = kode.slice(g.tubuhMulai, g.tubuhSelesai);
    if (!SENTUH_JARINGAN.some((tanda) => tubuh.includes(tanda))) continue;
    const sendiri = tubuh.includes("try {");
    const induk = gelung.some(
      (lain) =>
        lain !== g &&
        lain.tubuhMulai < g.mulai &&
        lain.tubuhSelesai > g.tubuhSelesai &&
        kode.slice(lain.tubuhMulai, lain.tubuhSelesai).includes("try {"),
    );
    if (!sendiri && !induk) telanjang.push(g.kepala.trim());
  }
  return telanjang;
}

describe("berkas kerja yang dipanggil cron ikut tunduk aturannya (Fase 57b)", () => {
  /**
   * Regresi parser, per berkas. Uji yang tidak menemukan gelung apa pun akan
   * lulus tanpa memeriksa apa pun — dan itulah yang sempat terjadi di sini.
   */
  it.each(BERKAS_KERJA_CRON)("%s: parser benar-benar menemukan gelungnya", (berkas) => {
    const kode = readFileSync(join(AKAR_SRC, berkas), "utf8");
    const menyentuh = gelungDalam(kode).filter((g) =>
      SENTUH_JARINGAN.some((t) => kode.slice(g.tubuhMulai, g.tubuhSelesai).includes(t)),
    );
    expect(
      menyentuh.length,
      `Tidak satu pun gelung penyentuh jaringan ditemukan di ${berkas}. Entah ` +
        "kerjanya pindah, entah parsernya rusak — keduanya membuat penjaga ini diam.",
    ).toBeGreaterThanOrEqual(1);
  });

  it.each(BERKAS_KERJA_CRON)("%s: setiap gelung yang menyentuh jaringan terlindungi", (berkas) => {
    const kode = readFileSync(join(AKAR_SRC, berkas), "utf8");
    expect(
      gelungTelanjang(kode),
      `Gelung di ${berkas} memproses antrean tanpa try/catch. Galat pada SATU ` +
        "item membatalkan sisa batch-nya — kelas yang sama dengan Fase 54g, " +
        "hanya di seberang batas berkas tempat aturannya ditulis.",
    ).toEqual([]);
  });
});

describe("penangan cron: kegagalan satu tenant tidak membatalkan sisanya", () => {
  const badan = badanScheduled();
  const gelung = gelungDalam(badan);

  it("parser menemukan gelung dalam jumlah wajar (regresi parser)", () => {
    // Saat ini sepuluh. Bila parsernya rusak angkanya anjlok dan uji ini gagal
    // lebih dulu daripada diam-diam meloloskan gelung yang tak terlindungi.
    expect(gelung.length).toBeGreaterThanOrEqual(8);
  });

  it("setiap gelung yang menyentuh database, KV, email, atau jaringan terlindungi", () => {
    const telanjang: string[] = [];
    for (const g of gelung) {
      const tubuh = badan.slice(g.tubuhMulai, g.tubuhSelesai);
      if (!SENTUH_JARINGAN.some((tanda) => tubuh.includes(tanda))) continue;
      // Terlindungi bila ia sendiri membungkus kerjanya, ATAU bila ia bersarang
      // di dalam gelung lain yang sudah membungkusnya.
      const sendiri = tubuh.includes("try {");
      const induk = gelung.some(
        (lain) =>
          lain !== g &&
          lain.tubuhMulai < g.mulai &&
          lain.tubuhSelesai > g.tubuhSelesai &&
          badan.slice(lain.tubuhMulai, lain.tubuhSelesai).includes("try {"),
      );
      if (!sendiri && !induk) telanjang.push(g.kepala.trim());
    }
    expect(
      telanjang,
      "Gelung berikut menyapu tenant tanpa try/catch. Galat pada SATU perusahaan " +
        "akan melompat keluar dari seluruh penangan cron dan membatalkan pekerjaan " +
        "harian semua perusahaan — termasuk blok-blok sesudahnya. Bungkus kerjanya " +
        "seperti gelung penyusutan aset.",
    ).toEqual([]);
  });
});
