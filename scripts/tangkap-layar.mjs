#!/usr/bin/env node
/**
 * Menangkap tangkapan layar aplikasi untuk halaman `/tampilan` (Fase 39d).
 *
 * ## Kenapa skrip ini ada, padahal Fase 38 menghapus semua tangkapan layar
 *
 * Fase 38 membuang 57 gambar (3,9 MB) dan menggantinya dengan peragaan yang
 * berjalan sendiri. Alasannya masih berlaku dan tidak dicabut: tangkapan layar
 * adalah klaim yang harus dipercaya, sedangkan peragaan bisa diperiksa — dan
 * tangkapan layar menjadi basi diam-diam begitu tampilan aplikasi berubah.
 *
 * Halaman `/tampilan` menjawab kebutuhan yang berbeda, dan peragaan memang
 * tidak menjawabnya: pembeli perusahaan ingin melihat **satu layar penuh yang
 * padat** — sidebar, bilah atas, tabel sungguhan sekaligus — sementara peragaan
 * sengaja memperagakan satu alur sempit selangkah demi selangkah.
 *
 * Dua pengaman dipasang supaya kesalahan lama tidak terulang:
 *
 * 1. **Gambar tidak pernah ditulis tangan.** Seluruhnya ditangkap dari aplikasi
 *    yang benar-benar berjalan di atas data demo — perintahnya satu baris, jadi
 *    menyegarkan kembali bukan proyek.
 * 2. **Umurnya tercetak di halaman.** Skrip ini menulis tanggal dan commit saat
 *    penangkapan ke `tangkapanMeta.ts`, dan halaman menampilkannya. Tangkapan
 *    layar basi yang MENGAKU segar adalah masalahnya; yang menyebutkan
 *    umurnya sendiri tidak.
 *
 * Selain itu `apps/web/test/tampilan.test.ts` menolak berkas yang disebut
 * halaman tetapi tidak ada di cakram — supaya gambar hilang menggagalkan build,
 * bukan menyisakan kotak kosong di halaman jualan.
 *
 * Pemakaian:  node scripts/tangkap-layar.mjs
 * Prasyarat:  chromium (/opt/pw-browsers/chromium, override CHROMIUM_PATH).
 */

import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.SHOT_PORT ?? 8841);
const BASE = `http://127.0.0.1:${PORT}`;
const EMAIL = "demo.tampilan@contoh.co.id";
const PASSWORD = "rahasia-tampilan-123";
const persistDir = path.join(tmpdir(), `erpindo-tampilan-${Date.now()}`);

const OUT_DIR = "apps/web/public/tampilan";
const META_TS = "apps/web/src/pages/publik/tangkapanMeta.ts";

/**
 * Daftar tangkapan.
 *
 * `nama` di sini WAJIB sama dengan `berkas` di `tangkapanDaftar.ts` — itulah
 * yang diperiksa `apps/web/test/tampilan.test.ts`. Keterangannya sengaja
 * TIDAK ditaruh di sini: keterangan adalah naskah jualan dwibahasa, dan
 * tempatnya di berkas naskah, bukan di skrip ops.
 */
const TANGKAPAN = [
  // Lingkungan tangkapan layar tidak punya binding Workers AI, sehingga widget
  // ringkasan mingguan mengumumkan "Fitur AI belum tersedia" — benar untuk dev,
  // KELIRU untuk produksi (Asisten terverifikasi menjawab di sana sejak Fase
  // 5a). Membiarkannya berarti gambar dasbor di halaman jualan memberitakan
  // bahwa sebuah fitur mati. Artefak lingkungan, bukan perilaku produk.
  { rute: "/app", nama: "dasbor", tungguMs: 1800, sembunyikanTeks: "Fitur AI belum tersedia" },
  { rute: "/app/pos", nama: "kasir", tungguMs: 1400 },
  { rute: "/app/penjualan", nama: "penjualan", tungguMs: 1400 },
  { rute: "/app/keuangan/laba-rugi", nama: "laba-rugi", tungguMs: 1400 },
  { rute: "/app/keuangan/neraca", nama: "neraca", tungguMs: 1400 },
  { rute: "/app/stok", nama: "stok", tungguMs: 1400 },
  { rute: "/app/hr/penggajian", nama: "penggajian", tungguMs: 1400 },
  { rute: "/app/keuangan/jurnal", nama: "jurnal", tungguMs: 1200 },
  { rute: "/app/keuangan/e-faktur", nama: "e-faktur", tungguMs: 1200 },
  { rute: "/app/keuangan/aset", nama: "aset", tungguMs: 1200 },
];

const LEBAR = 1440;
const TINGGI = 900;
/** Lebar akhir WebP. Ditangkap 2× lalu diperkecil supaya tajam di layar HiDPI. */
const LEBAR_AKHIR = 1200;
const MUTU = 80;

// ---------------------------------------------------------------------------
// Boot stack — resep sama dengan ui-sim.mjs.
// ---------------------------------------------------------------------------
const { makeDevConfig } = await import(path.join(ROOT, "scripts/make-dev-config.mjs"));
makeDevConfig();

