#!/usr/bin/env node
/**
 * Generator ikon merek — DARI TEKS (Fase 38g).
 *
 * ## Apa yang berubah, dan kenapa
 *
 * Versi sebelumnya (Fase 10a) memotong dan menyusun ulang dua berkas PNG
 * sumber: `brand/source-icon.png` (1.006 KB) dan `brand/source-logo.png`
 * (995 KB). Keduanya tinggal di `apps/web/public/`, sehingga Vite menyalinnya
 * ke `dist/` dan Worker menyajikannya pada **setiap deploy** — 2,4 MB yang
 * tidak pernah diminta satu permintaan pun.
 *
 * Pemilik memutuskan merek ERPindo murni teks: tidak ada logo SVG maupun PNG.
 * Wordmark di aplikasi sudah teks sejak Fase 32a, dan halaman SSR menyusul di
 * fase ini. Yang tersisa adalah empat kanal yang **secara teknis menuntut
 * berkas raster** dan tidak bisa menampilkan HTML: favicon tab peramban, ikon
 * PWA di layar utama, dan gambar pratinjau tautan (WhatsApp, LinkedIn).
 *
 * Jadi berkasnya tetap ada, tetapi ISINYA kini dirender dari teks — wordmark
 * yang sama, warna yang sama, tanpa satu berkas sumber pun. Skrip ini adalah
 * satu-satunya tempat piksel merek dibuat.
 *
 * ## Kenapa ikon kecil memakai "ERP", bukan "ERPindo"
 *
 * Favicon 64px dan ikon PWA 192px terlalu kecil untuk sembilan huruf; pada
 * ukuran itu "ERPindo" menjadi noda. Ikon memakai "ERP" berserif di atas
 * permukaan krem — potongan wordmark yang sama, bukan lambang lain. Gambar
 * pratinjau (1200×630) memuat wordmark utuh beserta kalimatnya.
 *
 * Pemakaian: node scripts/make-icons.mjs — dijalankan manual bila warna atau
 * bentuk merek berubah; hasil PNG di-commit.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "apps/web/public");
const sharp = (
  await import("sharp").catch(() =>
    import(path.join(ROOT, "node_modules/.pnpm/node_modules/sharp/lib/index.js")),
  )
).default;

/**
 * Warna diambil dari `apps/web/src/styles.css`, bukan diketik ulang.
 *
 * Dibaca dengan regex sederhana alih-alih diimpor: skrip ini berjalan di Node
 * tanpa toolchain, dan menyalin nilainya ke sini akan menjadi salinan ketiga
 * yang bisa berpisah.
 */
const css = await import("node:fs").then((fs) =>
  fs.readFileSync(path.join(ROOT, "apps/web/src/styles.css"), "utf8"),
);
const ambil = (nama) => {
  const m = css.match(new RegExp(`--erp-${nama}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!m) throw new Error(`token --erp-${nama} tidak ditemukan di styles.css`);
  return m[1];
};
const KREM = ambil("surface-sunken");
const TINTA = ambil("ink");
const MEREK = ambil("brand-ink");
const GARIS = ambil("line");

const SERIF = "Source Serif 4, Source Serif Pro, DejaVu Serif, Georgia, serif";
const SANS = "Inter, DejaVu Sans, Helvetica, Arial, sans-serif";

/**
 * Ikon persegi bersudut membulat bertuliskan "ERP" di atas pita merek.
 *
 * Pita tanah liat di kaki ikon bukan hiasan: ia satu-satunya hal yang
 * mengikat ikon kecil ini ke wordmark utuh dan ke gambar pratinjau, yang
 * keduanya memakai pita yang sama. Tanpa itu, ikonnya hanya tiga huruf gelap
 * di atas krem — benar, tetapi tidak dikenali sebagai merek yang sama.
 */
function svgIkon(sisi) {
  const r = Math.round(sisi * 0.22);
  const ukuran = Math.round(sisi * 0.4);
  const pita = Math.round(sisi * 0.11);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sisi}" height="${sisi}">
  <defs>
    <clipPath id="sudut"><rect width="${sisi}" height="${sisi}" rx="${r}" ry="${r}"/></clipPath>
  </defs>
  <g clip-path="url(#sudut)">
    <rect width="${sisi}" height="${sisi}" fill="${KREM}"/>
    <rect y="${sisi - pita}" width="${sisi}" height="${pita}" fill="${MEREK}"/>
    <text x="50%" y="${(sisi - pita) / 2}" text-anchor="middle" dominant-baseline="central"
          font-family="${SERIF}" font-size="${ukuran}" fill="${TINTA}"
          letter-spacing="${-ukuran * 0.02}">ERP</text>
  </g>
</svg>`;
}

/** Gambar pratinjau tautan: wordmark utuh + satu kalimat. */
function svgPratinjau() {
  const w = 1200;
  const h = 630;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="${KREM}"/>
  <rect x="0" y="${h - 10}" width="${w}" height="10" fill="${MEREK}"/>
  <text x="90" y="300" font-family="${SERIF}" font-size="132" fill="${TINTA}" letter-spacing="-3">ERP<tspan
        font-family="${SANS}" font-weight="300" font-size="126" fill="${MEREK}">indo</tspan></text>
  <text x="94" y="372" font-family="${SANS}" font-size="38" fill="${TINTA}" opacity="0.75">Penjualan, stok, gaji, dan pajak dalam satu aplikasi</text>
  <text x="94" y="432" font-family="${SANS}" font-size="30" fill="${TINTA}" opacity="0.55">Untuk perusahaan Indonesia. Tanpa lisensi per pengguna.</text>
  <line x1="90" y1="${h - 120}" x2="${w - 90}" y2="${h - 120}" stroke="${GARIS}" stroke-width="2"/>
  <text x="94" y="${h - 72}" font-family="${SANS}" font-size="28" fill="${TINTA}" opacity="0.55">Rp 499.000 / bulan / perusahaan · pengguna tak terbatas</text>
</svg>`;
}

const tulis = async (svg, berkas) => {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(PUB, berkas));
  console.log(`  ✓ ${berkas}`);
};

console.log("Merender ikon merek dari teks…");
await tulis(svgIkon(512), "pwa-512.png");
await tulis(svgIkon(192), "pwa-192.png");
await tulis(svgIkon(64), "favicon.png");
await tulis(svgPratinjau(), "og-image.png");
console.log("Selesai. Tidak ada berkas sumber yang dipakai — seluruhnya dari teks.");
