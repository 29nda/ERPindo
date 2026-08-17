#!/usr/bin/env node
/**
 * Verifikasi kesehatan perusahaan demo — dengan MENGUERI, bukan membaca kode.
 *
 * ## Kenapa berkas ini ada
 *
 * Fase 28 menemukan demo produksi menampilkan **rugi Rp 20,7 juta** pada bulan
 * lalu — pilihan periode paling wajar bagi pengunjung yang membuka Laba Rugi.
 * Penyebabnya aritmetika tanggal di skrip semai, dan **tidak satu pun gerbang
 * mutu bisa melihatnya**: typecheck, unit, smoke, dan ui-sim semuanya menguji
 * KODE, sedangkan cacatnya ada di DATA yang dihasilkan kode itu.
 *
 * Cacat itu ketahuan hanya karena seseorang mengueri database produksi dengan
 * tangan. Berkas ini menjadikan pemeriksaan itu otomatis dan bisa diulang,
 * sehingga demo yang tidak masuk akal tertangkap sebelum calon pelanggan
 * melihatnya — bukan sesudah.
 *
 * ## Cara pakai
 *
 *   node scripts/verifikasi-demo.mjs                 # semai + verifikasi lokal
 *   node scripts/verifikasi-demo.mjs --tanpa-semai   # verifikasi demo yang sudah ada
 *
 * Terhadap produksi (baca-saja, tidak menyemai apa pun):
 *
 *   BASE_URL=https://app.contoh.id SEED_EMAIL=… SEED_PASSWORD=… \
 *     node scripts/verifikasi-demo.mjs --tanpa-semai
 *
 * Keluar 1 bila ada bulan yang tidak masuk akal, disertai tabelnya.
 */

import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bulanRiwayat } from "./lib/kalender.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const TANPA_SEMAI = process.argv.includes("--tanpa-semai");
const PORT = 8801;
const LOKAL = `http://127.0.0.1:${PORT}`;
const BASE = (process.env.BASE_URL ?? LOKAL).replace(/\/$/, "");
const SEMAI_LOKAL = !TANPA_SEMAI && BASE === LOKAL;

/** Ambang: berapa bulan ke belakang yang diperiksa. Ikut kedalaman semai. */
const BULAN_DIPERIKSA = Number(process.env.BULAN_DIPERIKSA ?? 12);

let gagal = 0;
function periksa(nama, ok, detail = "") {
  if (ok) {
    console.log(`  ✓ ${nama}`);
  } else {
    gagal++;
    console.error(`  ✗ ${nama} ${detail}`);
  }
}

function klien(cookieAwal = "") {
  let cookie = cookieAwal;
  return async function request(method, path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const sc = res.headers.get("set-cookie");
    if (sc) cookie = sc.split(";")[0];
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* bukan JSON */
    }
    return { status: res.status, json, cookie };
  };
}

const rupiah = (n) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

// ---------------------------------------------------------------------------
// 1. Siapkan server + data
// ---------------------------------------------------------------------------
let anak = null;
const EMAIL = process.env.SEED_EMAIL ?? "verifikator@contoh.id";
const PASSWORD = process.env.SEED_PASSWORD ?? "RahasiaVerifikasi123";

