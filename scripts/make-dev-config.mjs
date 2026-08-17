#!/usr/bin/env node
/**
 * Buat `wrangler.dev.jsonc` (root repo): salinan wrangler.jsonc TANPA binding
 * "ai". Binding Workers AI memaksa wrangler dev membuka sesi remote yang
 * butuh kredensial Cloudflare — tidak tersedia di CI/dev lokal. Semua
 * pemakaian `wrangler dev` (smoke, screenshot, dev lokal) memakai config ini;
 * deploy produksi tetap memakai wrangler.jsonc lengkap.
 *
 * Dipakai sebagai modul (makeDevConfig) atau dijalankan langsung.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function makeDevConfig() {
  const src = readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8");
  const stripped = src.replace(/^\s*"ai":\s*\{\s*"binding":\s*"AI"\s*\},?\s*$/m, "");
  if (stripped === src) {
    throw new Error("Binding \"ai\" tidak ditemukan di wrangler.jsonc — periksa format make-dev-config.mjs.");
  }
  /**
   * Pool tenant dev DIPERBESAR melampaui produksi (Fase 24).
   *
   * Produksi punya 6 binding; suite smoke sendiri menjelajahi lebih banyak
   * perusahaan dari itu (pemilik, viewer, pihak luar, comped + cabangnya,
   * pelanggan yang diaktifkan manual, perusahaan kedua…). Sebelum Fase 24
   * kebetulan masih muat; begitu "aktivasi manual membuatkan database" ikut
   * diuji, slotnya habis dan yang merah adalah uji yang sama sekali tak
   * berhubungan — kegagalan yang menyesatkan.
   *
   * Binding tambahan ini AMAN karena hanya ada di config dev: di mode lokal
   * miniflare membuat databasenya sendiri sesuai nama. Produksi tetap 6, dan
   * batas produksinya tetap dijaga uji kapasitas + kartu Admin → Infra.
   */
  const ekstra = [7, 8, 9, 10]
    .map((n) => `    { "binding": "TENANT_DB_${n}", "database_name": "erpindo-tenant-${n}", "database_id": "dev-tenant-${n}" }`)
    .join(",\n");
  const denganPool = stripped.replace(
    /(\{ "binding": "TENANT_DB_6",[^}]*\})/,
    (m) => `${m},\n${ekstra}`,
  );
  if (denganPool === stripped) {
    throw new Error("Binding TENANT_DB_6 tidak ditemukan di wrangler.jsonc — periksa format make-dev-config.mjs.");
  }

  /**
   * `APP_URL` DIBUANG dari config dev — dan ini bukan kerapian, melainkan
   * penjaga terhadap kegagalan total.
   *
   * `setSessionCookie` (`routes/auth.ts`) menyetel
   * `secure: appUrl.startsWith("https://")`. Bila `APP_URL` produksi
   * (`https://…`) ikut terbawa ke `wrangler dev`, cookie sesi ditandai Secure
   * padahal disajikan lewat `http://127.0.0.1` — peramban membuangnya diam-diam,
   * tidak ada sesi yang pernah terbentuk, dan SELURUH suite smoke + ui-sim
   * runtuh di langkah login. Gagalnya jauh dari sebabnya: yang memerah adalah
   * ratusan cek yang tak berhubungan.
   *
   * Tanpa var ini, `appOrigin()` jatuh ke origin request — persis perilaku yang
   * diuji suite selama ini (`http://127.0.0.1:<port>`).
   */
  // Membuang KOMA pendahulu + seluruh baris komentar di atasnya, bukan hanya
  // pasangan kunci-nilainya. Menyisakan komanya menghasilkan koma menggantung
  // sebelum `}` — JSONC memang memaafkannya, tetapi bergantung pada toleransi
  // parser untuk berkas yang menyalakan produksi adalah taruhan yang tak perlu.
  const tanpaAppUrl = denganPool.replace(/,\s*(?:\/\/[^\n]*\n\s*)*"APP_URL":\s*"[^"]*"/, "");
  if (tanpaAppUrl === denganPool) {
    throw new Error(
      'Var "APP_URL" tidak ditemukan di wrangler.jsonc. Ia WAJIB ada di produksi ' +
        "(email siklus langganan kehilangan tautannya tanpa itu) dan WAJIB dibuang di dev. " +
        "Periksa format make-dev-config.mjs.",
    );
  }

  const out = path.join(ROOT, "wrangler.dev.jsonc");
  writeFileSync(out, `// DIBUAT OTOMATIS oleh scripts/make-dev-config.mjs — jangan edit/commit.\n${tanpaAppUrl}`);
  return out;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(makeDevConfig());
}
