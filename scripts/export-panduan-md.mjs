#!/usr/bin/env node
/**
 * Generate versi Markdown panduan (docs/panduan/*.md) dari konten TS di
 * apps/web/src/pages/panduan/content/ — satu sumber kebenaran, tanpa
 * perawatan ganda. Jalankan setiap konten berubah, lalu commit hasilnya:
 *
 *   node scripts/export-panduan-md.mjs
 *
 * Konten di-bundle dengan esbuild (sudah tersedia sebagai dependensi
 * toolchain) agar TypeScript bisa diimpor dari Node.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs/panduan");
const tmpOut = path.join(tmpdir(), `panduan-content-${Date.now()}.mjs`);

// esbuild diambil dari store pnpm (dependensi toolchain vite/wrangler).
execFileSync(
  path.join(ROOT, "node_modules/.pnpm/node_modules/esbuild/bin/esbuild"),
  [
    "apps/web/src/pages/panduan/content/index.ts",
    "--bundle",
    "--format=esm",
    `--outfile=${tmpOut}`,
  ],
  { cwd: ROOT, stdio: "inherit" },
);

const { GUIDE_CATEGORIES } = await import(pathToFileURL(tmpOut).href);
rmSync(tmpOut, { force: true });

// Fase 38f — registri peragaan dibundel terpisah. Ia berisi narasi tiap
// peragaan, yang kini menggantikan tautan gambar di Markdown. Dibundel dari
// `peragaan/daftar.ts`, bukan `peragaan/index.ts`, karena yang terakhir
// mengekspor komponen React dan akan menarik React ke dalam bundel ini.
const tmpPeragaan = path.join(tmpdir(), `peragaan-daftar-${Date.now()}.mjs`);
execFileSync(
  path.join(ROOT, "node_modules/.pnpm/node_modules/esbuild/bin/esbuild"),
  ["apps/web/src/peragaan/daftar.ts", "--bundle", "--format=esm", `--outfile=${tmpPeragaan}`],
  { cwd: ROOT, stdio: "inherit" },
);
const { PERAGAAN } = await import(pathToFileURL(tmpPeragaan).href);
rmSync(tmpPeragaan, { force: true });

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const toc = [
  "# Panduan erpindo",
  "",
  "> Di-generate otomatis dari `apps/web/src/pages/panduan/content/` oleh",
  "> `scripts/export-panduan-md.mjs` — jangan edit manual; versi web ada di `/panduan`.",
  "",
];

for (const cat of GUIDE_CATEGORIES) {
  toc.push(`## ${cat.title}`, "");
  for (const m of cat.modules) {
    toc.push(`- [${m.title}](./${m.slug}.md)`);
    const lines = [`# ${m.title}`, "", m.intro, ""];
    if (m.appPath) lines.push(`> Buka di aplikasi: \`${m.appPath}\``, "");
    for (const s of m.sections) {
      lines.push(`## ${s.heading}`, "");
      for (const p of s.body ?? []) lines.push(p, "");
      if (s.steps?.length) {
        s.steps.forEach((st, i) => lines.push(`${i + 1}. ${st}`));
        lines.push("");
      }
      // Fase 38f — tangkapan layar diganti peragaan, dan Markdown tidak bisa
      // memainkan animasi. Yang dipancarkan adalah NARASINYA: daftar langkah
      // bernomor yang sama persis dengan yang dilihat pembaca di halaman web.
      //
      // Ini bukan penurunan mutu dibandingkan tautan gambar yang lama. Tautan
      // itu menunjuk `../../apps/web/public/panduan/*.webp` — jalur yang benar
      // hanya bila dokumennya dibaca dari dalam repo, dan rusak di mana pun
      // Markdown-nya ditayangkan. Teks selalu terbaca.
      if (s.peragaan) {
        const naskah = PERAGAAN[s.peragaan];
        if (naskah) {
          lines.push(`**${naskah.judul.id}**`, "", naskah.ringkas.id, "");
          naskah.langkah.forEach((l, i) => lines.push(`${i + 1}. ${l.narasi.id}`));
          lines.push("");
        }
      }
      if (s.tips?.length) {
        for (const t of s.tips) lines.push(`> 💡 ${t}`);
        lines.push("");
      }
    }
    writeFileSync(path.join(OUT_DIR, `${m.slug}.md`), lines.join("\n"));
  }
  toc.push("");
}

writeFileSync(path.join(OUT_DIR, "README.md"), toc.join("\n"));
const total = GUIDE_CATEGORIES.reduce((n, c) => n + c.modules.length, 0);
console.log(`Selesai: ${total} modul panduan → docs/panduan/`);