async function tungguSiap(url, batasMs = 120_000, sudahMati = () => null) {
  const mulai = Date.now();
  for (;;) {
    const kode = sudahMati();
    if (kode !== null && kode !== undefined) {
      throw new Error(`wrangler keluar dengan kode ${kode} sebelum siap melayani`);
    }
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      /* belum siap */
    }
    if (Date.now() - mulai > batasMs) throw new Error(`Server tidak siap dalam ${batasMs} ms`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

if (SEMAI_LOKAL) {
  const { makeDevConfig } = await import(join(ROOT, "scripts/make-dev-config.mjs"));
  makeDevConfig();
  const persist = mkdtempSync(join(tmpdir(), "erpindo-verifikasi-"));
  console.log("0. Menjalankan wrangler dev + D1 lokal…");
  anak = spawn(
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
      persist,
      "--show-interactive-dev-session=false",
      // Akun verifikator harus comped: pendaftar biasa lahir `provisioning`
      // dan DILARANG menambah perusahaan (pagar anti-abuse Fase 24a), sehingga
      // seed berhenti 402 di tengah jalan tanpa konteks.
      "--var",
      `COMPED_EMAILS:${EMAIL}`,
    ],
    // `detached: true` menaruh wrangler di GRUP PROSES sendiri supaya bisa
    // dimatikan sekeluarga. Tanpa ini `pnpm` — yang hanya pembungkus — menerima
    // sinyalnya dan TIDAK meneruskannya ke wrangler, sehingga servernya
    // selamat dan tetap memegang port. Akibatnya bukan sekadar proses yatim:
    // pemanggilan verifikasi BERIKUTNYA menyambung ke server lama beserta data
    // lamanya, lalu berhenti dengan "perusahaan demo sudah ada" — kegagalan
    // yang menuduh datanya, padahal penyebabnya pembersihan yang bocor.
    { cwd: join(ROOT, "apps/api"), stdio: ["ignore", "pipe", "pipe"], detached: true },
  );
  const log = [];
  anak.stdout.on("data", (d) => log.push(d.toString()));
  anak.stderr.on("data", (d) => log.push(d.toString()));
  // Kematian wrangler harus MENGHENTIKAN skrip, bukan membiarkannya menunggu
  // server yang tidak akan pernah datang. Tanpa penjaga ini, wrangler yang mati
  // saat boot (mis. port terpakai) membuat proses ini menggantung tanpa jejak —
  // dan menggantung tanpa pesan jauh lebih mahal daripada gagal berisik.
  let matiSaatBoot = null;
  anak.on("exit", (kode) => {
    matiSaatBoot = kode;
  });
  try {
    await tungguSiap(`${BASE}/api/health`, 120_000, () => matiSaatBoot);
  } catch (e) {
    console.error(log.join("") || "(wrangler tidak mengeluarkan apa pun)");
    throw e;
  }
}

function bersihkan() {
  if (!anak?.pid || anak.killed) return;
  try {
    // PID negatif = seluruh grup proses (wrangler + workerd, bukan hanya
    // pembungkus pnpm). SIGKILL, bukan SIGTERM: wrangler kadang menunda
    // penutupan dan proses Node ini keburu selesai.
    process.kill(-anak.pid, "SIGKILL");
  } catch {
    /* sudah mati */
  }
}
process.on("exit", bersihkan);
process.on("SIGINT", () => {
  bersihkan();
  process.exit(130);
});

const api = klien();

if (SEMAI_LOKAL) {
  console.log("1. Mendaftarkan akun verifikator (comped) & menyemai demo…");
  const daftar = await api("POST", "/api/auth/register", {
    companyName: "PT Verifikator",
    name: "Verifikator",
    email: EMAIL,
    password: PASSWORD,
  });
  if (![200, 201, 409].includes(daftar.status)) {
    console.error(`Registrasi gagal: HTTP ${daftar.status} ${JSON.stringify(daftar.json)}`);
    process.exit(1);
  }

  const semai = spawn("node", [join(ROOT, "scripts/seed-demo.mjs")], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BASE_URL: BASE, SEED_EMAIL: EMAIL, SEED_PASSWORD: PASSWORD },
  });
  const semaiLog = [];
  semai.stdout.on("data", (d) => semaiLog.push(d.toString()));
  semai.stderr.on("data", (d) => semaiLog.push(d.toString()));
  const kode = await new Promise((r) => semai.on("close", r));
  if (kode !== 0) {
    console.error(semaiLog.join(""));
    console.error(`\nPenyemaian gagal (exit ${kode}).`);
    process.exit(1);
  }
  console.log(`   penyemaian selesai (${semaiLog.join("").match(/\d+ langkah/)?.[0] ?? "selesai"})`);
}

