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

  const out = path.join(ROOT, "wrangler.dev.jsonc");
  writeFileSync(out, `// DIBUAT OTOMATIS oleh scripts/make-dev-config.mjs — jangan edit/commit.\n${denganPool}`);
  return out;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  console.log(makeDevConfig());
}