console.log(`Menyiapkan wrangler dev di :${PORT} (persist ${persistDir})...`);
const dev = spawn(
  "pnpm",
  [
    "exec",
    "wrangler",
    "dev",
    "-c",
    "../../wrangler.dev.jsonc",
    "--port",
    String(PORT),
    "--persist-to",
    persistDir,
    "--show-interactive-dev-session=false",
    // Akun comped → kebal pagar "satu perusahaan trial per akun" (Fase 13b),
    // sehingga seed-demo bisa membuat PT Demo Sejahtera sebagai perusahaan kedua.
    "--var",
    `COMPED_EMAILS:${EMAIL}`,
  ],
  { cwd: path.join(ROOT, "apps/api"), stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1" } },
);
dev.stdout.on("data", () => {});
dev.stderr.on("data", () => {});

async function tungguSiap(timeoutMs = 90_000) {
  const mulai = Date.now();
  while (Date.now() - mulai < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* belum siap */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("wrangler dev tidak siap.");
}

function jalankan(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} keluar ${code}`))));
  });
}

function komitSekarang() {
  return new Promise((resolve) => {
    const p = spawn("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] });
    let keluar = "";
    p.stdout.on("data", (b) => (keluar += b));
    p.on("exit", (code) => resolve(code === 0 ? keluar.trim() : "tidak diketahui"));
  });
}

try {
  await tungguSiap();
  console.log("Server siap. Registrasi akun contoh + seed demo lokal...");
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName: "Kopi Nusantara", name: "Dewi Lestari", email: EMAIL, password: PASSWORD }),
  });
  if (reg.status !== 201) throw new Error(`register gagal: ${reg.status}`);
  await jalankan("node", ["scripts/seed-demo.mjs"], { BASE_URL: BASE, SEED_EMAIL: EMAIL, SEED_PASSWORD: PASSWORD });

  console.log("Menangkap halaman...");
  const { chromium } = await import("playwright-core");
  const sharp = (
    await import("sharp").catch(() => import(path.join(ROOT, "node_modules/.pnpm/node_modules/sharp/lib/index.js")))
  ).default;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({
    viewport: { width: LEBAR, height: TINGGI },
    deviceScaleFactor: 2,
    // locale id-ID (Fase 17e): tanpa ini Chromium default en-US dan seluruh
    // aplikasi ter-render bahasa Inggris — gambar berbahasa Inggris di halaman
    // jualan berbahasa Indonesia.
    locale: "id-ID",
  });
  // Tur dasbor (Fase 10f) muncul sekali untuk pengguna baru dan MENUTUPI kartu
  // KPI tepat di tengah tangkapan dasbor. Tandai "sudah dilihat".
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("erpindo-tour:dashboard", "1");
    } catch {
      /* abaikan */
    }
  });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/masuk`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.setItem("erpindo-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("**/app", { timeout: 30_000 });

  // Pindah ke workspace PT Demo Sejahtera (perusahaan kedua, penuh data).
  const me = await page.evaluate(async () => (await fetch("/api/auth/me")).json());
  const demo = me.memberships.find((m) => m.tenantSlug.startsWith("pt-demo-sejahtera"));
  if (demo) await page.evaluate((tid) => localStorage.setItem("erpindo-tenant", tid), demo.tenantId);

  const outAbs = path.join(ROOT, OUT_DIR);
  mkdirSync(outAbs, { recursive: true });
  let total = 0;
  for (const t of TANGKAPAN) {
    await page.goto(`${BASE}${t.rute}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(t.tungguMs);
    // Banner "email belum diverifikasi" adalah artefak lingkungan tangkapan
    // layar, bukan perilaku produk yang dilihat pelanggan berlangganan.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("div")) {
        if (el.childElementCount === 0 && el.textContent?.includes("belum diverifikasi")) {
          (el.closest("[class*='rounded']") ?? el).remove();
          break;
        }
      }
    });
    // Elemen yang hanya muncul karena keterbatasan lingkungan (lihat
    // `sembunyikanTeks` di manifest) — bukan perilaku produk.
    if (t.sembunyikanTeks) {
      await page.evaluate((teks) => {
        for (const el of document.querySelectorAll("p, div, span")) {
          if (el.childElementCount === 0 && el.textContent?.includes(teks)) {
            el.remove();
            break;
          }
        }
      }, t.sembunyikanTeks);
    }
    const png = await page.screenshot({ fullPage: false });
    const buf = await sharp(png).resize({ width: LEBAR_AKHIR * 2 }).webp({ quality: MUTU }).toBuffer();
    const nama = `${t.nama}.webp`;
    await sharp(buf).toFile(path.join(outAbs, nama));
    total += buf.length;
    console.log(`  ✓ ${nama} (${Math.round(buf.length / 1024)} KB)`);
  }

  // Umur tangkapan dicetak ke berkas TS supaya halaman bisa menyebutkannya, dan
  // supaya `git diff` memperlihatkan kapan terakhir gambar-gambar ini disegarkan.
  const komit = await komitSekarang();
  const tanggal = new Date().toISOString().slice(0, 10);
  writeFileSync(
    path.join(ROOT, META_TS),
    `// BERKAS INI DIHASILKAN oleh \`node scripts/tangkap-layar.mjs\`. Jangan disunting tangan.
//
// Isinya umur tangkapan layar di \`apps/web/public/tampilan/\`, dan halaman
// \`/tampilan\` menampilkannya apa adanya. Tangkapan layar yang menyebutkan
// umurnya sendiri boleh menua; yang menyembunyikannya tidak.
export const TANGKAPAN_TANGGAL = ${JSON.stringify(tanggal)};
export const TANGKAPAN_KOMIT = ${JSON.stringify(komit)};
`,
  );

  console.log(
    `Selesai: ${TANGKAPAN.length} gambar, total ${Math.round(total / 1024)} KB → ${OUT_DIR}\n` +
      `Umur dicatat di ${META_TS} (${tanggal}, ${komit}).`,
  );

  await ctx.close();
  await browser.close();
} finally {
  dev.kill("SIGTERM");
  setTimeout(() => dev.kill("SIGKILL"), 1500);
  setTimeout(() => rmSync(persistDir, { recursive: true, force: true }), 2000);
}