// ---------------------------------------------------------------------------
// 2. Masuk & temukan tenant demo
// ---------------------------------------------------------------------------
const masuk = await api("POST", "/api/auth/login", { email: EMAIL, password: PASSWORD });
if (masuk.status !== 200) {
  console.error(`Login gagal: HTTP ${masuk.status} ${JSON.stringify(masuk.json)}`);
  process.exit(1);
}
const me = await api("GET", "/api/auth/me");
const demo = (me.json?.memberships ?? []).find((m) => /demo/i.test(m.tenantSlug ?? ""));
if (!demo) {
  console.error(`Perusahaan demo tidak ditemukan. Keanggotaan: ${JSON.stringify(me.json?.memberships)}`);
  process.exit(1);
}
const T = `/api/tenants/${demo.tenantId}`;
console.log(`\n2. Memverifikasi "${demo.tenantName}" (${BULAN_DIPERIKSA} bulan riwayat + bulan berjalan)\n`);

// ---------------------------------------------------------------------------
// 3. Laba rugi per bulan — inti pemeriksaan
// ---------------------------------------------------------------------------
const bulan = bulanRiwayat(BULAN_DIPERIKSA);
const kini = new Date();
const bulanBerjalan = {
  periode: kini.toISOString().slice(0, 7),
  hari: (h) => new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth(), h)).toISOString().slice(0, 10),
  akhir: kini.toISOString().slice(0, 10),
};

const baris = [];
for (const b of [...bulan, bulanBerjalan]) {
  const dari = `${b.periode}-01`;
  const sampai = b.akhir;
  const lr = await api("GET", `${T}/reports/income-statement?from=${dari}&to=${sampai}`);
  if (lr.status !== 200) {
    console.error(`Laba rugi ${b.periode} gagal: HTTP ${lr.status}`);
    process.exit(1);
  }
  const ns = await api("GET", `${T}/reports/balance-sheet?asOf=${sampai}`);
  if (ns.status !== 200) {
    console.error(`Neraca ${b.periode} gagal: HTTP ${ns.status}`);
    process.exit(1);
  }
  const akun = [...(ns.json?.assets ?? []), ...(ns.json?.liabilities ?? []), ...(ns.json?.equity ?? [])];
  const cari = (kode) => akun.find((a) => a.code === kode)?.amount ?? 0;

  baris.push({
    periode: b.periode,
    pendapatan: lr.json?.totalIncome ?? 0,
    beban: lr.json?.totalExpense ?? 0,
    laba: (lr.json?.totalIncome ?? 0) - (lr.json?.totalExpense ?? 0),
    kas: cari("1-1000") + cari("1-1100"), // Kas + Bank
    hutang: cari("2-1000"), // Hutang Usaha
  });
}

// Tabel — dicetak SELALU, lulus maupun gagal. Angkanya yang dilampirkan ke log
// fase; tanpa dicetak, "sudah diverifikasi" hanyalah klaim.
const lebar = (s, n) => String(s).padStart(n);
console.log("  Periode  | Pendapatan      | Beban           | Laba            | Kas+Bank        | Hutang Usaha");
console.log("  ---------|-----------------|-----------------|-----------------|-----------------|----------------");
for (const r of baris) {
  console.log(
    `  ${r.periode}  | ${lebar(rupiah(r.pendapatan), 15)} | ${lebar(rupiah(r.beban), 15)} | ` +
      `${lebar(rupiah(r.laba), 15)} | ${lebar(rupiah(r.kas), 15)} | ${lebar(rupiah(r.hutang), 15)}`,
  );
}
console.log("");

// ---------------------------------------------------------------------------
// 4. Asersi
// ---------------------------------------------------------------------------
// Bulan BERJALAN dikecualikan dari uji laba: ia selalu separuh jalan (belanja
// bulanan sudah masuk, penjualannya belum lengkap), jadi rugi di sana normal
// dan bukan tanda demo yang rusak. Yang dinilai pengunjung adalah bulan-bulan
// yang sudah utuh.
const riwayatSaja = baris.slice(0, -1);

