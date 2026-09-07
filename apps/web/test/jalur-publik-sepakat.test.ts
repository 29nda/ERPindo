import { readFileSync } from "node:fs";
import path from "node:path";
import { GUIDE_MODULES } from "@erpindo/shared";
import { describe, expect, it } from "vitest";

/**
 * Empat tempat yang harus menyebut jalur publik yang SAMA (Fase 55d).
 *
 * ## Cacat yang ditutup uji ini
 *
 * Sebuah halaman publik baru berguna bagi mesin pencari hanya bila EMPAT hal
 * benar sekaligus:
 *
 * 1. rutenya ada di `landingSeo.ts` (Worker menyisipkan canonical + `<noscript>`);
 * 2. jalurnya terdaftar di `run_worker_first` — **di kedua** berkas wrangler;
 * 3. jalurnya diumumkan di `sitemap.xml`;
 * 4. rutenya ada di SPA supaya pengunjung biasa juga sampai.
 *
 * Komentar di `landingSeo.ts` sudah memperingatkan ini sejak Fase 38d —
 * *"ketiga tempat harus diperbarui bersamaan; melewatkan salah satunya
 * menghasilkan halaman yang tampak benar di peramban tetapi kosong bagi
 * perayap — kegagalan yang tidak berbunyi di gerbang mana pun."*
 *
 * Peringatan itu tidak cukup, dan Fase 54i menemukan buktinya: `/panduan`
 * diumumkan di `sitemap.xml` tanpa pernah disajikan Worker, sementara
 * `/api-docs` disajikan Worker penuh tanpa pernah diumumkan. Dua cacat
 * berlawanan arah, keduanya dari daftar yang ditulis tangan di empat tempat.
 *
 * Ini gerbangnya.
 */

const AKAR = path.join(__dirname, "..", "..", "..");
const baca = (p: string) => readFileSync(path.join(AKAR, p), "utf8");

const SEO = baca("apps/api/src/routes/landingSeo.ts");
const BLOG = baca("apps/api/src/routes/blog.ts");
const WRANGLER = baca("wrangler.jsonc");
const WRANGLER_DEV = baca("wrangler.dev.jsonc");

/** Jalur yang didaftarkan `run_worker_first` pada sebuah berkas wrangler. */
function workerFirst(isi: string): string[] {
  const m = /"run_worker_first"\s*:\s*\[([^\]]*)\]/.exec(isi);
  expect(m, "run_worker_first tidak ditemukan lagi").not.toBeNull();
  return [...m![1]!.matchAll(/"([^"]+)"/g)].map((x) => x[1]!);
}

/** Jalur statis yang benar-benar dilayani `landingSeoRoutes`. */
function ruteSeo(): string[] {
  const blok = SEO.slice(SEO.indexOf("export const landingSeoRoutes"));
  return [...blok.matchAll(/\.get\("([^"]+)"/g)].map((m) => m[1]!);
}

/** Jalur yang diumumkan sitemap, kecuali yang dibangun dari data blog. */
function sitemap(): string[] {
  const blok = BLOG.slice(BLOG.indexOf('.get("/sitemap.xml"'), BLOG.indexOf('.get("/robots.txt"'));
  return [...blok.matchAll(/\$\{base\}(\/[a-z0-9\-/]*)</g)].map((m) => m[1]!);
}

describe("jalur publik sepakat di empat tempat (Fase 55d)", () => {
  it("ketiga sumbernya terbaca — berkas berpindah bukan kelulusan", () => {
    expect(ruteSeo().length).toBeGreaterThan(5);
    expect(sitemap().length).toBeGreaterThan(5);
    expect(workerFirst(WRANGLER).length).toBeGreaterThan(5);
  });

  it("kedua berkas wrangler mendaftarkan jalur yang sama persis", () => {
    // `wrangler.dev.jsonc` dihasilkan `make-dev-config.mjs`, dan perbedaan di
    // sini berarti apa yang diuji lokal bukan apa yang tayang.
    expect(workerFirst(WRANGLER_DEV)).toEqual(workerFirst(WRANGLER));
  });

  it("setiap halaman ber-SEO terdaftar di run_worker_first", () => {
    // Tanpa itu Worker tidak pernah dipanggil: halamannya tetap sempurna di
    // peramban, dan perayap menerima SPA kosong. Justru kegagalan yang tidak
    // terlihat dari layar mana pun.
    const daftar = workerFirst(WRANGLER);
    const luput = ruteSeo().filter((r) => {
      // Pola bintang HANYA menutupi rute berparameter. `/panduan/*` tidak
      // mencakup `/panduan` itu sendiri — dan uji-negatif fase ini menemukan
      // bahwa versi pertama aturan ini keliru menganggapnya tertutup, sehingga
      // ia lulus untuk keadaan yang justru harus ditolaknya.
      if (r.includes("/:")) return !daftar.includes(`${r.split("/:")[0]}/*`);
      return !daftar.includes(r);
    });
    expect(luput).toEqual([]);
  });

  it("setiap halaman ber-SEO diumumkan di sitemap", () => {
    const peta = sitemap();
    const luput = ruteSeo()
      .filter((r) => !r.includes(":"))
      .filter((r) => !peta.includes(r));
    expect(luput).toEqual([]);
  });

  it("sitemap tidak mengumumkan jalur yang tidak ada yang menyajikannya", () => {
    /*
     * Arah sebaliknya, dan inilah yang terjadi pada `/panduan` selama
     * berbulan-bulan: diumumkan ke Google, tidak pernah disajikan Worker.
     *
     * `/blog` dan `/api-docs` punya rutenya sendiri di berkas lain, jadi
     * keduanya sah — tetapi disebut di sini supaya daftar pengecualiannya
     * terbaca sebagai keputusan, bukan sebagai lubang.
     */
    const PUNYA_RUTE_LAIN = new Set(["/blog", "/api-docs"]);
    const rute = new Set(ruteSeo());
    const luput = sitemap()
      .filter((j) => !PUNYA_RUTE_LAIN.has(j))
      .filter((j) => !rute.has(j))
      .filter((j) => !GUIDE_MODULES.some((m) => j === `/panduan/${m.slug}`));
    expect(luput).toEqual([]);
  });

  it("setiap modul panduan ikut diumumkan, dan dibangun dari datanya", () => {
    // Peta situs yang mengeja dua puluh lima jalur akan berpisah dari
    // panduannya pada modul berikutnya, dan perpisahan itu tidak berbunyi.
    expect(BLOG).toMatch(/GUIDE_MODULES\.map\(\(m\) => `<url><loc>\$\{base\}\/panduan\/\$\{m\.slug\}<\/loc><\/url>`\)/);
    expect(GUIDE_MODULES.length).toBeGreaterThan(20);
  });

  it("rute modul panduan disajikan Worker lewat pola berparameter", () => {
    expect(ruteSeo()).toContain("/panduan");
    expect(ruteSeo()).toContain("/panduan/:slug");
    expect(workerFirst(WRANGLER)).toContain("/panduan/*");
  });
});
