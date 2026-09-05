import { readFileSync, globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Penjaga konstanta penggajian yang digandakan di layar (Fase 54c).
 *
 * ## Cacat yang membuat penjaga ini ada
 *
 * `apps/web/src/pages/payroll.tsx` menuliskan `s.upahSebulan / 25` — angka
 * pembagi upah harian, disalin dari `PEMBAGI_UPAH_HARIAN` di
 * `packages/shared`. Selama nilainya tidak pernah berubah, tidak ada yang rugi.
 *
 * Tetapi konstanta itu justru DIRANCANG untuk berubah: komentarnya menyatakan
 * 25 adalah asumsi pekan enam hari kerja, dan perusahaan berpekan lima hari
 * memakai angka lain. Begitu diubah, API menghitung dengan angka baru
 * sementara layar tetap membagi 25 — rincian yang dilihat karyawan tidak lagi
 * sama dengan uang yang benar-benar dibayarkan.
 *
 * Kelas yang sama persis dengan harga paket yang dieja di naskah (Fase 53a):
 * dua tempat memikul satu angka, dan tidak ada yang memeriksa yang lain.
 *
 * ## Kenapa berupa uji, bukan aturan penyapu
 *
 * Penyapu naskah membaca isi STRING; angka di sini ada di dalam ekspresi
 * JavaScript, jadi ia tidak akan pernah terlihat dari sana.
 */
describe("konstanta penggajian tidak digandakan di layar", () => {
  const berkas = globSync("src/pages/**/*.tsx").filter((f) => /payroll|hr/i.test(f));

  it("ada berkas penggajian untuk diperiksa", () => {
    // Tanpa ini, glob yang meleset membuat uji lolos dengan memeriksa nol
    // berkas — penjaga yang menjaga kekosongan.
    expect(berkas.length).toBeGreaterThan(0);
  });

  it.each([
    { nama: "PEMBAGI_UPAH_HARIAN", pola: /\/\s*25\b/, contoh: "upahSebulan / 25" },
    { nama: "PEMBAGI_UPAH_JAM", pola: /\/\s*173\b/, contoh: "upahSebulan / 173" },
  ])("$nama dibaca dari @erpindo/shared, bukan ditulis angkanya", ({ nama, pola, contoh }) => {
    const temuan: string[] = [];
    for (const f of berkas) {
      const isi = readFileSync(f, "utf8");
      isi.split("\n").forEach((baris, i) => {
        // Komentar boleh menyebut angkanya saat menerangkan asalnya.
        const bersih = baris.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
        if (pola.test(bersih)) temuan.push(`${f}:${i + 1} — ${baris.trim()}`);
      });
    }
    expect(temuan, `${nama} ditulis literal (mis. ${contoh}):\n${temuan.join("\n")}`).toEqual([]);
  });
});