const rugi = riwayatSaja.filter((r) => r.laba <= 0);
periksa(
  `tidak ada bulan riwayat yang rugi (${riwayatSaja.length} bulan diperiksa)`,
  rugi.length === 0,
  `→ rugi di: ${rugi.map((r) => `${r.periode} (${rupiah(r.laba)})`).join(", ")}`,
);

const kasNegatif = baris.filter((r) => r.kas < 0);
periksa(
  "kas + bank tidak pernah negatif di akhir bulan mana pun",
  kasNegatif.length === 0,
  `→ negatif di: ${kasNegatif.map((r) => `${r.periode} (${rupiah(r.kas)})`).join(", ")}`,
);

const kosong = riwayatSaja.filter((r) => r.pendapatan === 0);
periksa(
  "setiap bulan riwayat punya penjualan (tidak ada bulan kosong)",
  kosong.length === 0,
  `→ kosong: ${kosong.map((r) => r.periode).join(", ")}`,
);

// Hutang usaha yang menumpuk = perusahaan yang tidak pernah membayar pemasok.
// Fase 28 menemukan Rp 231,8 juta menumpuk dengan kas hanya Rp 152 juta.
const kasAkhir = baris[baris.length - 1].kas;
const hutangAkhir = baris[baris.length - 1].hutang;
periksa(
  "hutang usaha tidak melampaui kas (perusahaan mampu membayar pemasoknya)",
  hutangAkhir <= kasAkhir,
  `→ hutang ${rupiah(hutangAkhir)} vs kas ${rupiah(kasAkhir)}`,
);

// Tren tumbuh: bulan riwayat TERAKHIR harus ≥ bulan riwayat PERTAMA. Demo yang
// omzetnya menurun sepanjang tahun menjual cerita yang salah.
const pertama = riwayatSaja[0];
const terakhir = riwayatSaja[riwayatSaja.length - 1];
periksa(
  "tren omzet tumbuh sepanjang riwayat (bulan terakhir ≥ bulan pertama)",
  terakhir.pendapatan >= pertama.pendapatan,
  `→ ${pertama.periode} ${rupiah(pertama.pendapatan)} → ${terakhir.periode} ${rupiah(terakhir.pendapatan)}`,
);

// Puncak omzet harus di bulan riwayat TERAKHIR — bukan di suatu bulan di masa
// lalu. Dasbor menampilkan perbandingan "vs bulan lalu", dan dasbor itulah
// gambar produk terbesar di halaman depan; puncak yang tertinggal di belakang
// membuatnya menampilkan panah merah kepada calon pelanggan (temuan Fase 28).
//
// Sengaja dibandingkan ANTAR BULAN RIWAYAT, bukan terhadap bulan berjalan:
// bulan berjalan selalu separuh jalan, jadi membandingkannya akan membuat cek
// ini merah setiap kali dijalankan pada awal bulan — merah karena tanggal
// kalender, bukan karena datanya buruk. Cek yang merah karena alasan yang salah
// akan dimatikan orang, bukan diperbaiki.
const puncak = riwayatSaja.reduce((a, b) => (b.pendapatan > a.pendapatan ? b : a));
periksa(
  "puncak omzet ada di bulan riwayat TERAKHIR, bukan tertinggal di masa lalu",
  puncak.periode === terakhir.periode,
  `→ puncak di ${puncak.periode} (${rupiah(puncak.pendapatan)}), terakhir ${terakhir.periode} (${rupiah(terakhir.pendapatan)})`,
);

// Perbandingan tahun-ke-tahun butuh KEDUA sisi terisi — inilah alasan utama
// kedalaman dinaikkan ke 12 bulan.
periksa(
  `riwayat cukup dalam untuk pembanding tahun-ke-tahun (${riwayatSaja.length} ≥ 12 bulan)`,
  riwayatSaja.length >= 12,
  `→ hanya ${riwayatSaja.length} bulan`,
);

console.log("");
if (gagal > 0) {
  console.error(`${gagal} PEMERIKSAAN GAGAL ❌ — demo tidak layak ditampilkan ke calon pelanggan.`);
  process.exit(1);
}
console.log("DEMO MASUK AKAL ✅");
