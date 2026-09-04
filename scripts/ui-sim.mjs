#!/usr/bin/env node
/**
 * Simulasi UI penuh (Fase 9b): klik-tembus browser NYATA di atas seluruh fitur.
 *
 * Berbeda dari smoke (lapis HTTP) dan screenshots (navigasi + tangkap saja),
 * skrip ini mengetik di form, mengeklik tombol, dan memverifikasi hasil —
 * sambil memantau pageerror, console.error, dan respons ≥500 di setiap rute.
 *
 * Alur: spawn `wrangler dev` port scratch → daftar akun → seed demo penuh →
 * login Playwright → (1) sapu semua rute AUDIT_ROUTES → (2) ±13 alur
 * interaktif nyata. Reporter ala smoke: `UI-SIM: N/N checks passed`, exit 1
 * bila ada yang gagal.
 *
 * Pemakaian:  node scripts/ui-sim.mjs
 * Prasyarat:  chromium (env CI: `npx playwright-core install chromium` atau
 *             /opt/pw-browsers/chromium; override via CHROMIUM_PATH).
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIT_ROUTES } from "./audit-routes.mjs";
import { y4mEan13 } from "./lib/ean13.mjs";
import { laporAngkaGerbang } from "./lib/angka-gerbang.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.UISIM_PORT ?? 8798);
const BASE = `http://127.0.0.1:${PORT}`;
const EMAIL = "demo.uisim@contoh.co.id";
const PASSWORD = "rahasia-uisim-123";
const persistDir = path.join(tmpdir(), `erpindo-uisim-${Date.now()}`);

/**
 * Kamera palsu untuk pemindai barcode (Fase 21g).
 *
 * Chromium bisa diberi berkas YUV4MPEG2 sebagai ganti kamera, dan memutarnya
 * berulang. Dengan satu bingkai berisi barcode produk demo, suite ini bisa
 * menjalankan JALUR PEMINDAIAN YANG BERHASIL dari ujung ke ujung — bukan cuma
 * degradasinya seperti pada Fase 20i. Yang ikut terbukti karenanya: header
 * CSP & Permissions-Policy sungguhan, penyajian berkas wasm oleh Worker,
 * `import()` dinamisnya, penguraian dari bingkai kamera, lalu `lookupBarcode`
 * sampai barang masuk keranjang.
 */
const BARCODE_KOPI = "8990011112224";
const kameraPalsu = path.join(tmpdir(), `erpindo-uisim-kamera-${Date.now()}.y4m`);
writeFileSync(kameraPalsu, y4mEan13(BARCODE_KOPI));

// ---------------------------------------------------------------------------
// Reporter ala smoke.
// ---------------------------------------------------------------------------
let passed = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.error(`  ✗ ${name} ${extra}`);
  }
}

// ---------------------------------------------------------------------------
// Boot stack (resep sama dengan screenshots.mjs).
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
    // Akun demo publik (Fase 13b): comped → aktif permanen + kebal pagar trial,
    // sehingga seed bisa membuat perusahaan kedua (PT Demo Sejahtera).
    "--var",
    `COMPED_EMAILS:${EMAIL}`,
    // Fase 30f: akun simulasi dijadikan admin platform supaya dasbor admin
    // benar-benar DIRENDER di peramban. Sebelum ini satu-satunya keadaan yang
    // pernah dilihat ui-sim adalah pesan penolakan "khusus admin platform" —
    // artinya seluruh isi dasbor (metrik bisnis, kuota, tabel tenant, editor
    // blog) tidak punya cakupan browser sama sekali.
    "--var",
    `PLATFORM_ADMIN_EMAILS:${EMAIL}`,
  ],
  { cwd: path.join(ROOT, "apps/api"), stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "1" } },
);
dev.stdout.on("data", () => {});
dev.stderr.on("data", () => {});

async function waitReady(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
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

/**
 * Buka Lembar (panel geser) lewat aksi utama halaman, lalu tunggu ia terpasang.
 *
 * Ada karena Fase 38h memindahkan formulir pembuatan dari ATAS DAFTAR ke dalam
 * `<Lembar>`. Sebelumnya formulir selalu terpasang, jadi asersi bisa langsung
 * `page.fill("#tk-subject", …)`. Kini medannya belum ada di DOM sampai
 * lembarnya dibuka.
 *
 * Satu penolong, ±25 pemanggil — bukan dua puluh lima suntingan bespoke yang
 * masing-masing bisa salah dengan caranya sendiri.
 */
async function bukaLembar(page, namaTombol) {
  await page.getByRole("button", { name: namaTombol }).first().click();
  await page.locator("[data-lembar]").waitFor({ state: "visible", timeout: 10_000 });
  // Animasi masuk singkat; menunggu satu bingkai membuat `fill` berikutnya
  // tidak mengenai elemen yang masih bergerak.
  await page.waitForTimeout(180);
  await lembarTidakMeluber(page, namaTombol);
}

/**
 * Lembar tidak boleh menggulir ke samping (Fase 38s).
 *
 * Ditemukan lewat tangkapan layar, bukan lewat gerbang: formulir produk masih
 * memakai kisi selebar halaman penuh (`sm:grid-cols-[8rem_1fr_5rem_9rem_9rem_
 * 8rem_auto]`, ±46rem) padahal Lembar hanya selebar `max-w-3xl` (48rem dikurangi
 * padding). Medan "Nama" tergencet menjadi selebar satu huruf dan tombol simpan
 * terpotong di tepi kanan.
 *
 * Seluruh gerbang hijau saat itu, dan itulah masalahnya: asersi yang ada
 * menguji medan BISA DIISI, dan medan selebar satu huruf tetap bisa diisi.
 * Tidak ada satu pun yang menguji medan BISA DIBACA.
 *
 * Karena itu penjaganya dipasang di dalam `bukaLembar()` sendiri, bukan sebagai
 * asersi terpisah di satu halaman: setiap pemanggil yang sudah ada ikut
 * terjaga, dan setiap Lembar yang ditulis nanti terjaga tanpa siapa pun perlu
 * ingat menambahkannya. Kisi lebar berikutnya akan menabrak gerbang pada hari
 * ia ditulis, bukan pada hari seseorang membuka lembarnya.
 */
async function lembarTidakMeluber(page, namaTombol) {
  const luber = await page.evaluate(() => {
    const l = document.querySelector("[data-lembar]");
    if (!l) return null;
    // 2 px toleransi: pembulatan sub-piksel pada border kadang menghasilkan
    // selisih 1 px yang tidak pernah terlihat mata.
    const cari = (el) =>
      el.scrollWidth - el.clientWidth > 2
        ? { tag: el.tagName.toLowerCase(), kelas: el.className.toString().slice(0, 90), lebih: el.scrollWidth - el.clientWidth }
        : null;
    // Kendali formulir DILEWATI, dan ini bukan pelonggaran — ini koreksi.
    //
    // `scrollWidth` sebuah <select> adalah lebar OPSI TERPANJANGNYA, bukan
    // lebar tata letaknya. Peramban memotong sendiri teks opsi yang tidak muat
    // dan tidak pernah mendorong apa pun ke samping karenanya, jadi angka itu
    // bukan gejala cacat. Hal yang sama berlaku untuk <input> dan <textarea>
    // yang isinya lebih panjang daripada kotaknya.
    //
    // Ketahuan lewat CI, bukan lewat mesin ini: runner GitHub memakai font
    // pengganti yang lebih lebar, sehingga pemilih akun di jurnal manual
    // berbahasa Inggris melewati ambang 19 piksel di sana sementara di sini
    // tidak. Aturan yang hasilnya bergantung pada font yang kebetulan
    // terpasang bukan aturan — ia lotre yang merah di tempat lain.
    //
    // Daya tangkapnya utuh: cacat yang melahirkan penjaga ini terdeteksi pada
    // `div.space-y-4` (77px), sebuah WADAH — dan wadah tetap diperiksa.
    const KENDALI = ["select", "input", "textarea", "button"];
    const semua = [l, ...l.querySelectorAll("*")];
    for (const el of semua) {
      if (KENDALI.includes(el.tagName.toLowerCase())) continue;
      const t = cari(el);
      // `overflow-x: auto` yang DISENGAJA (tabel lebar, sumur kode) bukan cacat.
      if (t && !["auto", "scroll"].includes(getComputedStyle(el).overflowX)) return t;
    }
    return null;
  });
  check(
    `Lembar "${namaTombol}" tidak menggulir ke samping`,
    luber === null,
    luber ? `${luber.tag}.${luber.kelas} lebih ${luber.lebih}px` : "",
  );
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

let browser;
try {
  await waitReady();
  console.log("Server siap. Registrasi + seed demo penuh...");
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName: "Kopi Nusantara", name: "Dewi Lestari", email: EMAIL, password: PASSWORD }),
  });
  if (reg.status !== 201) throw new Error(`register gagal: ${reg.status}`);
  await run("node", ["scripts/seed-demo.mjs"], { BASE_URL: BASE, SEED_EMAIL: EMAIL, SEED_PASSWORD: PASSWORD });

  const { chromium } = await import("playwright-core");
  // Prioritas: CHROMIUM_PATH → chromium sistem (/opt/pw-browsers) → registri
  // playwright-core sendiri (CI memasang via `npx playwright-core install`).
  const chromiumPath =
    process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
  browser = await chromium.launch({
    ...(chromiumPath ? { executablePath: chromiumPath } : {}),
    args: [
      // Kamera palsu Fase 21g: izin diberikan otomatis dan bingkainya diambil
      // dari berkas y4m di atas, bukan dari perangkat yang memang tak ada.
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${kameraPalsu}`,
    ],
  });
  // locale id-ID: pasar utama Indonesia — i18n (Fase 13e) default ke Indonesia
  // (tanpa ini Chromium default en-US → aplikasi ter-render Inggris).
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, locale: "id-ID" });
  // Tur dasbor (Fase 10f) tampil otomatis sekali untuk pengguna baru — tandai
  // "sudah dilihat" agar tidak menutupi asersi sapuan rute. Tur diuji eksplisit
  // di F18 lewat tombolnya (yang bekerja terlepas dari status ini).
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("erpindo-tour:dashboard", "1");
    } catch {
      /* abaikan */
    }
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15_000);

  // Instrumentasi galat: dikumpulkan per segmen (rute/alur) lalu diperiksa.
  // "Failed to load resource" 4xx dikecualikan (mis. cek sesi 401 di halaman
  // publik — perilaku normal); pageerror & respons ≥500 selalu fatal.
  let errors = [];
  const resetErrors = () => {
    errors = [];
  };
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    // 503 endpoint AI = degradasi anggun yang DIHARAPKAN di dev/CI tanpa binding
    // Workers AI (widget menampilkan teks redup, bukan error) — bukan galat.
    if (r.status() === 503 && r.url().includes("/ai/")) return;
    if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`);
    // POST 4xx saat simulasi = aksi ditolak — catat ke log agar kegagalan alur
    // langsung terlihat penyebabnya di keluaran CI.
    if (r.status() >= 400 && r.request().method() === "POST") {
      r.text()
        .then((body) => console.error(`  [POST ${r.status()}] ${r.url()} ${body.slice(0, 200)}`))
        .catch(() => {});
    }
  });
  // Struk POS dibuka via window.open — tutup otomatis agar tidak menumpuk.
  ctx.on("page", (p) => {
    if (p !== page) p.close().catch(() => {});
  });

  const gotoRoute = async (route, waitMs = 700) => {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(waitMs);
  };
  /** Pasangan `postDone` untuk permintaan GET (Fase 23b). */
  const pageGet = (urlPart) =>
    page.waitForResponse(
      (r) => r.url().includes(urlPart) && r.request().method() === "GET" && r.status() === 200,
      { timeout: 15_000 },
    );
  const postDone = (urlPart, okStatus = [200, 201]) =>
    page.waitForResponse(
      (r) => r.url().includes(urlPart) && r.request().method() === "POST" && okStatus.includes(r.status()),
    );

  // -------------------------------------------------------------------------
  // 0. Login + pindah workspace.
  // -------------------------------------------------------------------------
  console.log("0. Login & pindah workspace");
  resetErrors();
  await gotoRoute("/masuk", 300);
  // F23 — Fase 17f. Ketiga selektor di bawah adalah GERBANG seluruh suite:
  // setiap cek F0–F22 melewati form ini lebih dulu. Diperiksa eksplisit SEBELUM
  // dipakai supaya kegagalannya menyebut sendiri sebabnya — tanpa cek ini,
  // `page.fill("#email")` hanya melempar timeout yang tidak menjelaskan apa pun
  // padahal penyebabnya perombakan `auth.tsx`.
  const gerbang = {
    email: await page.locator("#email").count(),
    password: await page.locator("#password").count(),
    submit: await page.locator("button[type=submit]").count(),
  };
  check(
    "F23 kontrak halaman masuk utuh (#email, #password, button[type=submit])",
    gerbang.email === 1 && gerbang.password === 1 && gerbang.submit >= 1,
    `→ email=${gerbang.email} password=${gerbang.password} submit=${gerbang.submit}`,
  );
  // F1a — Fase 19a: wordmark tidak lagi berlatar chip putih.
  //
  // Diukur dari GAYA TERHITUNG pembungkusnya, bukan dari ada/tidaknya kelas
  // `bg-white` di markup: kelas bisa saja hilang sementara latar putih kembali
  // lewat jalan lain, dan sebaliknya asersi "tidak ada kelas bg-white" akan
  // hijau walaupun logonya tetap berkotak putih. Halaman /masuk dipilih karena
  // di sinilah masalahnya paling terlihat — wordmark berdiri di atas panel
  // `brand-50` yang berwarna, sehingga kotak putih langsung tampak.
  // Fase 32a: wordmark tidak lagi <img> melainkan TEKS (lihat BrandWordmark).
  // Yang diuji tidak berubah — latar di belakang wordmark tidak boleh putih di
  // atas panel berwarna — hanya cara menemukannya. Dicari lewat `aria-label`,
  // bukan nama kelas: label itu bagian dari kontrak aksesibilitas komponennya,
  // sedangkan kelas bisa berganti kapan saja tanpa mengubah apa pun yang dilihat
  // atau didengar pengguna.
  const latarWordmark = await page.evaluate(() => {
    const el = document.querySelector('[data-wordmark]');
    if (!el) return null;
    const bungkus = el.parentElement;
    const bg = getComputedStyle(bungkus).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    const [r, g, b, a = "1"] = m ? m[1].split(",").map((s) => s.trim()) : [];
    return { bg, buram: Number(a) > 0 && Number(r) > 245 && Number(g) > 245 && Number(b) > 245 };
  });
  check(
    "F1a wordmark tanpa chip putih di atas panel brand halaman masuk",
    Boolean(latarWordmark && latarWordmark.buram === false),
    `→ ${latarWordmark ? `latar=${latarWordmark.bg}` : "wordmark tidak ditemukan"}`,
  );

  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("**/app", { timeout: 30_000 });
  check("login via form → diarahkan ke /app", page.url().endsWith("/app"));

  // F20a — Fase 18a: arahnya DIBALIK dari gelap-dulu (17a) menjadi TERANG-dulu.
  // Ceknya tidak dihapus, hanya diputar: yang diuji tetap hal yang sama, yaitu
  // apakah skrip anti-FOUC memasang tema SEBELUM React jalan.
  //
  // Konteks ui-sim TIDAK menyetel preferensi tema, jadi ini menguji perilaku
  // bawaan. `data-theme-init` HANYA dipasang oleh public/theme-init.js — tanpa
  // penanda itu asersi ini akan lolos secara hampa dari efek React yang
  // berjalan belakangan, padahal justru anti-FOUC-nya yang sedang diuji.
  const temaAwal = await page.evaluate(() => ({
    init: document.documentElement.dataset.themeInit ?? "",
    dark: document.documentElement.classList.contains("dark"),
    scheme: document.documentElement.style.colorScheme,
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  const rgbTerang = (s) => {
    const m = s.match(/\d+/g);
    return m ? Number(m[0]) + Number(m[1]) + Number(m[2]) > 600 : false;
  };
  check(
    "F20a anti-FOUC memasang tema terang-dulu sebelum React (data-theme-init + latar terang)",
    temaAwal.init === "light" && !temaAwal.dark && temaAwal.scheme === "light" && rgbTerang(temaAwal.bg),
    `→ init=${temaAwal.init || "(tidak jalan)"} dark=${temaAwal.dark} scheme=${temaAwal.scheme} bg=${temaAwal.bg}`,
  );
  // Dashboard tenant BARU (Fase 10a): perusahaan pertama (Kopi Nusantara) belum
  // punya transaksi — kartu KPI harus menampilkan "Rp 0" nyata, bukan shimmer.
  //
  // Fase 19s: dulu `waitForTimeout(1200)` lalu langsung diasersi. Ambang itu
  // cukup di mesin pengembang tetapi mulai merah di runner CI yang lebih
  // lambat — dua cek ini gagal pada PR yang sama sekali tidak menyentuh
  // dasbor. Sekarang KONDISINYA yang ditunggu, bukan waktunya. Kekuatan
  // asersinya tidak berubah (tetap ≥3 "Rp 0" dan nol shimmer); yang hilang
  // hanya ketergantungan pada kecepatan mesin. Bila memang macet, tunggu ini
  // habis dan asersi di bawah tetap merah dengan diagnostik yang sama.
  await page
    .waitForFunction(
      () => {
        const t = document.body.innerText;
        return (
          t.includes("Kas & Bank") &&
          (t.match(/Rp\s?0/g) ?? []).length >= 3 &&
          document.querySelectorAll(".animate-pulse").length === 0
        );
      },
      { timeout: 15_000 },
    )
    .catch(() => {});
  const freshBody = await page.innerText("body");
  check(
    "dashboard tenant baru menampilkan Rp 0 (bukan skeleton abu-abu)",
    freshBody.includes("Kas & Bank") && (freshBody.match(/Rp\s?0/g) ?? []).length >= 3,
    `→ ${(freshBody.match(/Rp\s?0/g) ?? []).length} nilai Rp 0`,
  );
  check(
    "dashboard tenant baru tanpa skeleton tersisa di kartu KPI",
    (await page.locator(".animate-pulse:visible").count()) === 0,
  );
  const me = await page.evaluate(async () => (await fetch("/api/auth/me")).json());
  const demo = me.memberships.find((m) => m.tenantSlug.startsWith("pt-demo-sejahtera"));
  check("akun punya workspace PT Demo Sejahtera hasil seed", Boolean(demo));
  await page.evaluate((tid) => localStorage.setItem("erpindo-tenant", tid), demo.tenantId);
  await gotoRoute("/app", 900);
  check("workspace aktif menampilkan PT Demo Sejahtera", (await page.innerText("body")).includes("PT Demo Sejahtera"));
  check("login & pindah workspace tanpa galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // Quick wins dashboard (Fase 12d): KPI Laba, filter rentang grafik, KPI klik-tembus.
  resetErrors();
  const dashBody = await page.innerText("body");
  check("dashboard memuat KPI 'Laba Bulan Ini' (Fase 12d)", dashBody.includes("Laba Bulan Ini"));

  // F1b — Fase 19b: perusahaan demo harus UNTUNG, bukan rugi.
  //
  // Ini bukan cek kosmetik. Perusahaan demo adalah yang dimasuki setiap calon
  // pelanggan lewat tombol "Lihat Demo", dan angkanya juga yang terpampang di
  // tangkapan layar halaman depan. Sebelum fase ini kartunya menampilkan
  // −Rp 42,2 jt karena gaji bulan lalu ikut terbukukan di bulan berjalan.
  //
  // Nilainya dibaca dari kartu yang DIRENDER lalu diurai jadi angka — bukan
  // sekadar memastikan tidak ada tanda minus di halaman, yang akan hijau
  // walaupun kartunya hilang sama sekali.
  const labaDemo = await page.evaluate(() => {
    const kartu = [...document.querySelectorAll("div")].find(
      (d) => d.children.length && d.textContent?.trim().startsWith("Laba Bulan Ini"),
    );
    if (!kartu) return null;
    const teks = kartu.innerText;
    // Minus bisa berada di DUA sisi "Rp" (Fase 51c).
    //
    // Pola lama hanya mengenali `-Rp 1.000`, sedangkan kartu ini merender
    // `Rp -226.150`. Akibatnya nilai negatif dibaca sebagai "tidak ketemu":
    // ceknya tetap merah — nilainya null, bukan > 0 — tetapi pesannya berbohong
    // tentang APA yang dilihat, dan penyelidik berikutnya mengira kartunya
    // rusak alih-alih melihat angka rugi yang sebenarnya tercetak di sana.
    // U+2212 ikut dikenali: itu yang dipakai sebagian pemformat angka.
    const m = teks.match(/([-\u2212]?)\s*Rp\s*([-\u2212]?)\s*([\d.]+)/);
    if (!m) return { teks, nilai: null };
    const negatif = Boolean(m[1]) || Boolean(m[2]);
    return { teks: m[0], nilai: Number(m[3].replace(/\./g, "")) * (negatif ? -1 : 1) };
  });
  /**
   * Ambang, bukan sekadar "di atas nol" (Fase 51c).
   *
   * Cek ini dulu berbunyi `nilai > 0`, dan itulah yang membuatnya bertahan
   * merah selama berbulan-bulan tanpa ketahuan: Fase 21d menyetel margin bulan
   * berjalan pas-pasan, fase-fase sesudahnya menambah beban, dan angkanya
   * merosot sampai −Rp 226.150 — terlihat HANYA pada 1–3 tiap bulan, karena di
   * tanggal lain masih positif tipis. CI hijau 27 hari sebulan.
   *
   * Ambangnya disetel jauh di bawah margin sehat bulan riwayat (Rp 3–6 juta)
   * tapi jauh di atas nol, sehingga pengikisan berikutnya memerah SELAGI masih
   * ada sisa — bukan setelah menembus nol dan hanya di hari tertentu.
   */
  // Dinaikkan di Fase 53a bersama omzet grosir bulan berjalan; tetap sama
  // dengan `AMBANG_LABA_BERJALAN` di verifikasi-demo.mjs, yang juga memikul
  // penjaga relatif agar angka tetap ini tidak perlu disetel keempat kalinya.
  const AMBANG_LABA_DEMO = 4_000_000;
  check(
    "F1b perusahaan demo menampilkan laba dengan margin sehat, bukan tipis atau rugi",
    Boolean(labaDemo && typeof labaDemo.nilai === "number" && labaDemo.nilai >= AMBANG_LABA_DEMO),
    `→ ${labaDemo ? `terbaca "${labaDemo.teks}" → ${labaDemo.nilai} (ambang ${AMBANG_LABA_DEMO})` : "kartu Laba Bulan Ini tidak ditemukan"}`,
  );
  // F36c — Fase 21e: pembanding bulan yang SAMA tahun lalu di kartu KPI.
  // Diperiksa dari elemen deltanya, bukan dari ada/tidaknya kata "tahun lalu"
  // di halaman — teks itu bisa muncul dari mana saja.
  const deltaYoY = await page.locator('[data-testid="delta-tahun-lalu"]').count();
  check(
    "F36c kartu KPI menampilkan delta vs tahun lalu (bukan hanya vs bulan lalu)",
    deltaYoY >= 1,
    `→ ${deltaYoY} elemen`,
  );

  // Widget ringkasan mingguan AI (Fase 12f): di CI tanpa binding harus tampil
  // fallback redup — bukan error state; di produksi berisi narasi ("Dibuat …").
  await page.getByText("Ringkasan mingguan AI").first().waitFor({ timeout: 15_000 });
  await page
    .getByText(/Fitur AI belum tersedia|Dibuat/)
    .first()
    .waitFor({ timeout: 15_000 });
  check("widget Ringkasan mingguan AI tampil dengan fallback/narasi (tanpa error)", true);

  // Multibahasa aplikasi (Fase 13e): toggle EN → menu sidebar + dashboard Inggris.
  resetErrors();
  await page.locator("aside").getByRole("button", { name: "EN", exact: true }).first().click();
  await page.waitForTimeout(300);
  const appEn = await page.innerText("body");
  check(
    "F0b toggle EN: menu sidebar & dashboard berbahasa Inggris",
    appEn.includes("Sales") && appEn.includes("Inventory") && appEn.includes("Profit This Month") && (appEn.includes("Good ") || appEn.includes("Overview of")),
    `→ EN aplikasi tidak lengkap`,
  );
  // Fase 16a: judul + pengantar HALAMAN MODUL ikut bahasa aktif (dulu selalu
  // Indonesia walau menu sidebar sudah Inggris).
  await gotoRoute("/app/master/produk", 700);
  const produkEn = await page.innerText("body");
  check(
    "F0c judul halaman modul ikut EN: Produk → 'Products' + pengantar Inggris",
    produkEn.includes("Products") && produkEn.includes("catalogue of goods") && !produkEn.includes("Katalog barang"),
    `→ judul/pengantar halaman modul belum Inggris`,
  );
  check(
    "F0d isi halaman Produk ikut EN: label kolom & tombol (Name/Selling price/Edit)",
    produkEn.includes("Name") && produkEn.includes("Selling price") && produkEn.includes("Edit") &&
      !produkEn.includes("Harga Jual"),
    `→ isi halaman Produk belum Inggris`,
  );
  // Fase 16m — pelunasan utang 16b. Rute diverifikasi ke main.tsx:
  // /app/master/produk dan /app/master/kontak. Judul kartu form + label
  // kotak centang selalu tampil untuk admin, jadi asersinya tak bergantung data.
  //
  // Fase 38j — formulir produk pindah ke Lembar, jadi label di DALAMNYA hanya
  // ada setelah lembarnya dibuka. Subjek asersi tidak berubah: ia tetap
  // menguji bahwa naskah formulir produk ikut berbahasa Inggris.
  await bukaLembar(page, "Add product");
  const produkFormEn = await page.innerText("body");
  const adaAddProduct =
    produkFormEn.includes("Add product") && produkFormEn.includes("Track serial numbers");
  const tanpaProdukSisaId =
    !produkFormEn.includes("Tambah produk") && !produkFormEn.includes("Lacak nomor seri");
  check(
    "F0o sisa teks halaman Produk ikut EN: judul form + label lacak seri, tanpa teks Indonesia",
    adaAddProduct && tanpaProdukSisaId,
    `→ form=${adaAddProduct} tanpaID=${tanpaProdukSisaId}`,
  );
  await gotoRoute("/app/master/kontak", 800);
  const kontakEn = await page.innerText("body");
  const adaAddContact = kontakEn.includes("Add contact");
  const tanpaKontakId =
    !kontakEn.includes("Tambah kontak") && !kontakEn.includes("bisa impor sekaligus dari CSV");
  check(
    "F0p sisa teks halaman Kontak ikut EN: judul form tambah kontak, tanpa teks Indonesia",
    adaAddContact && tanpaKontakId,
    `→ form=${adaAddContact} tanpaID=${tanpaKontakId}`,
  );
  await gotoRoute("/app/penjualan", 800);
  // Fase 38t: editor faktur pindah ke Lembar, jadi isinya baru ada di DOM
  // setelah lembarnya dibuka. Nama tombolnya ikut bahasa aktif — di blok ini
  // antarmuka sedang berbahasa Inggris.
  await bukaLembar(page, "Sales invoice — new");
  const jualEn = await page.innerText("body");
  // Judul kartu daftar & label kontak = teks terlihat; harga satuan hanya ada
  // sebagai PLACEHOLDER (atribut) sehingga tak terbaca innerText — dicek lewat
  // selektor tersendiri.
  const adaSalesList = jualEn.includes("Sales list");
  const adaCustomer = jualEn.includes("Customer");
  const tanpaDaftarPenjualan = !jualEn.includes("Daftar penjualan");
  const phUnitPrice = (await page.locator('input[placeholder="Unit price"]').count()) > 0;
  check(
    "F0e isi halaman Penjualan ikut EN: 'Sales list' + label Customer + placeholder Unit price",
    adaSalesList && adaCustomer && tanpaDaftarPenjualan && phUnitPrice,
    `→ salesList=${adaSalesList} customer=${adaCustomer} tanpaID=${tanpaDaftarPenjualan} placeholder=${phUnitPrice}`,
  );
  // Fase 16l — pelunasan utang 16c: teks yang dulu tertinggal berbahasa
  // Indonesia di halaman ini. Penanda negatifnya murni teks UI (bukan nama
  // produk/kontak), sesuai pelajaran Fase 16e.
  const adaAddItem = jualEn.includes("Add item") && jualEn.includes("Post invoice");
  const tanpaSisaId =
    !jualEn.includes("Tambah barang") &&
    !jualEn.includes("Posting faktur") &&
    !jualEn.includes("Dokumen yang Anda posting");
  check(
    "F0n sisa teks halaman Penjualan ikut EN: tombol baris & posting, tanpa teks Indonesia",
    adaAddItem && tanpaSisaId,
    `→ tombol=${adaAddItem} tanpaID=${tanpaSisaId}`,
  );
  // F1y — Fase 20g: panel picking multi-gudang baru muncul setelah produk
  // dipilih, jadi tidak terbaca dari innerText halaman kosong seperti cek di
  // atas. Layar baru wajib dwibahasa sejak awal (aturan Fase 19).
  await page.getByPlaceholder("Search product (SKU/name)…").first().fill("Kopi Arabika");
  // Ditunggu eksplisit, bukan lewat `waitForTimeout`: dengan jeda tetap,
  // pemilihan produknya kadang jadi kadang tidak. F1y tetap hijau tanpa produk
  // terpilih (panel pickingnya muncul tanpa itu), jadi kegagalannya menular
  // diam-diam ke cek lain yang benar-benar butuh produknya — dan itu terjadi.
  const opsiProduk = page.locator("div.absolute.z-30 button").first();
  await opsiProduk.waitFor({ state: "visible", timeout: 15_000 });
  await opsiProduk.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Pick from several warehouses" }).first().click();
  await page.waitForTimeout(400);
  const pickEn = await page.innerText("body");
  const adaPickEn =
    pickEn.includes("Add warehouse") &&
    pickEn.includes("The per-warehouse quantities must add up to the line quantity.");
  const tanpaPickId =
    !pickEn.includes("Tambah gudang") && !pickEn.includes("Jumlah qty per gudang");
  check(
    "F1y panel picking multi-gudang ikut EN: tombol + petunjuk jumlah, tanpa teks Indonesia",
    adaPickEn && tanpaPickId,
    `→ EN=${adaPickEn} tanpaID=${tanpaPickId}`,
  );
  // F34 — Fase 21c: pemilih satuan per baris. Produk demo "Kopi Arabika Gayo"
  // punya satuan besar (1 dus = 20 pcs), jadi barisnya wajib menawarkan pilihan
  // satuan. Diuji di sini karena produknya sudah terpilih oleh F1y di atas.
  const selSatuan = page.locator('[data-testid="satuan-baris-0"]');
  await selSatuan.waitFor({ state: "visible", timeout: 15_000 });
  const opsiSatuan = await selSatuan.locator("option").allInnerTexts();
  check(
    "F34a baris menawarkan satuan dasar & satuan besar produk (pcs + dus)",
    opsiSatuan.join("|") === "pcs|dus",
    `→ ${JSON.stringify(opsiSatuan)}`,
  );
  const hargaSebelumSatuan = await page.locator('input[placeholder="Unit price"]').first().inputValue();
  await selSatuan.selectOption("besar");
  await page.waitForTimeout(300);
  const teksKonversi = (await page.locator('[data-testid="konversi-baris-0"]').innerText()).trim();
  check(
    "F34b keterangan konversi menyebut jumlah satuan dasar yang benar (1 dus = 20 pcs)",
    teksKonversi === "1 dus = 20 pcs",
    `→ ${JSON.stringify(teksKonversi)}`,
  );
  // Harga terisi otomatis PER SATUAN DASAR. Kalau tidak ikut dikali isi saat
  // satuan diganti, faktur sedus akan ditagih seharga sepcs — totalnya masuk
  // akal di layar dan tidak ada satu angka pun yang terlihat aneh.
  // F34d — temuan pemeriksaan mata: pemilih satuan sempat menggencet kotak qty
  // di kolom yang sama sampai tinggal sesobek garis. Diukur dari lebar yang
  // BENAR-BENAR ter-render, bukan dari kelas Tailwind-nya: kelasnya bisa saja
  // betul sementara kolom gridnya yang kurang lebar.
  const lebarQty = (await page.locator('input[aria-label="Qty baris 1"]').first().boundingBox())?.width ?? 0;
  check(
    "F34d kotak qty tetap cukup lebar setelah pemilih satuan muncul (≥ 48px)",
    lebarQty >= 48,
    `→ ${Math.round(lebarQty)}px`,
  );
  const hargaSesudahSatuan = await page.locator('input[placeholder="Unit price"]').first().inputValue();
  check(
    "F34c harga ikut diskalakan saat satuan diganti (85.000/pcs → 1.700.000/dus)",
    hargaSebelumSatuan === "85000" && hargaSesudahSatuan === "1700000",
    `→ ${hargaSebelumSatuan} → ${hargaSesudahSatuan}`,
  );
  // F34e — temuan pemeriksaan mata Fase 21c: pilihan "— tanpa proyek —" masih
  // Indonesia di mode Inggris (halaman Penjualan/Pembelian & Keuangan). Isi
  // <option> bukan atribut dan bukan teks anak biasa, jadi penyapu tak melihatnya.
  const jualEn2 = await page.innerText("body");
  check(
    "F34e pilihan proyek kosong ikut EN ('— no project —'), tanpa sisa Indonesia",
    jualEn2.includes("— no project —") && !jualEn2.includes("— tanpa proyek —"),
    `→ EN=${jualEn2.includes("— no project —")} sisaID=${jualEn2.includes("— tanpa proyek —")}`,
  );
  await gotoRoute("/app/stok", 800);
  const stokEn = await page.innerText("body");
  const adaStockLevels = stokEn.includes("Stock levels per warehouse");
  const adaBalance = stokEn.includes("Balance") || stokEn.includes("Average cost");
  const tanpaLevelId = !stokEn.includes("Level stok per gudang");
  check(
    "F0f isi halaman Stok ikut EN: judul kartu + kolom, tanpa teks Indonesia",
    adaStockLevels && adaBalance && tanpaLevelId,
    `→ stockLevels=${adaStockLevels} balance=${adaBalance} tanpaID=${tanpaLevelId}`,
  );
  // F1z — Fase 20h: kartu Peramalan stok, termasuk lencana tren & keyakinan
  // yang isinya datang dari kode server (naik/turun, tinggi/sedang/rendah) —
  // kelas teks yang berkali-kali tertinggal berbahasa Indonesia di Fase 19.
  const adaRamalEn =
    stokEn.includes("Stock forecast") &&
    stokEn.includes("Confidence") &&
    stokEn.includes("Supplier lead time (days)");
  const tanpaRamalId =
    !stokEn.includes("Peramalan stok") &&
    !stokEn.includes("Keyakinan") &&
    !stokEn.includes("Rendah") &&
    !stokEn.includes("Naik");
  check(
    "F1z kartu Peramalan stok ikut EN termasuk lencana tren & keyakinan",
    adaRamalEn && tanpaRamalId,
    `→ EN=${adaRamalEn} tanpaID=${tanpaRamalId}`,
  );
  await gotoRoute("/app/keuangan/laba-rugi", 800);
  const lrEn = await page.innerText("body");
  const adaIncome = lrEn.includes("Income");
  const adaExpense = lrEn.includes("Expenses");
  // Penanda negatif HARUS teks murni UI. Kata "Pendapatan"/"Beban" muncul di
  // NAMA AKUN bagan akun ("Pendapatan Penjualan", "Beban Gaji") — itu data
  // pengguna yang memang tidak diterjemahkan, jadi tak bisa dipakai sebagai
  // bukti. Label toggle perbandingan periode hanya ada di antarmuka.
  const adaCompare = lrEn.includes("Compare with the previous period");
  const tanpaCompareId = !lrEn.includes("Bandingkan dengan periode sebelumnya");
  check(
    "F0g isi halaman Laba Rugi ikut EN: Income/Expenses + label toggle periode",
    adaIncome && adaExpense && adaCompare && tanpaCompareId,
    `→ income=${adaIncome} expenses=${adaExpense} compare=${adaCompare} tanpaID=${tanpaCompareId}`,
  );
  await gotoRoute("/app/keuangan/jurnal", 800);
  const jrnEn = await page.innerText("body");
  // Penanda negatif = teks murni UI. "Debit"/"Kredit" & nama akun juga muncul di
  // DATA (nama akun bagan akun), jadi dipakai judul kartu yang hanya ada di UI.
  const adaPosted = jrnEn.includes("Posted entries");
  const adaNewEntry = jrnEn.includes("New manual entry");
  const tanpaJurnalId = !jrnEn.includes("Jurnal terposting") && !jrnEn.includes("Jurnal manual baru");
  check(
    "F0h isi halaman Jurnal Umum ikut EN: judul kartu UI, tanpa teks Indonesia",
    adaPosted && adaNewEntry && tanpaJurnalId,
    `→ posted=${adaPosted} newEntry=${adaNewEntry} tanpaID=${tanpaJurnalId}`,
  );
  await gotoRoute("/app/pos", 900);
  const posEn = await page.innerText("body");
  // Penanda negatif = judul kartu murni UI (bukan "Tunai"/"Lunas" yang bisa
  // muncul sebagai status/metode pada data struk).
  // Layar Kasir punya DUA keadaan: shift tertutup (kartu "Buka shift") dan shift
  // terbuka (keranjang + Rekap + Struk & Refund). Asersi hanya boleh menuntut
  // teks yang benar-benar ter-render pada keadaan saat itu — menuntut kartu
  // Rekap saat shift tertutup adalah kesalahan asersi, bukan bukti bug.
  const shiftTertutup = posEn.includes("Open shift") || posEn.includes("Opening cash");
  const shiftTerbuka = posEn.includes("Cart") || posEn.includes("Today's summary");
  const adaPosEn = shiftTertutup || shiftTerbuka;
  const tanpaPosId =
    !posEn.includes("Buka shift") && !posEn.includes("Kas awal") && !posEn.includes("Rekap hari ini");
  check(
    "F0i isi halaman Kasir ikut EN (kedua keadaan shift), tanpa teks Indonesia",
    adaPosEn && tanpaPosId,
    `→ tertutup=${shiftTertutup} terbuka=${shiftTerbuka} tanpaID=${tanpaPosId}`,
  );
  await gotoRoute("/app/crm/leads", 800);
  const crmEn = await page.innerText("body");
  // Penanda positif wajib (pelajaran 16g) + penanda negatif dari teks murni UI.
  const adaActiveLeads = crmEn.includes("Active leads") || crmEn.includes("No leads yet");
  const adaSource = crmEn.includes("Source") || crmEn.includes("Conversion by source");
  const tanpaCrmId = !crmEn.includes("Lead aktif") && !crmEn.includes("Konversi per sumber");
  check(
    "F0j isi halaman CRM ikut EN: kartu lead + konversi sumber, tanpa teks Indonesia",
    adaActiveLeads && adaSource && tanpaCrmId,
    `→ leads=${adaActiveLeads} source=${adaSource} tanpaID=${tanpaCrmId}`,
  );
  // Rute diverifikasi ke main.tsx lebih dulu: /app/hr/penggajian (bukan /app/payroll).
  await gotoRoute("/app/hr/penggajian", 900);
  const hrEn = await page.innerText("body");
  // Halaman Penggajian BERTAB (Fase 10g) — hanya tab aktif yang ter-render.
  // Tab default = "Karyawan", jadi asersi hanya boleh menuntut isi tab itu;
  // menuntut kartu tab "Gaji" adalah kesalahan asersi, bukan bukti bug.
  const adaEmployees = hrEn.includes("Employees") || hrEn.includes("No employees yet");
  const adaEmpForm = hrEn.includes("Add employee") || hrEn.includes("Position");
  const tanpaHrId = !hrEn.includes("Tambah Karyawan") && !hrEn.includes("Gaji pokok");
  check(
    "F0k isi tab Karyawan (Penggajian) ikut EN, tanpa teks Indonesia",
    adaEmployees && adaEmpForm && tanpaHrId,
    `→ employees=${adaEmployees} form=${adaEmpForm} tanpaID=${tanpaHrId}`,
  );
  // Rute diverifikasi ke main.tsx: /app/proyek. Halaman daftar (bukan detail
  // bertab), jadi asersi menuntut isi daftar saja.
  await gotoRoute("/app/proyek", 800);
  const prjEn = await page.innerText("body");
  const adaProjectList = prjEn.includes("Project list") || prjEn.includes("No projects yet");
  const adaNewProject = prjEn.includes("New project") || prjEn.includes("Project name");
  const tanpaPrjId = !prjEn.includes("Daftar proyek") && !prjEn.includes("Proyek baru");
  check(
    "F0l isi halaman Proyek ikut EN: daftar + form proyek, tanpa teks Indonesia",
    adaProjectList && adaNewProject && tanpaPrjId,
    `→ list=${adaProjectList} form=${adaNewProject} tanpaID=${tanpaPrjId}`,
  );
  // Rute diverifikasi ke main.tsx: /app/keuangan/aset. Kartu ikhtisar + kartu
  // "Daftar aset" selalu tampil (tak bergantung ada/tidaknya data), jadi asersi
  // memakai penanda positif yang stabil di kedua keadaan.
  await gotoRoute("/app/keuangan/aset", 800);
  const asetEn = await page.innerText("body");
  const adaAssetKpi =
    asetEn.includes("Active assets") && asetEn.includes("Total book value");
  const adaAssetList = asetEn.includes("Asset list") || asetEn.includes("No assets yet");
  const tanpaAsetId =
    !asetEn.includes("Aset aktif") &&
    !asetEn.includes("Nilai buku total") &&
    !asetEn.includes("Daftarkan aset baru");
  check(
    "F0m isi halaman Aset Tetap ikut EN: kartu ikhtisar + daftar aset, tanpa teks Indonesia",
    adaAssetKpi && adaAssetList && tanpaAsetId,
    `→ kpi=${adaAssetKpi} daftar=${adaAssetList} tanpaID=${tanpaAsetId}`,
  );
  // Fase 16u — isi dasbor. Rute /app (layar pertama setelah masuk). Kartu
  // "Faktur lewat jatuh tempo" dan "Beban perlu diperiksa" selalu dirender
  // (widget bawaan aktif), sedangkan "Mulai dari sini" hanya untuk peran
  // owner — sesi ui-sim memang owner, tapi asersinya tetap dibuat longgar
  // dengan menerima salah satu penanda agar tidak rapuh terhadap peran.
  await gotoRoute("/app", 900);
  const dashEn = await page.innerText("body");
  const adaDashEn =
    dashEn.includes("Overdue invoices") || dashEn.includes("Expenses worth checking");
  const tanpaDashId =
    !dashEn.includes("Faktur lewat jatuh tempo") &&
    !dashEn.includes("Beban perlu diperiksa") &&
    !dashEn.includes("Alur kerja harian");
  check(
    "F0y isi dasbor ikut EN: kartu jatuh tempo / beban, tanpa teks Indonesia",
    adaDashEn && tanpaDashId,
    `→ kartu=${adaDashEn} tanpaID=${tanpaDashId}`,
  );
  // Fase 16t — peta label dari packages/shared. Rute diverifikasi ke main.tsx:
  // /app/keuangan/akun. Jenis akun berasal dari ACCOUNT_TYPE_LABELS di paket
  // bersama yang tetap berbahasa Indonesia; cek ini memastikan pemetaan sisi
  // web benar-benar terpasang. Penanda negatifnya memakai "Kewajiban" dan
  // "Ekuitas" — dua kata yang TIDAK muncul sebagai nama akun bawaan (pelajaran
  // Fase 16e: penanda negatif harus murni teks UI, bukan data pengguna).
  await gotoRoute("/app/keuangan/akun", 900);
  const akunEn = await page.innerText("body");
  const adaJenisEn = akunEn.includes("Liabilities") && akunEn.includes("Equity");
  const tanpaJenisId = !akunEn.includes("Kewajiban") && !akunEn.includes("Ekuitas");
  check(
    "F0x jenis akun ikut EN meski labelnya dari packages/shared",
    adaJenisEn && tanpaJenisId,
    `→ jenisEN=${adaJenisEn} tanpaID=${tanpaJenisId}`,
  );
  // Fase 16s — pelunasan utang 16h. Rute diverifikasi ke main.tsx:
  // /app/crm/leads (TIDAK ada /app/crm telanjang — pelajaran Fase 16h).
  // Tahap lead berasal dari LEAD_STAGE_LABELS di packages/shared yang tetap
  // berbahasa Indonesia; web memetakannya sendiri ke kamus, jadi cek ini
  // memastikan pemetaan itu benar-benar terpasang.
  await gotoRoute("/app/crm/leads", 900);
  const crmSisaEn = await page.innerText("body");
  const adaTahapEn = crmSisaEn.includes("Qualified") && crmSisaEn.includes("Contacted");
  const tanpaTahapId =
    !crmSisaEn.includes("Terkualifikasi") && !crmSisaEn.includes("Dihubungi");
  check(
    "F0w tahap lead CRM ikut EN meski labelnya dari packages/shared",
    adaTahapEn && tanpaTahapId,
    `→ tahapEN=${adaTahapEn} tanpaID=${tanpaTahapId}`,
  );
  // Fase 16r — pelunasan utang 16i. Rute diverifikasi ke main.tsx:
  // /app/hr/penggajian. Halaman BERTAB — hanya tab aktif yang dirender, jadi
  // asersinya terbatas pada tab bawaan (Karyawan) + pengumuman pajak yang
  // selalu tampil di atas tab (pelajaran Fase 16i).
  await gotoRoute("/app/hr/penggajian", 900);
  const gajiSisaEn = await page.innerText("body");
  const adaGajiSisaEn =
    gajiSisaEn.includes("rates follow the 2024 rules") && gajiSisaEn.includes("active of");
  const tanpaGajiSisaId =
    !gajiSisaEn.includes("mengikuti ketentuan 2024") && !gajiSisaEn.includes("aktif dari");
  check(
    "F0v sisa teks Penggajian ikut EN: catatan pajak & ringkasan karyawan, tanpa teks Indonesia",
    adaGajiSisaEn && tanpaGajiSisaId,
    `→ catatan=${adaGajiSisaEn} tanpaID=${tanpaGajiSisaId}`,
  );
  // Fase 16q — pelunasan utang 16d. Rute diverifikasi ke main.tsx: /app/stok.
  // Kartu transfer & level stok selalu tampil untuk admin.
  await gotoRoute("/app/stok", 900);
  const stokSisaEn = await page.innerText("body");
  const adaStokSisaEn =
    stokSisaEn.includes("Inventory value moves at average cost") ||
    stokSisaEn.includes("moving average cost method");
  const tanpaStokSisaId =
    !stokSisaEn.includes("Nilai persediaan berpindah") &&
    !stokSisaEn.includes("biaya rata-rata bergerak") &&
    !stokSisaEn.includes("Total nilai persediaan");
  check(
    "F0u sisa teks Stok ikut EN: penjelasan transfer & metode biaya, tanpa teks Indonesia",
    adaStokSisaEn && tanpaStokSisaId,
    `→ penjelasan=${adaStokSisaEn} tanpaID=${tanpaStokSisaId}`,
  );

  // F24 — Fase 17g. Halaman Stok kini memakai komponen `Table`, dan `Td numeric`
  // menempelkan utilitas `num` (mono + tabular-nums) dari 17a. Yang diperiksa di
  // sini adalah HASIL RENDER-nya, bukan sekadar kelasnya menempel: utilitas itu
  // bisa saja ada di DOM tetapi kalah oleh aturan CSS lain — persis jebakan yang
  // menyembunyikan bug penimpaan kelas selama belasan fase (lihat Fase 17b).
  const selNumerik = await page.evaluate(() => {
    const td = document.querySelector("td.num");
    if (!td) return null;
    const cs = getComputedStyle(td);
    return { font: cs.fontFamily, angka: cs.fontVariantNumeric, align: cs.textAlign };
  });
  check(
    "F24 kolom angka Stok benar-benar ter-render mono + tabular-nums",
    Boolean(
      selNumerik &&
        /mono/i.test(selNumerik.font) &&
        selNumerik.angka.includes("tabular-nums") &&
        selNumerik.align === "right",
    ),
    `→ ${selNumerik ? `font=${selNumerik.font.slice(0, 40)} nums=${selNumerik.angka} align=${selNumerik.align}` : "tidak ada td.num"}`,
  );

  // F30 — Fase 18b. Penjaga permanen atas pelajaran termahal Fase 17d:
  // `text-transform: uppercase` ikut mengubah nilai `innerText`, sehingga judul
  // kolom yang dibaca asersi terbaca huruf besar semua dan asersinya gagal —
  // padahal kodenya terlihat benar dan hanya CSS yang berubah. Aturannya kini
  // tertulis di komponen `Thead`; cek ini yang menjaganya tetap begitu.
  //
  // F31 — bukti bahwa pelonggaran 18b benar-benar sampai ke DOM. Memeriksa
  // KELAS saja tidak cukup: sampai Fase 17b, 96 dari 98 penimpaan tinggi tombol
  // ada di DOM tetapi kalah oleh urutan CSS. Yang diukur di sini tinggi nyata.
  const gaya = await page.evaluate(() => {
    const th = document.querySelector("thead th");
    const btn = document.querySelector("button.h-9");
    return {
      transform: th ? getComputedStyle(th).textTransform : null,
      tinggiTombol: btn ? Math.round(btn.getBoundingClientRect().height) : null,
    };
  });
  check(
    "F30 kepala tabel tidak memakai text-transform (penjaga innerText, pelajaran 17d)",
    gaya.transform === "none",
    `→ text-transform=${gaya.transform ?? "tidak ada <th>"}`,
  );
  check(
    "F31 tombol bawaan ter-render setinggi 36px (h-9 lapang, bukan h-8 padat)",
    gaya.tinggiTombol === 36,
    `→ ${gaya.tinggiTombol ?? "tidak ada tombol h-9"}px`,
  );
  // Fase 16p — pelunasan utang 16j. Rute diverifikasi ke main.tsx: /app/proyek.
  // Tombol buat proyek selalu tampil untuk admin; lencana status hanya muncul
  // bila ada proyek, jadi asersinya hanya menuntut tombolnya.
  //
  // Fase 38i — penandanya berpindah dari "Create project" ke "New project".
  // Subjek asersi TIDAK berubah (halaman Proyek ikut berbahasa Inggris); yang
  // berubah adalah tombol mana yang tampil di halaman, karena formulir
  // pembuatan beserta tombol "Buat proyek"-nya kini berada di dalam Lembar dan
  // baru terpasang saat dibuka. Yang tampil di halaman adalah aksi utamanya.
  await gotoRoute("/app/proyek", 800);
  const prjSisaEn = await page.innerText("body");
  const adaProyekSisaEn = prjSisaEn.includes("New project");
  const tanpaProyekSisaId =
    !prjSisaEn.includes("Proyek baru") && !prjSisaEn.includes("Seret kartu untuk memindahkan");
  check(
    "F0t sisa teks Proyek ikut EN: tombol buat proyek, tanpa teks Indonesia",
    adaProyekSisaEn && tanpaProyekSisaId,
    `→ tombol=${adaProyekSisaEn} tanpaID=${tanpaProyekSisaId}`,
  );
  // Fase 16o — pelunasan utang 16f. Rute diverifikasi ke main.tsx:
  // /app/keuangan/jurnal. Form jurnal manual selalu tampil untuk admin, jadi
  // penanda positifnya tak bergantung ada/tidaknya jurnal tersimpan.
  //
  // Fase 38k — form itu kini berada di dalam Lembar, jadi tombolnya baru ada
  // setelah lembarnya dibuka. Subjek asersi tidak berubah: ia tetap menguji
  // naskah form jurnal manual ikut berbahasa Inggris.
  await gotoRoute("/app/keuangan/jurnal", 900);
  await bukaLembar(page, "New manual entry");
  const jrSisaEn = await page.innerText("body");
  const adaJurnalSisaEn = jrSisaEn.includes("Post entry") && jrSisaEn.includes("Add line");
  const tanpaJurnalSisaId =
    !jrSisaEn.includes("Posting jurnal") &&
    !jrSisaEn.includes("Tambah baris") &&
    !jrSisaEn.includes("belum seimbang");
  check(
    "F0s sisa teks Jurnal Umum ikut EN: tombol posting & tambah baris, tanpa teks Indonesia",
    adaJurnalSisaEn && tanpaJurnalSisaId,
    `→ tombol=${adaJurnalSisaEn} tanpaID=${tanpaJurnalSisaId}`,
  );
  // F1c — Fase 19c: halaman Kas & Bank, halaman pertama program i18n yang
  // dilanjutkan setelah perombakan desain. Rute diverifikasi ke main.tsx:
  // /app/keuangan/kas-bank.
  //
  // Penanda positifnya judul kartu rekonsiliasi + keterangan kartu mutasi.
  // Sempat memakai judul kolom "Bank description", dan itu SALAH: kolom itu
  // hanya dirender bila ada baris rekening koran terimpor, sementara akun yang
  // terpilih pertama adalah Kas yang tidak punya. Penanda harus sesuatu yang
  // dirender tanpa syarat data.
  //
  // Penanda negatifnya sengaja memakai teks UI MURNI ("Rekonsiliasi rekening
  // koran", "Keterangan bank"), bukan kata seperti "Saldo" atau "Bank" yang
  // juga muncul sebagai NAMA AKUN dari data pengguna — pelajaran Fase 16e:
  // penanda negatif yang menyentuh data akan gagal karena datanya, bukan karena
  // terjemahannya.
  await gotoRoute("/app/keuangan/kas-bank", 900);
  // Ditunggu eksplisit, bukan mengandalkan jeda tetap: Fase 22c menambah satu
  // query lagi ke halaman ini (kas kecil), dan sejak itu 900 ms kadang habis
  // sebelum kartu rekonsiliasi ter-render. Ceknya jadi merah karena LAMBAT,
  // bukan karena terjemahannya — kegagalan yang paling membingungkan untuk
  // ditelusuri orang berikutnya.
  await page.getByText("Bank statement reconciliation").first().waitFor({ timeout: 15_000 });
  const kbEn = await page.innerText("body");
  const adaKbEn =
    kbEn.includes("Bank statement reconciliation") &&
    kbEn.includes("In and out history with a running balance");
  const tanpaKbId =
    !kbEn.includes("Rekonsiliasi rekening koran") && !kbEn.includes("Riwayat keluar-masuk");
  check(
    "F1c isi halaman Kas & Bank ikut EN: rekonsiliasi + kolom mutasi, tanpa teks Indonesia",
    adaKbEn && tanpaKbId,
    `→ EN=${adaKbEn} tanpaID=${tanpaKbId}`,
  );

  // F1d — Fase 19d: halaman Catat Transaksi. Rute diverifikasi ke main.tsx:
  // /app/keuangan/catat.
  //
  // Penandanya dipilih dari yang dirender TANPA SYARAT: ketiga tombol mode dan
  // judul kartu penjelasan selalu ada, tidak bergantung akun, kategori, atau
  // peran. (Pelajaran F1c: penanda yang hanya muncul saat ada data akan merah
  // walaupun terjemahannya benar.)
  await gotoRoute("/app/keuangan/catat", 900);
  const ctEn = await page.innerText("body");
  const adaCtEn =
    ctEn.includes("Money In") && ctEn.includes("Money Out") && ctEn.includes("How is this booked?");
  const tanpaCtId =
    !ctEn.includes("Uang Masuk") && !ctEn.includes("Bagaimana ini dibukukan?");
  check(
    "F1d isi halaman Catat Transaksi ikut EN: tombol mode + kartu penjelasan, tanpa teks Indonesia",
    adaCtEn && tanpaCtId,
    `→ EN=${adaCtEn} tanpaID=${tanpaCtId}`,
  );

  // F1e — Fase 19e: halaman Pajak. Rute diverifikasi ke main.tsx:
  // /app/keuangan/pajak. Tab bawaan "PPh Final" langsung terbuka.
  //
  // Penandanya judul tab + judul kartu setoran — keduanya dirender tanpa syarat
  // data. Penanda negatifnya memakai kalimat panjang ("Setor PPh Final masa"),
  // BUKAN kata "Pajak"/"Masa" yang tetap muncul dalam bahasa Inggris sekalipun
  // karena "PPh" dan "SPT Masa PPN" memang nama resmi yang tidak diterjemahkan.
  await gotoRoute("/app/keuangan/pajak", 900);
  const pjEn = await page.innerText("body");
  const adaPjEn =
    pjEn.includes("Pay PPh Final for a period") && pjEn.includes("PPh Final payment history");
  const tanpaPjId =
    !pjEn.includes("Setor PPh Final masa") && !pjEn.includes("Riwayat setoran PPh Final");
  check(
    "F1e isi halaman Pajak ikut EN: kartu setoran + riwayat, tanpa teks Indonesia",
    adaPjEn && tanpaPjId,
    `→ EN=${adaPjEn} tanpaID=${tanpaPjId}`,
  );
  // F43f — Fase 22e: tab kalender pajak juga wajib dwibahasa. Diperiksa di sini
  // (mode EN) karena blok F43 di bawah berjalan di mode Indonesia.
  await page.getByRole("button", { name: "Tax calendar" }).click();
  await page.waitForTimeout(700);
  const kpEn = await page.innerText("body");
  const adaKpEn = kpEn.includes("Company tax profile") && kpEn.includes("Filing and payment deadlines");
  const tanpaKpId = !kpEn.includes("Profil pajak perusahaan") && !kpEn.includes("Tenggat lapor & setor");
  check(
    "F43f tab kalender pajak ikut EN: profil + tenggat, tanpa teks Indonesia",
    adaKpEn && tanpaKpId,
    `→ EN=${adaKpEn} tanpaID=${tanpaKpId}`,
  );

  // F1f — Fase 19f: halaman Pengadaan. Rute diverifikasi ke audit-routes.mjs:
  // /app/pengadaan. Ketiga judul kartu tahapan (PR → PO → GRN) selalu dirender,
  // tidak bergantung data maupun peran.
  await gotoRoute("/app/pengadaan", 900);
  const pgEn = await page.innerText("body");
  const adaPgEn =
    pgEn.includes("1. Purchase requisition (PR)") && pgEn.includes("3. Goods receipt (GRN)");
  const tanpaPgId =
    !pgEn.includes("1. Permintaan pembelian (PR)") && !pgEn.includes("3. Penerimaan barang (GRN)");
  check(
    "F1f isi halaman Pengadaan ikut EN: kartu PR/PO/GRN, tanpa teks Indonesia",
    adaPgEn && tanpaPgId,
    `→ EN=${adaPgEn} tanpaID=${tanpaPgId}`,
  );

  // F1g — Fase 19g: halaman Pesanan Penjualan. Rute: /app/pesanan-penjualan.
  //
  // Penandanya judul + pengantar halaman (kini dari PAGE_HEADINGS) dan judul
  // kartu daftar — ketiganya dirender tanpa syarat data maupun peran.
  await gotoRoute("/app/pesanan-penjualan", 900);
  const soEn = await page.innerText("body");
  const adaSoEn = soEn.includes("Sales Orders") && soEn.includes("Order list");
  const tanpaSoId =
    !soEn.includes("Alur bertahap: pesanan") && !soEn.includes("Daftar pesanan");
  check(
    "F1g isi halaman Pesanan Penjualan ikut EN: judul + daftar pesanan, tanpa teks Indonesia",
    adaSoEn && tanpaSoId,
    `→ EN=${adaSoEn} tanpaID=${tanpaSoId}`,
  );

  // F1h — Fase 19h: Manufaktur & Pemeliharaan. Dua rute diperiksa dalam satu
  // cek karena keduanya sub-fase yang sama.
  //
  // Penandanya judul kartu yang dirender tanpa syarat data: kartu BoM dan
  // routing di Manufaktur, kartu jadwal servis di Pemeliharaan.
  //
  // Rute diverifikasi ke audit-routes.mjs: /app/manufaktur dan /app/maintenance
  // (BUKAN /app/aset/pemeliharaan — sempat saya tebak dari nama menunya).
  await gotoRoute("/app/manufaktur", 900);
  const mfEn = await page.innerText("body");
  // F37 — Fase 21f: isian biaya konversi + keterangannya. Yang diperiksa bukan
  // sekadar "ada kotak isian", melainkan bahwa layarnya MENJELASKAN dua hal
  // yang paling mudah disalahpahami: angkanya sebatch (bukan per unit), dan
  // upah/listriknya tidak akan terhitung dua kali.
  const adaIsianKonversi =
    (await page.locator("#ord-tenaga").count()) === 1 && (await page.locator("#ord-overhead").count()) === 1;
  check("F37a isian upah & overhead tersedia di form perintah produksi", adaIsianKonversi, `→ ${adaIsianKonversi}`);
  const hintKonversi = await page.locator('[data-testid="hint-biaya-konversi"]').innerText();
  check(
    "F37b keterangan menyebut 'per production order' & 'not counted twice' (EN)",
    /per production order/i.test(hintKonversi) && /not counted twice/i.test(hintKonversi),
    `→ ${hintKonversi.slice(0, 70)}`,
  );
  // F37c — temuan pemeriksaan mata Fase 21f: label MEDAN & sel tabel di halaman
  // ini masih Indonesia di mode Inggris. `F1h` di atas hanya memeriksa JUDUL
  // kartu, jadi kebocoran setingkat medan lolos tanpa terlihat.
  const adaMedanEn =
    mfEn.includes("Rate/hour") && mfEn.includes("Production order") && mfEn.includes("Action");
  const tanpaMedanId =
    !mfEn.includes("Tarif/jam") && !mfEn.includes("Perintah produksi") && !/\bAksi\b/.test(mfEn);
  check(
    "F37c label medan & tabel Manufaktur ikut EN (bukan hanya judul kartunya)",
    adaMedanEn && tanpaMedanId,
    `→ EN=${adaMedanEn} tanpaID=${tanpaMedanId}`,
  );
  await gotoRoute("/app/maintenance", 900);
  const mtEn = await page.innerText("body");
  const adaMfEn =
    mfEn.includes("Bill of materials (BoM)") && mfEn.includes("Production routing");
  const tanpaMfId =
    !mfEn.includes("Resep produk (BoM)") && !mfEn.includes("Routing produksi");
  const adaMtEn = mtEn.includes("Service work orders are raised automatically");
  const tanpaMtId = !mtEn.includes("Servis otomatis diterbitkan");
  check(
    "F1h isi Manufaktur & Pemeliharaan ikut EN: kartu BoM/routing/jadwal, tanpa teks Indonesia",
    adaMfEn && tanpaMfId && adaMtEn && tanpaMtId,
    `→ manufaktur EN=${adaMfEn}/tanpaID=${tanpaMfId} pemeliharaan EN=${adaMtEn}/tanpaID=${tanpaMtId}`,
  );

  // F1i — Fase 19i: halaman Persetujuan.
  // Rute diverifikasi ke audit-routes.mjs: /app/persetujuan.
  //
  // Penandanya judul halaman (kini dari PAGE_HEADINGS) + label tab, yang
  // dirender tanpa syarat data. Tab "Aturan"/"Pembelian (ambang)" sengaja TIDAK
  // dipakai: keduanya hanya tampil untuk peran owner, dan asersi yang
  // bergantung peran akan rapuh bila alur uji berubah (pelajaran F0y).
  await gotoRoute("/app/persetujuan", 900);
  const apEn = await page.innerText("body");
  const adaApEn = apEn.includes("Approvals") && apEn.includes("My queue");
  const tanpaApId =
    !apEn.includes("Alur persetujuan berjenjang") && !apEn.includes("Antrean saya");
  check(
    "F1i isi halaman Persetujuan ikut EN: judul + tab antrean, tanpa teks Indonesia",
    adaApEn && tanpaApId,
    `→ EN=${adaApEn} tanpaID=${tanpaApId}`,
  );

  // F1j — Fase 19j: Kontrak Berulang & Helpdesk.
  // Rute diverifikasi ke audit-routes.mjs: /app/kontrak dan /app/helpdesk.
  await gotoRoute("/app/kontrak", 900);
  const ktEn = await page.innerText("body");
  await gotoRoute("/app/helpdesk", 900);
  const hdEn = await page.innerText("body");
  const adaKtEn = ktEn.includes("Contract list") && ktEn.includes("Invoices are issued automatically");
  const tanpaKtId = !ktEn.includes("Daftar kontrak") && !ktEn.includes("Faktur diterbitkan otomatis");
  const adaHdEn = hdEn.includes("Ticket list");
  const tanpaHdId = !hdEn.includes("Daftar tiket");
  check(
    "F1j isi Kontrak & Helpdesk ikut EN: daftar kontrak + daftar tiket, tanpa teks Indonesia",
    adaKtEn && tanpaKtId && adaHdEn && tanpaHdId,
    `→ kontrak EN=${adaKtEn}/tanpaID=${tanpaKtId} helpdesk EN=${adaHdEn}/tanpaID=${tanpaHdId}`,
  );

  // F1k — Fase 19k: halaman Absensi.
  // Rute diverifikasi ke audit-routes.mjs: /app/hr/absensi.
  await gotoRoute("/app/hr/absensi", 900);
  const abEn = await page.innerText("body");
  const adaAbEn = abEn.includes("Attendance") && abEn.includes("Monthly recap");
  const tanpaAbId =
    !abEn.includes("Catat kehadiran harian karyawan") && !abEn.includes("Rekap bulanan");
  check(
    "F1k isi halaman Absensi ikut EN: judul + rekap bulanan, tanpa teks Indonesia",
    adaAbEn && tanpaAbId,
    `→ EN=${adaAbEn} tanpaID=${tanpaAbId}`,
  );

  // F1l — Fase 19l: Dimensi & Anggaran.
  // Rute diverifikasi ke audit-routes.mjs: /app/keuangan/dimensi dan
  // /app/keuangan/anggaran.
  await gotoRoute("/app/keuangan/dimensi", 900);
  const dmEn = await page.innerText("body");
  await gotoRoute("/app/keuangan/anggaran", 900);
  const agEn = await page.innerText("body");
  const adaDmEn = dmEn.includes("Profit & loss per dimension");
  const tanpaDmId = !dmEn.includes("Laba-rugi per dimensi");
  const adaAgEn = agEn.includes("Budget vs actual");
  const tanpaAgId = !agEn.includes("Anggaran vs realisasi");
  check(
    "F1l isi Dimensi & Anggaran ikut EN: laba-rugi dimensi + anggaran, tanpa teks Indonesia",
    adaDmEn && tanpaDmId && adaAgEn && tanpaAgId,
    `→ dimensi EN=${adaDmEn}/tanpaID=${tanpaDmId} anggaran EN=${adaAgEn}/tanpaID=${tanpaAgId}`,
  );

  // F1m — Fase 19m: Mata Uang, Marketplace, Konsolidasi.
  // Rute diverifikasi ke audit-routes.mjs.
  await gotoRoute("/app/keuangan/kurs", 900);
  const kuEn = await page.innerText("body");
  await gotoRoute("/app/marketplace", 900);
  const mpEn = await page.innerText("body");
  await gotoRoute("/app/konsolidasi", 900);
  const koEn = await page.innerText("body");
  const adaEn =
    kuEn.includes("Currency list") &&
    mpEn.includes("Pick a channel, warehouse, and customer") &&
    koEn.includes("A combined report across every company");
  const tanpaId =
    !kuEn.includes("Daftar mata uang") &&
    !mpEn.includes("Pilih kanal, gudang, dan pelanggan") &&
    !koEn.includes("Laporan gabungan seluruh perusahaan");
  check(
    "F1m isi Mata Uang/Marketplace/Konsolidasi ikut EN, tanpa teks Indonesia",
    adaEn && tanpaId,
    `→ EN=${adaEn} tanpaID=${tanpaId}`,
  );

  // F1n — Fase 19n: wizard "Mulai".
  // Rute diverifikasi ke main.tsx: /app/mulai. Penandanya label langkah +
  // kartu pilihan pengalaman, yang dirender tanpa syarat data.
  await gotoRoute("/app/mulai", 900);
  const mlEn = await page.innerText("body");
  const adaMlEn = mlEn.includes("Experience") && mlEn.includes("Skip everything");
  const tanpaMlId =
    !mlEn.includes("Lewati semua dan langsung") && !mlEn.includes("Pengalaman");
  check(
    "F1n isi wizard Mulai ikut EN: label langkah + lewati, tanpa teks Indonesia",
    adaMlEn && tanpaMlId,
    `→ EN=${adaMlEn} tanpaID=${tanpaMlId}`,
  );

  // F1o — Fase 19o: halaman Migrasi (saldo awal).
  // Rute diverifikasi ke audit-routes.mjs: /app/migrasi.
  //
  // Penandanya kalimat yang tampil pada KEDUA keadaan halaman: perusahaan demo
  // sudah punya jurnal terposting, jadi yang dirender adalah peringatan buku
  // terkunci — bukan formulir impor. Memakai penanda formulir akan merah
  // walaupun terjemahannya benar (pelajaran F1c).
  await gotoRoute("/app/migrasi", 900);
  const mgEn = await page.innerText("body");
  const adaMgEn = mgEn.includes("The books already contain");
  const tanpaMgId = !mgEn.includes("Buku sudah berisi");
  check(
    "F1o isi halaman Migrasi ikut EN: peringatan buku terkunci, tanpa teks Indonesia",
    adaMgEn && tanpaMgId,
    `→ EN=${adaMgEn} tanpaID=${tanpaMgId}`,
  );

  // F1p — Fase 19p: halaman Alat bantu bisnis. Rute diverifikasi ke main.tsx:
  // /app/alat.
  //
  // Penandanya diambil dari DUA lapis yang selalu terlihat: bilah tab (selalu
  // dirender) dan isi tab "HPP per unit" yang aktif secara bawaan. Kalkulator
  // ini murni klien — tidak bergantung data tenant, jadi penandanya stabil.
  await gotoRoute("/app/alat", 900);
  const alEn = await page.innerText("body");
  const adaAlEn =
    alEn.includes("Break-even (BEP)") &&
    alEn.includes("Suggested selling price") &&
    alEn.includes("Material cost / unit");
  const tanpaAlId =
    !alEn.includes("Titik Impas (BEP)") &&
    !alEn.includes("Harga jual disarankan") &&
    !alEn.includes("Biaya bahan / unit");
  check(
    "F1p isi halaman Alat ikut EN: bilah tab + kalkulator HPP, tanpa teks Indonesia",
    adaAlEn && tanpaAlId,
    `→ EN=${adaAlEn} tanpaID=${tanpaAlId}`,
  );

  // F1s — Fase 19r: Dukungan & dashboard admin platform.
  // Rute diverifikasi ke main.tsx: /app/dukungan dan /app/admin.
  //
  // Fase 30f: akun simulasi KINI admin platform (lihat PLATFORM_ADMIN_EMAILS di
  // spawn wrangler), jadi penandanya bukan lagi pesan penolakan melainkan ISI
  // dasbornya. Ini pengetatan, bukan pelonggaran: sebelumnya satu-satunya
  // keadaan yang pernah dilihat peramban adalah layar penolakan, sehingga
  // terjemahan seluruh dasbor admin tidak pernah diuji sama sekali.
  await gotoRoute("/app/dukungan", 900);
  const dkEn = await page.innerText("body");
  await gotoRoute("/app/admin", 900);
  const adEn = await page.innerText("body");
  const adaDkEn =
    dkEn.includes("Send feedback") &&
    dkEn.includes("My feedback") &&
    // Lencana kategori datang dari peta label `shared` yang tetap Indonesia;
    // sisi web memetakannya sendiri. Tanpa penanda ini kebocoran itu tak
    // terukur — persis jenis kebocoran yang lolos sapuan teks.
    dkEn.includes("Feature suggestion") &&
    adEn.includes("Business metrics") &&
    adEn.includes("Total companies");
  const tanpaDkId =
    !dkEn.includes("Kirim masukan") &&
    !dkEn.includes("Masukan saya") &&
    !dkEn.includes("Saran fitur") &&
    !adEn.includes("Metrik bisnis") &&
    !adEn.includes("Total perusahaan");
  check(
    "F1s isi Dukungan & Admin ikut EN: kartu masukan + label kategori, tanpa teks Indonesia",
    adaDkEn && tanpaDkId,
    `→ EN=${adaDkEn} tanpaID=${tanpaDkId}`,
  );

  // F30f — dasbor admin platform benar-benar dirender di peramban.
  //
  // Sebelum fase ini SATU-SATUNYA keadaan halaman ini yang pernah dilihat
  // ui-sim adalah layar penolakan, sehingga metrik bisnis, kartu kuota, dan
  // tabel tenant tidak punya cakupan peramban sama sekali — permukaan yang
  // justru dipakai pemilik untuk menjalankan usahanya.
  await gotoRoute("/app/admin", 900);
  const adminTeks = await page.innerText("body");
  check(
    "F30f dasbor admin merender kartu metrik bisnis (MRR)",
    /Recurring revenue|Pendapatan berulang/.test(adminTeks),
    `→ kartu MRR tidak ditemukan`,
  );
  check(
    "F30f MRR tampil sebagai rupiah, bukan NaN/undefined",
    /Rp\s?[\d.]+/.test(adminTeks) && !/NaN|undefined/.test(adminTeks),
    `→ ${(adminTeks.match(/NaN|undefined/) ?? [""])[0]}`,
  );
  check(
    "F30f kartu kuota menjelaskan dirinya saat monitor belum aktif (degradasi anggun)",
    /CLOUDFLARE_API_TOKEN/.test(adminTeks),
    `→ pesan kuota tidak ditemukan`,
  );
  check("F30f dasbor admin bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);
  resetErrors();

  // F1v — Fase 20d: tab PPh Unifikasi di halaman Pajak.
  // Rute diverifikasi ke audit-routes.mjs: /app/keuangan/pajak.
  //
  // Penandanya diambil dari kartu yang dirender TANPA SYARAT DATA (judul +
  // pengantar). Memakai angka rekapnya akan rapuh: perusahaan demo belum tentu
  // punya PPh pada masa berjalan, dan cek yang bergantung data semacam itu
  // merah karena alasan yang salah (pelajaran F1c/F1o).
  await gotoRoute("/app/keuangan/pajak", 900);
  await page.getByRole("button", { name: "Unified WHT", exact: true }).first().click();
  await page.waitForTimeout(500);
  const pphEn = await page.innerText("body");
  const adaPphEn =
    pphEn.includes("Withholding tax recap per period") &&
    pphEn.includes("PPh 21 from payroll");
  const tanpaPphId =
    !pphEn.includes("Rekap PPh per masa") && !pphEn.includes("PPh 21 dari penggajian");
  check(
    "F1v tab PPh Unifikasi ikut EN: judul + pengantar rekap, tanpa teks Indonesia",
    adaPphEn && tanpaPphId,
    `→ EN=${adaPphEn} tanpaID=${tanpaPphId}`,
  );

  // F1w — Fase 20e: panel revaluasi aset.
  //
  // Panelnya baru terlihat SETELAH tombol "Revalue" ditekan, jadi ia tak
  // pernah tersentuh sapuan innerText halaman mana pun — kelas yang sama
  // dengan panel Asisten AI (F1u). Penandanya keterangan metodenya, yang
  // dirender tanpa syarat data begitu panel terbuka.
  await gotoRoute("/app/keuangan/aset", 900);
  const tombolReval = page.getByRole("button", { name: "Revalue", exact: true });
  const adaTombolReval = (await tombolReval.count()) > 0;
  if (adaTombolReval) {
    await tombolReval.first().click();
    await page.waitForTimeout(400);
  }
  const rvEn = await page.innerText("body");
  const adaRvEn =
    adaTombolReval &&
    rvEn.includes("Fair value (appraised)") &&
    rvEn.includes("Revaluation Surplus (equity)");
  const tanpaRvId =
    !rvEn.includes("Nilai wajar (hasil penilaian)") && !rvEn.includes("Surplus Revaluasi (ekuitas)");
  check(
    "F1w panel revaluasi aset ikut EN: nilai wajar + keterangan metode, tanpa teks Indonesia",
    adaRvEn && tanpaRvId,
    `→ tombol=${adaTombolReval} EN=${adaRvEn} tanpaID=${tanpaRvId}`,
  );

  // F1x — Fase 20f: penanda akun antar-perusahaan di Bagan Akun.
  // Rute diverifikasi ke audit-routes.mjs: /app/keuangan/akun.
  await gotoRoute("/app/keuangan/akun", 900);
  const koaEn = await page.innerText("body");
  const adaKoaEn = koaEn.includes("Mark intercompany");
  const tanpaKoaId = !koaEn.includes("Tandai antar-perusahaan");
  check(
    "F1x tombol penanda antar-perusahaan ikut EN, tanpa teks Indonesia",
    adaKoaEn && tanpaKoaId,
    `→ EN=${adaKoaEn} tanpaID=${tanpaKoaId}`,
  );

  // F1t — Fase 19s: kerangka aplikasi (topbar/spanduk) + panel Asisten AI.
  //
  // Kerangka muncul di SETIAP halaman, jadi satu kalimat yang tertinggal
  // terlihat di seluruh aplikasi sekaligus — justru bagian yang paling lama
  // luput karena sapuan teks melaporkan `app.tsx` penuh positif palsu.
  // Penandanya dipilih dari yang pasti dirender untuk akun simulasi: tombol
  // keluar dan spanduk "email belum diverifikasi" (akun ini memang belum
  // terverifikasi — terlihat di tiap tangkapan layar Fase 19).
  await gotoRoute("/app", 900);
  const shEn = await page.innerText("body");
  const adaShEn =
    shEn.includes("Sign out") && shEn.includes("Your email is not verified yet");
  const tanpaShId =
    !shEn.includes("Email Anda belum diverifikasi") && !shEn.includes("Masa uji coba");
  check(
    "F1t kerangka aplikasi ikut EN: tombol keluar + spanduk verifikasi, tanpa teks Indonesia",
    adaShEn && tanpaShId,
    `→ EN=${adaShEn} tanpaID=${tanpaShId}`,
  );

  // Panel Asisten AI: hanya terlihat setelah tombol mengambangnya ditekan,
  // jadi tak pernah tersentuh sapuan innerText halaman mana pun.
  await page.getByRole("button", { name: "Open the ERPindo Assistant" }).first().click();
  await page.waitForTimeout(500);
  const aiEn = await page.innerText("body");
  const adaAiEn = aiEn.includes("Ask how to use ERPindo") && aiEn.includes("ERPindo Assistant");
  const tanpaAiId = !aiEn.includes("Tanyakan cara memakai ERPindo");
  check(
    "F1u panel Asisten AI ikut EN: ajakan + contoh pertanyaan, tanpa teks Indonesia",
    adaAiEn && tanpaAiId,
    `→ EN=${adaAiEn} tanpaID=${tanpaAiId}`,
  );
  await page.getByRole("button", { name: "Close the ERPindo Assistant" }).first().click();
  await page.waitForTimeout(300);

  // Fase 16n — pelunasan utang 16e. Rute diverifikasi ke main.tsx:
  // /app/keuangan/arus-kas dan /app/keuangan/neraca. Baris ringkasan arus kas
  // selalu tampil begitu data termuat (tak bergantung ada/tidaknya mutasi).
  await gotoRoute("/app/keuangan/arus-kas", 900);
  const akEn = await page.innerText("body");
  const adaArusKas =
    akEn.includes("Opening cash balance") && akEn.includes("Closing cash balance");
  const tanpaArusKasId =
    !akEn.includes("Saldo kas awal periode") && !akEn.includes("Perubahan kas bersih");
  check(
    "F0q sisa teks Arus Kas ikut EN: baris saldo awal & akhir, tanpa teks Indonesia",
    adaArusKas && tanpaArusKasId,
    `→ baris=${adaArusKas} tanpaID=${tanpaArusKasId}`,
  );
  await gotoRoute("/app/keuangan/neraca", 900);
  const nrEn = await page.innerText("body");
  const adaNeracaEn = nrEn.includes("balanced ✓") || nrEn.includes("NOT balanced");
  const tanpaNeracaId = !nrEn.includes("seimbang ✓");
  check(
    "F0r lencana keseimbangan Neraca ikut EN, tanpa teks Indonesia",
    adaNeracaEn && tanpaNeracaId,
    `→ lencana=${adaNeracaEn} tanpaID=${tanpaNeracaId}`,
  );
  // F3a — Fase 21b: kartu Rasio keuangan (rasio lancar & perputaran persediaan).
  // Menutup sisa baris roadmap "rasio keuangan otomatis".
  const adaRasioEn =
    nrEn.includes("Financial ratios") &&
    nrEn.includes("Current ratio") &&
    nrEn.includes("Inventory turnover");
  const tanpaRasioId =
    !nrEn.includes("Rasio keuangan") && !nrEn.includes("Perputaran persediaan");
  check(
    "F3a tombol Ekspor CSV ikut EN (label bawaannya dulu Indonesia harfiah)",
    nrEn.includes("Export CSV") && !nrEn.includes("Ekspor CSV"),
    `→ ${nrEn.includes("Export CSV")}`,
  );
  check(
    "F3a kartu Rasio keuangan ikut EN: judul + kedua rasio, tanpa teks Indonesia",
    adaRasioEn && tanpaRasioId,
    `→ EN=${adaRasioEn} tanpaID=${tanpaRasioId}`,
  );
  // Angkanya harus benar-benar terhitung, bukan sekadar kartunya ter-render:
  // perusahaan demo punya persediaan & kewajiban, jadi keduanya wajib berisi
  // angka — bukan "not computable yet".
  const isiRasio = await page.locator('[data-testid="rasio-lancar"]').innerText();
  const isiPerputaran = await page.locator('[data-testid="rasio-perputaran"]').innerText();
  check(
    "F3a kedua rasio benar-benar terhitung dari data (bukan 'belum bisa dihitung')",
    /\d/.test(isiRasio) && /\d/.test(isiPerputaran) &&
      !isiRasio.includes("not computable") && !isiPerputaran.includes("not computable"),
    `→ lancar="${isiRasio.replace(/\n/g, " ").slice(0, 60)}" perputaran="${isiPerputaran.replace(/\n/g, " ").slice(0, 60)}"`,
  );
  await gotoRoute("/app/keuangan/neraca-saldo", 700);
  const tbEn = await page.innerText("body");
  check(
    "F0c halaman laporan ikut EN: Neraca Saldo → 'Trial Balance'",
    tbEn.includes("Trial Balance") && !tbEn.includes("Ringkasan saldo semua akun"),
    `→ judul laporan belum Inggris`,
  );
  await gotoRoute("/app", 600);
  await page.locator("aside").getByRole("button", { name: "ID", exact: true }).first().click();
  await page.waitForTimeout(300);
  check("F0b toggle kembali ke ID", (await page.innerText("body")).includes("Penjualan"));
  await gotoRoute("/app/master/produk", 700);
  check(
    "F0c kembali ke ID: judul halaman modul kembali 'Produk'",
    (await page.innerText("body")).includes("Katalog barang"),
  );
  await gotoRoute("/app", 600);
  check("F0b multibahasa aplikasi bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);
  await page.getByRole("button", { name: "7 hari", exact: true }).click();
  await page.getByText("Penjualan 7 hari terakhir").first().waitFor({ timeout: 10_000 });
  check("filter grafik 7/30/90: klik '7 hari' → judul & grafik ikut", true);
  await page.getByLabel("Kas & Bank — buka laporan sumber").click();
  await page.waitForURL("**/app/keuangan/kas-bank", { timeout: 15_000 });
  check("kartu KPI Kas & Bank bisa diklik → halaman Kas & Bank", true);
  check("quick wins dashboard bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);
  await gotoRoute("/app", 600);

  // -------------------------------------------------------------------------
  // 1. Sapu semua rute: render + bebas galat.
  // -------------------------------------------------------------------------
  console.log("1. Sapu seluruh rute aplikasi");
  for (const [route, name] of AUDIT_ROUTES) {
    resetErrors();
    await gotoRoute(route);
    const text = await page.innerText("body").catch(() => "");
    check(`rute ${name} (${route}) render berisi`, text.replace(/\s+/g, " ").length > 40);
    check(`rute ${name} bebas pageerror/console.error/5xx`, errors.length === 0, `→ ${errors[0] ?? ""}`);
  }

  // -------------------------------------------------------------------------
  // 2. Alur interaktif nyata.
  // -------------------------------------------------------------------------
  console.log("2. Alur interaktif");
  const stamp = String(Date.now()).slice(-6);

  // F1 — Master Data: buat produk via form.
  resetErrors();
  await gotoRoute("/app/master/produk");
  // Fase 38j — formulir produk pindah ke Lembar; halaman membuka dengan daftar.
  await bukaLembar(page, "Tambah produk");
  await page.fill("#p-sku", `UISIM-${stamp}`);
  await page.fill("#p-name", "Produk Uji Simulasi");
  await page.fill("#p-sell", "125000");
  const prodForm = page.locator("form", { has: page.locator("#p-sku") });
  const prodPost = postDone("/products");
  await prodForm.getByRole("button", { name: "Tambah", exact: true }).click();
  await prodPost;
  await page.getByText("Produk Uji Simulasi").first().waitFor();
  check("F1 produk: form → 201 → muncul di tabel", true);
  check("F1 produk bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F2 — Master Data: buat kontak pelanggan via form.
  resetErrors();
  await gotoRoute("/app/master/kontak");
  await bukaLembar(page, "Tambah kontak");
  await page.fill("#k-name", "Pelanggan Uji Simulasi");
  const contactForm = page.locator("form", { has: page.locator("#k-name") });
  const contactPost = postDone("/contacts");
  await contactForm.getByRole("button", { name: "Tambah", exact: true }).click();
  await contactPost;
  await page.getByText("Pelanggan Uji Simulasi").first().waitFor();
  check("F2 kontak: form → 201 → muncul di tabel", true);

  // --- F54 Batas kredit & termin pembayaran (Fase 42a) -----------------------
  //
  // Diperiksa lewat SUNTING, bukan tambah. Formulir kontak di berkas ini
  // sengaja memakai bentuk pendek saat menambah — alamat dan NPWP pun hanya
  // muncul saat menyunting (`{editing ? …}`), dan dua medan baru mengikuti
  // konvensi yang sama alih-alih memperpanjang formulir tambah.
  //
  // Yang hanya bisa diperiksa di peramban: medan yang DIKOSONGKAN tersimpan
  // sebagai "tanpa batas", bukan nol. Selisih itu hidup di penangan submit
  // (`angkaOpsional`), bukan di skema, jadi uji unit tidak melihatnya — dan
  // salah di situ langsung memblokir penjualan ke seluruh pelanggan lama.
  // Lembar "Tambah kontak" masih terbuka setelah simpan dan menutupi tabelnya,
  // jadi ia ditutup dulu alih-alih diklik menembus lapisan.
  const tutupLembar = async () => {
    if ((await page.locator("[data-lembar]").isVisible().catch(() => false))) {
      await page.keyboard.press("Escape");
      await page.locator("[data-lembar]").waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
    }
  };
  await tutupLembar();
  const barisKontak = page.locator("tr", { hasText: "Pelanggan Uji Simulasi" }).first();
  await barisKontak.getByRole("button", { name: "Ubah", exact: true }).click();
  await page.locator("#k-termin").waitFor({ state: "visible", timeout: 10_000 });
  const adaTermin = await page.locator("#k-termin").count();
  const adaKredit = await page.locator("#k-kredit").count();
  check("F54 formulir sunting kontak memuat termin pembayaran & batas kredit",
    adaTermin === 1 && adaKredit === 1, `→ termin=${adaTermin} kredit=${adaKredit}`);

  await page.fill("#k-termin", "30");
  await page.fill("#k-kredit", "5000000");
  const kreditPatch = page.waitForResponse((r) => r.url().includes("/contacts/") && r.request().method() === "PUT" && r.ok());
  await page.locator("form", { has: page.locator("#k-termin") }).getByRole("button", { name: "Simpan", exact: true }).click();
  await kreditPatch;
  check("F54 termin & batas kredit tersimpan lewat formulir", true);

  // Dikosongkan lagi: harus kembali "tanpa batas", bukan nol. Nol berarti
  // pelanggan tidak boleh berutang sama sekali — kebalikan dari yang dimaksud.
  await tutupLembar();
  await barisKontak.getByRole("button", { name: "Ubah", exact: true }).click();
  await page.locator("#k-kredit").waitFor({ state: "visible", timeout: 10_000 });
  await page.fill("#k-kredit", "");
  const kosongPatch = page.waitForResponse((r) => r.url().includes("/contacts/") && r.request().method() === "PUT" && r.ok());
  await page.locator("form", { has: page.locator("#k-kredit") }).getByRole("button", { name: "Simpan", exact: true }).click();
  await kosongPatch;
  const kontakJson = await page.evaluate(async () => {
    const tid = localStorage.getItem("erpindo-tenant");
    const r = await fetch(`/api/tenants/${tid}/contacts`);
    return r.json();
  });
  const uji = kontakJson?.items?.find((k) => k.name === "Pelanggan Uji Simulasi");
  check("F54 batas kredit dikosongkan tersimpan NULL (tanpa batas), bukan 0",
    uji?.credit_limit === null && uji?.payment_term_days === 30,
    `→ kredit=${JSON.stringify(uji?.credit_limit)} termin=${JSON.stringify(uji?.payment_term_days)}`);

  check("F2 kontak bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F3 — Catat Transaksi (wizard pemula): uang keluar berkategori.
  resetErrors();
  await gotoRoute("/app/keuangan/catat");
  await page.getByRole("tab", { name: "Uang Keluar" }).click();
  await page.fill("#catat-jumlah", "150000");
  await page.selectOption("#catat-kategori", { index: 1 });
  const catatPost = postDone("/journal-entries");
  await page.getByRole("button", { name: "Catat", exact: true }).click();
  await catatPost;
  check("F3 wizard Catat Transaksi: uang keluar diposting (201)", true);
  check("F3 wizard bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F4 — Jurnal Umum manual 2 baris seimbang → Neraca Saldo tetap seimbang.
  resetErrors();
  await gotoRoute("/app/keuangan/jurnal");
  // Fase 38k — jurnal manual pindah ke Lembar; halaman Jurnal Umum membuka
  // dengan jurnalnya, dan memposting manual adalah pengecualian.
  await bukaLembar(page, "Jurnal manual baru");
  await page.fill("#jr-memo", "Jurnal uji simulasi UI");
  await page.getByLabel("Akun baris 1").selectOption({ index: 1 });
  await page.getByLabel("Debit baris 1").fill("250000");
  await page.getByLabel("Akun baris 2").selectOption({ index: 2 });
  await page.getByLabel("Kredit baris 2").fill("250000");
  const jurnalPost = postDone("/journal-entries");
  await page.getByRole("button", { name: "Posting Jurnal" }).click();
  await jurnalPost;
  check("F4 jurnal manual seimbang diposting (201)", true);
  await gotoRoute("/app/keuangan/neraca-saldo");
  check("F4 Neraca Saldo tetap 'seimbang ✓' setelah jurnal manual", (await page.innerText("body")).includes("seimbang ✓"));
  check("F4 jurnal bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F25 — Fase 17h. Mengunci keputusan yang mudah terbalik saat migrasi tabel:
  // kolom NILAI (debit/kredit) memakai `Td numeric` → mono + rata KANAN,
  // sedangkan kolom KODE AKUN memakai mono tetapi tetap rata KIRI, karena ia
  // pengenal, bukan nilai. Menandai kode akun sebagai `numeric` akan terlihat
  // "rapi" sekilas padahal salah secara akuntansi.
  const kolomNeraca = await page.evaluate(() => {
    const kode = document.querySelector("td.font-mono");
    const nilai = document.querySelector("td.num");
    const baca = (el) => (el ? { font: getComputedStyle(el).fontFamily, align: getComputedStyle(el).textAlign } : null);
    return { kode: baca(kode), nilai: baca(nilai) };
  });
  check(
    "F25 Neraca Saldo: kolom nilai mono rata-kanan, kode akun mono rata-kiri",
    Boolean(
      kolomNeraca.kode &&
        kolomNeraca.nilai &&
        /mono/i.test(kolomNeraca.kode.font) &&
        kolomNeraca.kode.align !== "right" &&
        /mono/i.test(kolomNeraca.nilai.font) &&
        kolomNeraca.nilai.align === "right",
    ),
    `→ kode=${kolomNeraca.kode ? kolomNeraca.kode.align : "tidak ada"} nilai=${kolomNeraca.nilai ? kolomNeraca.nilai.align : "tidak ada"}`,
  );

  // F5 — Buku Besar: pilih akun → mutasi + saldo berjalan render (uji 9a).
  resetErrors();
  await gotoRoute("/app/keuangan/buku-besar");
  await page.selectOption("#lg-acc", { index: 1 });
  await page.getByText("Saldo akhir").waitFor();
  const lgRows = await page.locator("table tbody tr").count();
  check("F5 buku besar: pilih akun → baris mutasi render (≥3)", lgRows >= 3, `→ ${lgRows} baris`);
  check("F5 buku besar bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F6 — POS: buka shift → tambah produk → bayar tunai → struk.
  resetErrors();
  await gotoRoute("/app/pos", 1000);
  if (await page.locator("#pos-opening").isVisible().catch(() => false)) {
    // Buka shift di Gudang Utama (opsi pertama bisa gudang cabang tanpa stok).
    const whUtama = await page.locator("#pos-wh option", { hasText: "Utama" }).first().getAttribute("value");
    if (whUtama) await page.selectOption("#pos-wh", whUtama);
    await page.fill("#pos-opening", "500000");
    const shiftPost = postDone("/pos/shift/open");
    await page.getByRole("button", { name: "Buka Shift" }).click();
    await shiftPost;
    check("F6 POS: shift dibuka via form", true);
  } else {
    check("F6 POS: shift sudah terbuka", true);
  }
  // Cari produk seed yang PASTI berharga & berstok (kartu pertama bisa jasa
  // Rp 0 atau produk buatan F1 yang stoknya nol → penjualan ditolak API).
  await page.getByPlaceholder("Cari produk / SKU…").fill("Kopi Arabika");
  // Pencarian POS berjalan di SERVER (Fase 3c), jadi menunggu selang waktu tetap
  // adalah balapan: di runner yang lambat daftar produk belum sempat berganti
  // dan klik "kartu pertama" mendarat di produk lama berstok nol — penjualan
  // ditolak 400 "Stok tidak mencukupi" dan uji merah tanpa ada yang rusak.
  // Terjadi sungguhan di CI 14 Agustus 2026. Yang ditunggu kini hasil
  // pencariannya sendiri, bukan jam.
  const kartuKopi = page.locator("button", { hasText: "Kopi Arabika" }).filter({ hasNotText: "Rp 0" }).first();
  await kartuKopi.waitFor({ state: "visible", timeout: 15_000 });
  await kartuKopi.click();
  await page.getByRole("button", { name: "+ Tunai" }).click();
  await page.getByLabel("Nominal Tunai").fill("10000000");
  const salePost = postDone("/pos/sales");
  await page.getByRole("button", { name: "Bayar & Cetak Struk" }).click();
  await salePost;
  check("F6 POS: keranjang → bayar tunai → transaksi 201", true);
  check("F6 POS bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F6b — POS quick wins (Fase 12e): tombol nominal cepat + kembalian menonjol + rekap.
  resetErrors();
  await page.getByPlaceholder("Cari produk / SKU…").fill("Kopi Arabika");
  // Pencarian POS berjalan di SERVER (Fase 3c), jadi menunggu selang waktu tetap
  // adalah balapan: di runner yang lambat daftar produk belum sempat berganti
  // dan klik "kartu pertama" mendarat di produk lama berstok nol — penjualan
  // ditolak 400 "Stok tidak mencukupi" dan uji merah tanpa ada yang rusak.
  // Terjadi sungguhan di CI 14 Agustus 2026. Yang ditunggu kini hasil
  // pencariannya sendiri, bukan jam.
  const kartuKopi2 = page.locator("button", { hasText: "Kopi Arabika" }).filter({ hasNotText: "Rp 0" }).first();
  await kartuKopi2.waitFor({ state: "visible", timeout: 15_000 });
  await kartuKopi2.click();
  await page.getByRole("button", { name: "Uang pas", exact: true }).click();
  await page.getByRole("button", { name: "+50rb", exact: true }).click();
  await page.getByText("Kembalian:").first().waitFor({ timeout: 10_000 });
  check("F6b POS: 'Uang pas' + '+50rb' → kembalian Rp 50.000 tampil menonjol", true);
  const salePost2 = postDone("/pos/sales");
  await page.getByRole("button", { name: "Bayar & Cetak Struk" }).click();
  await salePost2;
  check("F6b POS: bayar via nominal cepat → transaksi 201", true);
  await page.getByRole("button", { name: "Lihat rekap" }).click();
  await page.getByText("Per metode").first().waitFor({ timeout: 10_000 });
  check("F6b POS: kartu 'Rekap hari ini' terbuka berisi rekap per jam/shift/metode", true);
  check("F6b POS quick wins bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F6c / F38 — pemindai barcode kamera (Fase 20i, cadangan wasm Fase 21g).
  //
  // Fase 20i hanya bisa menguji DEGRADASI-nya: Chromium suite tak punya
  // `BarcodeDetector` maupun kamera, jadi jalur berhasilnya tak pernah
  // berjalan. Fase 21g menutup lubang itu dengan kamera palsu berisi barcode
  // produk demo, sehingga yang diperiksa di bawah adalah rantai penuhnya —
  // termasuk dua header keamanan yang selama ini diam-diam mematikannya.
  resetErrors();
  const dukungan = await page.evaluate(() => ({
    detector: "BarcodeDetector" in window,
    media: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  }));
  check(
    "F6c prasyarat cek ini benar: Chromium suite memang tanpa BarcodeDetector bawaan",
    dukungan.detector === false,
    `→ ${JSON.stringify(dukungan)}`,
  );
  // Tanpa asersi ini, keranjang yang kebetulan sudah berisi Kopi akan membuat
  // F38b hijau tanpa satu barcode pun terbaca.
  check(
    "F38a keranjang kosong sebelum pemindaian — dasar cek berikutnya",
    (await page.getByTestId("keranjang-baris").count()) === 0,
    `→ ${await page.getByTestId("keranjang-baris").count()} baris`,
  );
  // Berkas wasm-nya harus benar-benar DIAMBIL sebagai aset tersendiri. Bila
  // ia ter-inline jadi data URI (jebakan `assetsInlineLimit`, lihat log fase),
  // F38b memang ikut merah — tetapi tanpa cek ini penyebabnya tak bernama dan
  // gejalanya menyerupai kegagalan penguraian biasa.
  const asetWasm = [];
  const catatWasm = (r) => {
    if (r.url().endsWith(".wasm")) asetWasm.push(`${r.status()} ${new URL(r.url()).pathname}`);
  };
  page.on("response", catatWasm);
  await page.getByRole("button", { name: "Pindai barcode" }).click();
  await page.locator('[data-testid="panel-pindai"]').waitFor({ timeout: 10_000 });
  // Inti Fase 21g: peramban tanpa API bawaan TIDAK lagi ditolak di depan
  // pintu. Yang tampil harus panel kamera, bukan pesan menyerah.
  const barisKopi = page.getByTestId("keranjang-baris").filter({ hasText: "Kopi Arabika Gayo 250g" });
  let terbaca = true;
  await barisKopi.waitFor({ timeout: 45_000 }).catch(() => (terbaca = false));
  check(
    "F38b barcode dari kamera terurai wasm → produknya masuk keranjang sendiri",
    terbaca,
    `→ ${(await page.innerText("body")).includes("Mesin pemindai gagal dimuat") ? "pengurai gagal dimuat" : "keranjang tetap kosong"}`,
  );
  page.off("response", catatWasm);
  check(
    "F38c pengurai wasm diambil sebagai berkas .wasm dari origin sendiri, bukan data URI ter-inline",
    asetWasm.some((s) => s.startsWith("200")),
    `→ ${JSON.stringify(asetWasm)}`,
  );
  // Kotak pencarian HARUS tetap bisa dipakai — arti "degradasi anggun" di sini:
  // pemindai tidak boleh mengambil alih layar kasir.
  await page.getByPlaceholder("Cari produk / SKU…").fill("Kopi Arabika");
  await page.waitForTimeout(500);
  const masihBisaCari = await page.locator("button", { hasText: "Rp" }).filter({ hasNotText: "Rp 0" }).count();
  check(
    "F6c pencarian produk tetap berfungsi saat pemindai menyala",
    masihBisaCari > 0,
    `→ ${masihBisaCari} kartu produk`,
  );
  await page.getByRole("button", { name: "Tutup pemindai" }).click();
  await page.waitForTimeout(300);
  check(
    "F6c panel pemindai bisa ditutup lagi",
    (await page.locator('[data-testid="panel-pindai"]').count()) === 0,
  );
  // F2a — panel pemindainya ikut EN. Diperiksa DI SINI, bukan di sapuan EN di
  // awal suite: tombol pindai hanya ada saat shift terbuka, dan sapuan itu
  // berjalan sebelum F6 membuka shift. Menuntutnya di sana adalah kesalahan
  // asersi, bukan bukti bug — pelajaran yang sudah tertulis di F0i.
  //
  // Sejak 21g yang diperiksa adalah kalimat jalur BERHASIL ("arahkan kamera"),
  // bukan lagi kalimat menyerah — kalimat itu memang tak muncul lagi.
  await page.locator("aside").getByRole("button", { name: "EN", exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Scan barcode" }).click();
  await page.locator('[data-testid="panel-pindai"]').waitFor({ timeout: 10_000 });
  const pindaiEnBody = await page.innerText("body");
  const adaPindaiEn =
    pindaiEnBody.includes("Point the camera at the product barcode") &&
    pindaiEnBody.includes("Close scanner");
  const tanpaPindaiId =
    !pindaiEnBody.includes("Arahkan kamera ke barcode") && !pindaiEnBody.includes("Tutup pemindai");
  check(
    "F2a pemindai barcode ikut EN: tombol + keterangan panel, tanpa teks Indonesia",
    adaPindaiEn && tanpaPindaiId,
    `→ EN=${adaPindaiEn} tanpaID=${tanpaPindaiId}`,
  );
  // F38d — temuan pemeriksaan mata Fase 21g. `F2a` di atas memeriksa PANEL
  // pemindainya dan karena itu hijau terus, sementara tombol terpenting di
  // layar kasir — tombol bayar — tetap berbahasa Indonesia di mode Inggris.
  // Cek ini memeriksa tombol aksi & nominal cepat, bukan panelnya.
  const kasirEnBody = await page.innerText("body");
  // Sengaja TIDAK menuntut "View summary": kartu rekap sudah dibuka `F6b` di
  // atas, jadi tombolnya berbunyi "Close". Versi pertama cek ini menuntutnya
  // dan karena itu merah tanpa ada yang salah — sisi Indonesianya ("Tutup")
  // yang diperiksa, karena itulah keadaan yang benar-benar tampil di sini.
  const aksiEn = kasirEnBody.includes("Pay & print receipt") && kasirEnBody.includes("+50k");
  const aksiSisaId =
    kasirEnBody.includes("Bayar & Cetak Struk") ||
    kasirEnBody.includes("+50rb") ||
    kasirEnBody.includes("Tutup");
  check(
    "F38d tombol aksi kasir ikut EN (bayar, nominal cepat, rekap) — bukan hanya panel pemindai",
    aksiEn && !aksiSisaId,
    `→ EN=${aksiEn} sisaID=${aksiSisaId}`,
  );
  await page.getByRole("button", { name: "Close scanner" }).click();
  await page.locator("aside").getByRole("button", { name: "ID", exact: true }).first().click();
  await page.waitForTimeout(400);

  check("F6c pemindai barcode bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F7 — Penjualan: terima pembayaran faktur outstanding → lunas.
  resetErrors();
  await gotoRoute("/app/penjualan", 1000);
  const payBtn = page.getByRole("button", { name: "Terima Pembayaran" }).first();
  await payBtn.click();
  await page.locator('select[id^="pay-acc-"]').first().selectOption({ index: 1 });
  const payPost = postDone("/payments");
  await page.getByRole("button", { name: "Catat", exact: true }).first().click();
  await payPost;
  check("F7 penjualan: terima pembayaran faktur outstanding → 201", true);
  check("F7 pembayaran bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F7b — Fase 20g: picking multi-gudang pada form faktur penjualan.
  // Yang diuji bukan sekadar "panelnya muncul", tapi PENJAGA-nya: begitu jumlah
  // qty per gudang tidak sama dengan qty baris, tombol posting harus mati —
  // supaya penolakan dari skema tak pernah sampai ke pengguna.
  resetErrors();
  await gotoRoute("/app/penjualan", 1000);
  await bukaLembar(page, "Faktur penjualan baru");
  // Pelanggan wajib dipilih — tanpa itu tombol posting mati karena alasan lain
  // dan pemeriksaan di bawah kehilangan artinya.
  await page.getByPlaceholder("Cari pelanggan…").first().fill("a");
  await page.waitForTimeout(700);
  await page.locator("div.absolute.z-30 button").first().click();
  await page.waitForTimeout(300);
  await page.getByPlaceholder("Cari produk (SKU/nama)…").first().fill("KOPI-250");
  await page.waitForTimeout(700);
  await page.locator("div.absolute.z-30 button").first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Ambil dari beberapa gudang" }).first().click();
  await page.waitForTimeout(300);
  const pickSum = page.locator('[data-testid="picking-sum-0"]');
  await pickSum.first().waitFor({ timeout: 10_000 });
  check(
    "F7b picking multi-gudang: panel terbuka & jumlah awal sudah pas (1 / 1)",
    (await pickSum.first().innerText()).startsWith("1 / 1"),
    `→ ${await pickSum.first().innerText()}`,
  );
  // Tambah gudang kedua tanpa mengisi qty → jumlah jadi timpang.
  await page.getByRole("button", { name: "+ Tambah gudang" }).first().click();
  await page.waitForTimeout(300);
  // Baris picking baru harus menunjuk gudang LAIN. Isian yang menyarankan
  // gudang yang sama dua kali ditemukan lewat pemeriksaan mata di fase ini —
  // asersi di bawahnya tetap hijau saat itu, jadi dijadikan cek sendiri.
  const gudang1 = await page.getByLabel("Gudang baris 1-1", { exact: true }).inputValue();
  const gudang2 = await page.getByLabel("Gudang baris 1-2", { exact: true }).inputValue();
  check(
    "F7b baris picking baru menunjuk gudang BERBEDA, bukan mengulang gudang pertama",
    gudang1 !== gudang2 && gudang2 !== "",
    `→ ${gudang1} vs ${gudang2}`,
  );
  await page.getByLabel("Qty gudang baris 1-2").fill("3");
  await page.waitForTimeout(300);
  const postDisabled = await page.getByRole("button", { name: "Posting Faktur" }).isDisabled();
  check(
    "F7b jumlah picking timpang → tombol 'Posting Faktur' NONAKTIF",
    postDisabled,
    `→ disabled=${postDisabled}`,
  );
  // Samakan qty baris dengan total picking → tombol hidup lagi.
  await page.getByLabel("Qty baris 1").fill("4");
  await page.waitForTimeout(300);
  const postEnabledLagi = !(await page.getByRole("button", { name: "Posting Faktur" }).isDisabled());
  check(
    "F7b qty baris disamakan (4) → tombol posting AKTIF kembali",
    postEnabledLagi,
    `→ ${await pickSum.first().innerText()}`,
  );
  check("F7b picking multi-gudang bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F7c — Fase 20h: kartu Peramalan stok di halaman Stok.
  resetErrors();
  await gotoRoute("/app/stok", 1200);
  const ramalBody = await page.innerText("body");
  check(
    "F7c kartu Peramalan stok render (judul + kolom keyakinan)",
    ramalBody.includes("Peramalan stok") && ramalBody.includes("Keyakinan"),
  );
  // Saringan "hanya yang perlu dipesan" menyala secara bawaan; mematikannya
  // harus MENAMBAH baris, bukan sekadar tidak error.
  const barisRamalan = page.locator('[data-testid="tabel-ramalan"] tbody tr');
  const barisTersaring = await barisRamalan.count();
  await page.getByText("Hanya yang perlu dipesan").click();
  await page.waitForTimeout(500);
  const barisSemua = await barisRamalan.count();
  check(
    "F7c mematikan saringan 'hanya yang perlu dipesan' menambah baris ramalan",
    barisSemua > barisTersaring,
    `→ tersaring=${barisTersaring} semua=${barisSemua}`,
  );
  check("F7c peramalan stok bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F8 — CRM: tambah lead → muncul di papan funnel.
  resetErrors();
  await gotoRoute("/app/crm/leads");
  // Fase 38i — formulir lead pindah ke Lembar; halaman kini membuka dengan
  // papan kanban, bukan formulir kosong.
  await bukaLembar(page, "Lead baru");
  await page.fill("#lead-name", "Lead Uji Simulasi");
  const leadPost = postDone("/leads");
  await page.getByRole("button", { name: "Tambah Lead" }).click();
  await leadPost;
  await page.getByText("Lead Uji Simulasi").first().waitFor();
  check("F8 CRM: lead baru → 201 → tampil di funnel", true);
  check("F8 CRM bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F36 — Fase 21e: kartu form lead publik (khusus Pemilik). Diterbitkan lewat
  // tombolnya, lalu cuplikannya diperiksa isinya — bukan sekadar "ada teksarea".
  const terbitForm = page.locator('[data-testid="terbitkan-form-lead"]');
  await terbitForm.waitFor({ state: "visible", timeout: 15_000 });
  const terbitPost = postDone("/lead-form/token", [201]);
  await terbitForm.click();
  await terbitPost;
  const cuplikan = page.locator('[data-testid="cuplikan-form-lead"]');
  await cuplikan.waitFor({ state: "visible", timeout: 15_000 });
  const isiCuplikan = await cuplikan.inputValue();
  check(
    "F36a cuplikan form memuat endpoint publik + slug tenant, bukan placeholder",
    isiCuplikan.includes("/api/form/lead/") && !isiCuplikan.includes("undefined"),
    `→ ${isiCuplikan.slice(0, 80)}`,
  );
  // Token harus BENAR-BENAR tertanam di cuplikan — tanpa itu pemilik menempel
  // form yang setiap kirimannya ditolak 403, dan tak ada pesan yang menjelaskan.
  const adaToken = /token:'[0-9a-f]{32,}'/.test(isiCuplikan);
  check("F36b token asli tertanam di cuplikan (form yang ditempel benar-benar bisa dipakai)", adaToken, `→ ${adaToken}`);
  // F36d — temuan pemeriksaan mata Fase 21e: sisa Indonesia di mode Inggris pada
  // halaman Pipeline. Semuanya berbentuk TEKS YANG DIRANGKAI DENGAN ANGKA
  // ("3 lead terbuka", "0 aktivitas") — bentuk yang lolos penyapu maupun asersi
  // "tanpa teks Indonesia" yang mencari kalimat utuh. Termasuk placeholder di
  // dalam cuplikan form: pemilik ber-antarmuka Inggris menempelkan form
  // berbahasa Indonesia ke landing page-nya sendiri.
  await page.locator("aside").getByRole("button", { name: "EN", exact: true }).first().click();
  await page.waitForTimeout(700);
  const crmPipelineEn = await page.innerText("body");
  const cuplikanEn = await page.locator('[data-testid="cuplikan-form-lead"]').inputValue();
  check(
    "F36d teks Pipeline berangka & isi cuplikan form ikut EN, tanpa sisa Indonesia",
    crmPipelineEn.includes("open leads") &&
      crmPipelineEn.includes("activities") &&
      !crmPipelineEn.includes("lead terbuka") &&
      !/\d aktivitas/.test(crmPipelineEn) &&
      cuplikanEn.includes('placeholder="Name"') &&
      !cuplikanEn.includes('placeholder="Nama"'),
    `→ halaman=${crmPipelineEn.includes("open leads")} cuplikan=${cuplikanEn.includes('placeholder="Name"')}`,
  );
  await page.locator("aside").getByRole("button", { name: "ID", exact: true }).first().click();
  await page.waitForTimeout(700);

  // F9 — Helpdesk: buat tiket bertaut kontak.
  resetErrors();
  await gotoRoute("/app/helpdesk");
  // Fase 38h — formulir tiket kini berada di dalam Lembar, dibuka aksi utama
  // halaman. Halaman membuka dengan DATA, bukan dengan formulir kosong.
  await bukaLembar(page, "Tiket baru");
  await page.selectOption("#tk-contact", { index: 1 });
  await page.fill("#tk-subject", "Tiket Uji Simulasi");
  await page.fill("#tk-desc", "Dibuat oleh simulasi UI otomatis.");
  const ticketPost = postDone("/tickets");
  await page.getByRole("button", { name: "Buat Tiket" }).click();
  await ticketPost;
  await page.getByText("Tiket Uji Simulasi").first().waitFor();
  check("F9 helpdesk: tiket baru → 201 → tampil di daftar", true);
  check("F9 helpdesk bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // --- F52 Primitif halaman modul (Fase 38h) --------------------------------
  //
  // Diuji pada halaman pilot. Ketiganya mengikat PERAN lewat atribut `data-*`,
  // bukan markup — sehingga tata letaknya boleh berubah lagi tanpa memecahkan
  // asersi ini.
  check(
    "F52 halaman modul memakai kerangka baku",
    (await page.locator("[data-halaman]").count()) === 1,
    `→ ${await page.locator("[data-halaman]").count()} kerangka`,
  );

  // Perubahan alur kerja yang menjadi alasan seluruh sub-fase ini: yang pertama
  // terlihat saat halaman dibuka adalah DATA, bukan formulir kosong.
  check(
    "F52 halaman terbuka dengan data, bukan formulir pembuatan",
    (await page.locator("[data-lembar]").count()) === 0,
    `→ lembar terbuka saat halaman dimuat`,
  );

  await bukaLembar(page, "Tiket baru");
  check("F52 Lembar terbuka lewat aksi utama halaman", (await page.locator("[data-lembar]").count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check(
    "F52 Lembar tertutup dengan Escape",
    (await page.locator("[data-lembar]").count()) === 0,
    `→ masih terbuka`,
  );

  // Daftar & detail di layar kecil: SALAH SATU, bukan keduanya bertumpuk.
  // Sebelumnya keduanya menumpuk, sehingga setelah memilih satu baris pengguna
  // harus menggulir jauh ke bawah tanpa ada yang memberi tahu.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const daftarTerlihat = await page.locator("[data-daftar]").isVisible();
  await page.locator("[data-daftar] button").first().click();
  await page.waitForTimeout(500);
  const detailTerlihat = await page.locator("[data-detail]").isVisible();
  const daftarTersembunyi = !(await page.locator("[data-daftar]").isVisible());
  check(
    "F52 layar 390px: daftar & detail bergantian, tidak bertumpuk",
    daftarTerlihat && detailTerlihat && daftarTersembunyi,
    `→ daftarAwal=${daftarTerlihat} detail=${detailTerlihat} daftarSembunyi=${daftarTersembunyi}`,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(200);

  // F10 — HR: tambah karyawan via form.
  resetErrors();
  await gotoRoute("/app/hr/penggajian", 1000);
  // Fase 38t: formulir karyawan keluar dari kartu daftar, masuk ke Lembar.
  await bukaLembar(page, "Tambah karyawan");
  await page.fill("#emp-name", "Karyawan Uji Simulasi");
  await page.fill("#emp-pos", "Staf QA");
  await page.fill("#emp-salary", "5000000");
  const empPost = postDone("/employees");
  // Dilingkupi ke dalam Lembar: sejak Fase 38t ADA DUA tombol bernama sama —
  // pemicu di kepala kartu, dan tombol simpan di kaki lembar. Tanpa lingkup ini
  // Playwright menolak dengan strict mode violation, bukan memilih salah satu.
  await page.locator("[data-lembar]").getByRole("button", { name: "Tambah karyawan" }).click();
  await empPost;
  await page.locator("td", { hasText: "Karyawan Uji Simulasi" }).first().waitFor();
  check("F10 HR: karyawan baru → 201 → tampil di daftar", true);
  check("F10 HR bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F11 — Persetujuan: ajukan alur pengeluaran ≥ aturan → setujui dari antrean.
  resetErrors();
  await gotoRoute("/app/persetujuan");
  await page.getByRole("button", { name: "Ajukan", exact: true }).click();
  await page.selectOption("#ap-type", "pengeluaran");
  await page.fill("#ap-title", "Pengeluaran Uji Simulasi");
  await page.fill("#ap-amount", "2000000");
  const flowPost = postDone("/approval-flows");
  await page.getByRole("button", { name: "Ajukan", exact: true }).last().click();
  await flowPost;
  check("F11 persetujuan: alur diajukan (201)", true);
  await page.getByRole("button", { name: "Antrean saya" }).click();
  const flowRow = page.locator("div.rounded-lg", { hasText: "Pengeluaran Uji Simulasi" }).first();
  await flowRow.waitFor();
  const decidePost = postDone("/decide");
  await flowRow.getByRole("button", { name: "Setujui" }).click();
  await decidePost;
  await page.getByText("Pengeluaran Uji Simulasi").first().waitFor({ state: "detached" }).catch(() => {});
  check("F11 persetujuan: langkah disetujui dari antrean (200)", true);
  check("F11 persetujuan bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F12 — Laporan: Laba Rugi menampilkan angka non-nol.
  resetErrors();
  await gotoRoute("/app/keuangan/laba-rugi", 1000);
  const lrText = await page.innerText("body");
  check("F12 laba rugi render angka Rupiah non-nol", /Rp\s?[1-9]/.test(lrText.replace(/\u00A0/g, " ")));
  check("F12 laporan bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F13 — Mode Sederhana: toggle menyembunyikan 4 menu akuntansi teknis.
  resetErrors();
  await gotoRoute("/app/pengaturan");
  // :visible — sidebarContent dirender dua kali (aside desktop + drawer mobile).
  const navBefore = await page.locator("aside nav a:visible").count();
  await page.locator("#simpleMode").click();
  await page.waitForTimeout(400);
  const navSimple = await page.locator("aside nav a:visible").count();
  check("F13 Mode Sederhana menyembunyikan 4 menu", navBefore - navSimple === 4, `→ ${navBefore} vs ${navSimple}`);
  await page.locator("#simpleMode").click();
  await page.waitForTimeout(400);
  const navAfter = await page.locator("aside nav a:visible").count();
  check("F13 menonaktifkan Mode Sederhana memulihkan menu", navAfter === navBefore, `→ ${navAfter}`);
  check("F13 pengaturan bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F14 — Navigasi (Fase 9c): taksonomi baru + pencarian menu + seksi lipat.
  resetErrors();
  await gotoRoute("/app", 900);
  const sectionHeads = await page.locator("aside nav button:visible").allInnerTexts();
  check(
    "F14 taksonomi: seksi 'Laporan' dan 'Aset & Pajak' hadir",
    // CSS `uppercase` membuat innerText kapital semua — bandingkan tanpa kapitalisasi.
    sectionHeads.some((t) => t.trim().toLowerCase() === "laporan") &&
      sectionHeads.some((t) => t.trim().toLowerCase() === "aset & pajak"),
    `→ ${sectionHeads.join(", ")}`,
  );
  check("F14 'Pemeliharaan' pindah ke grup baru dan tetap terjangkau",
    await page.locator("aside nav a:visible", { hasText: "Pemeliharaan" }).count() === 1);
  const navLinks = () => page.locator("aside nav a:visible").filter({ hasNotText: "Panduan" }).count();
  const allLinks = await navLinks();
  const searchBox = page.locator('input[aria-label="Cari menu"]:visible').first();
  await searchBox.fill("kontak");
  await page.waitForTimeout(300);
  const filtered = await navLinks();
  check("F14 pencarian 'kontak' menyaring ke 1 menu Kontak",
    filtered === 1 && (await page.locator("aside nav a:visible", { hasText: "Kontak" }).count()) === 1,
    `→ ${filtered} tautan`);
  await searchBox.press("Escape");
  await page.waitForTimeout(300);
  check("F14 Escape membersihkan pencarian (menu pulih)", (await navLinks()) === allLinks);
  // Lipat seksi 'Beli & Stok' → 7 tautan hilang; persist setelah muat ulang.
  //
  // Fase 31b: dulu seksi ini bernama 'Master Data' dan berisi 4 tautan. Nama
  // dan isinya berubah karena taksonomi menu kini dikelompokkan per PEKERJAAN,
  // bukan per nama modul teknis. Yang diuji TIDAK berubah: melipat sebuah seksi
  // menyembunyikan tepat sejumlah tautan miliknya, lipatannya bertahan setelah
  // muat ulang, dan membukanya memulihkan seluruhnya.
  await page.locator("aside nav button:visible", { hasText: "Beli & Stok" }).click();
  await page.waitForTimeout(300);
  const afterCollapse = await navLinks();
  check("F14 melipat 'Beli & Stok' menyembunyikan 7 menu", allLinks - afterCollapse === 7, `→ ${allLinks} vs ${afterCollapse}`);
  await gotoRoute("/app", 900);
  check("F14 lipatan persisten setelah muat ulang", (await navLinks()) === afterCollapse);
  // Membuka lewat TOMBOL JUDUL — jalur ini terpisah dari membuka lewat rail di
  // F14b, dan sempat tidak teruji sama sekali saat asersinya ditulis ulang.
  await page.locator("aside nav button:visible", { hasText: "Beli & Stok" }).click();
  await page.waitForTimeout(300);
  check("F14 membuka lipatan lewat tombol judul memulihkan menu", (await navLinks()) === allLinks);
  await page.locator("aside nav button:visible", { hasText: "Beli & Stok" }).click();
  await page.waitForTimeout(300);

  // F14b — rail wilayah kerja (Fase 31b). Rail SENGAJA di luar <nav>, sama
  // seperti pemicu palet: sebelas asersi F13/F14 menghitung `aside nav
  // a:visible` dan `aside nav button:visible`.
  const railTombol = page.locator('aside [data-area]:visible');
  check("F14b rail memuat satu tombol per wilayah kerja", (await railTombol.count()) === 7,
    `→ ${await railTombol.count()}`);
  check("F14b rail berada DI LUAR <nav> (tidak mencemari hitungan menu)",
    (await page.locator("aside nav [data-area]").count()) === 0);
  // Mengeklik rail wilayah yang sedang terlipat harus MEMBUKANYA — menggulir ke
  // judul yang terlipat hanya memindahkan pandangan ke tempat kosong.
  await page.locator('aside [data-area="Beli & Stok"]:visible').click();
  await page.waitForTimeout(300);
  check("F14b klik rail membuka wilayah yang sedang terlipat", (await navLinks()) === allLinks,
    `→ ${await navLinks()} vs ${allLinks}`);
  await gotoRoute("/app/stok", 900);
  check("F14b rute aktif menyorot wilayahnya di rail",
    (await page.locator('aside [data-area="Beli & Stok"][aria-current="true"]:visible').count()) === 1);
  await gotoRoute("/app", 900);
  check("F14 navigasi bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F20b/F20c — Fase 17c: palet perintah ⌘K.
  //
  // F20c dijalankan LEBIH DULU dan sengaja memakai `allLinks` di atas sebagai
  // pembanding: palet WAJIB tidak menambah satu pun `<a>`/`<button>` ke dalam
  // `<nav>`. Sebelas asersi F13/F14 menghitung `aside nav a:visible` dan
  // `aside nav button:visible`; kalau kelak palet dipindahkan ke dalam sidebar,
  // kesebelasnya pecah sekaligus tanpa pesan yang menjelaskan sebabnya. Cek ini
  // ada supaya kegagalannya menyebut sendiri penyebabnya.
  resetErrors();
  const navSebelumPalet = await navLinks();
  const tombolNavSebelum = await page.locator("aside nav button:visible").count();
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  const paletDialog = page.locator('[role="dialog"][aria-modal="true"]').filter({ has: page.locator('input[aria-label="Cari halaman"]') });
  check("F20b Ctrl+K membuka palet perintah", (await paletDialog.count()) === 1);
  check(
    "F20c palet tidak menambah tautan/tombol ke dalam <nav>",
    (await navLinks()) === navSebelumPalet &&
      (await page.locator("aside nav button:visible").count()) === tombolNavSebelum,
    `→ nav ${navSebelumPalet}→${await navLinks()}, tombol ${tombolNavSebelum}→${await page.locator("aside nav button:visible").count()}`,
  );
  // Regresi bug yang ketahuan dari tangkapan layar Fase 17c: dengan
  // `onMouseEnter`, membuka palet sementara kursor kebetulan diam di atas area
  // daftar akan memindahkan sorotan ke baris di bawah kursor — Enter lalu
  // membawa pengguna ke halaman yang tidak ia pilih. Karena itu kursor SENGAJA
  // ditaruh di tengah area daftar dulu, baru palet dibuka lewat papan ketik.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.mouse.move(680, 470);
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  const barisPalet = paletDialog.locator("li button");
  check(
    "F20b membuka palet menyorot baris pertama walau kursor diam di atas daftar",
    (await barisPalet.first().getAttribute("data-aktif")) === "1" &&
      (await barisPalet.nth(1).getAttribute("data-aktif")) === null,
  );

  // Ketik lalu Enter — menguji penyaringan DAN navigasi dalam satu jalur.
  await page.locator('input[aria-label="Cari halaman"]').fill("kontak");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(900);
  check("F20b Enter di palet menavigasi ke menu terpilih", page.url().includes("/app/master/kontak"), `→ ${page.url()}`);
  check("F20b palet tertutup setelah navigasi", (await paletDialog.count()) === 0);
  // Pemicu di topbar — jalur yang bisa ditemukan pengguna tanpa tahu pintasan.
  await page.getByRole("button", { name: "Buka palet perintah" }).click();
  await page.waitForTimeout(400);
  check("F20b tombol topbar juga membuka palet", (await paletDialog.count()) === 1);
  // Escape harus menutup tanpa berpindah halaman. Keadaan "terbuka" dimasukkan
  // ke dalam asersi dengan sengaja: kalau paletnya tak pernah terbuka, asersi
  // "sudah tertutup + URL tetap" akan lolos secara hampa.
  const urlSebelumEsc = page.url();
  const terbukaSebelumEsc = (await paletDialog.count()) === 1;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check(
    "F20b Escape menutup palet tanpa berpindah halaman",
    terbukaSebelumEsc && (await paletDialog.count()) === 0 && page.url() === urlSebelumEsc,
    `→ terbuka=${terbukaSebelumEsc}`,
  );
  check("F20b palet bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F16 — Fase 10c: balik jurnal via UI, panel pembayaran dokumen, panel
  // Struk & Refund POS.
  resetErrors();
  await gotoRoute("/app/keuangan/jurnal", 900);
  await page.locator('input[aria-label="Cari jurnal"]').fill("Jurnal uji simulasi UI");
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Balik", exact: true }).first().click();
  const revDone = postDone("/reverse");
  await page.getByRole("button", { name: "Ya, balik jurnal" }).click();
  await revDone;
  check("F16 balik jurnal manual via UI (201)", true);
  await page.waitForTimeout(800);
  check("F16 badge DIBALIK tampil pada jurnal asal", (await page.innerText("body")).includes("DIBALIK"));

  await gotoRoute("/app/penjualan", 900);
  await page.getByRole("button", { name: "Pembayaran", exact: true }).first().click();
  await page.waitForTimeout(800);
  check("F16 panel Pembayaran dokumen terbuka", (await page.innerText("body")).includes("Pembayaran dokumen ini"));

  await gotoRoute("/app/pos", 1000);
  await page.getByRole("button", { name: "Struk & Refund" }).click();
  await page.waitForTimeout(900);
  const posBody = await page.innerText("body");
  check("F16 panel Struk & Refund render dengan daftar struk", posBody.includes("Pilih struk, isi qty") && /INV-\d{5}/.test(posBody));
  check("F16 alur Fase 10c bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F17 — Fase 10e: halaman Dukungan render + menu Admin tersembunyi untuk
  // pengguna biasa (bukan admin platform — ui-sim tak menyetel PLATFORM_ADMIN_EMAILS).
  resetErrors();
  await gotoRoute("/app/dukungan", 900);
  const dukunganBody = await page.innerText("body");
  check(
    "F17 halaman Dukungan render (judul + form kirim masukan)",
    dukunganBody.includes("Dukungan & Masukan") && dukunganBody.includes("Kirim masukan"),
  );
  // Menu "Admin" untuk akun INI (Fase 30f: kini admin platform) harus TAMPIL.
  // Pasangan negatifnya — tersembunyi bagi pengguna biasa — dipindah ke sesi
  // demo di bagian bawah berkas ini, karena akun demo adalah "pengguna biasa"
  // yang paling realistis: viewer, tanpa hak platform apa pun.
  const adminNav = await page.locator("aside nav a:visible", { hasText: "Admin" }).count();
  check("F30f menu 'Admin' TAMPIL untuk admin platform", adminNav >= 1, `→ ${adminNav} tautan`);
  check("F17 halaman Dukungan bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F18 — Fase 10f: wizard awal, panduan dalam app, dan tur berpandu.
  resetErrors();
  await gotoRoute("/app/mulai", 900);
  const wizardBody = await page.innerText("body");
  check(
    "F18 wizard awal render (judul + langkah Profil perusahaan)",
    wizardBody.includes("Ayo siapkan cepat") && wizardBody.includes("Profil perusahaan"),
  );
  // Lewati profil → pilih tingkat pengalaman → wizard maju ke langkah Produk.
  await page.getByRole("button", { name: "Lewati", exact: true }).click();
  await page.waitForTimeout(600);
  check("F18 wizard maju ke langkah Pengalaman", (await page.innerText("body")).includes("Seberapa akrab Anda dengan akuntansi"));
  await page.getByRole("button", { name: /Saya pemula/ }).click();
  await page.waitForTimeout(600);
  check("F18 wizard maju ke langkah Produk setelah pilih pengalaman", (await page.innerText("body")).includes("Tambah produk"));

  // Panduan dalam aplikasi (di dalam shell — sidebar tetap tampak).
  await gotoRoute("/app/panduan", 800);
  const guideBody = await page.innerText("body");
  check(
    "F18 panduan dalam app render di dalam shell (kartu modul + sidebar)",
    guideBody.includes("Panduan") && (await page.locator("aside nav a:visible").count()) > 5,
  );
  await gotoRoute("/app/panduan/pos", 800);
  check("F18 artikel panduan modul render (judul + isi)", (await page.innerText("body")).includes("Kasir"));

  // Tur berpandu: buka lewat tombol di topbar, verifikasi kartu tur muncul.
  await gotoRoute("/app/penjualan", 900);
  await page.locator('[title="Tur halaman ini"]').click();
  await page.waitForTimeout(600);
  check(
    "F18 tur berpandu terbuka (dialog + tombol Lanjut)",
    (await page.getByRole("dialog").count()) >= 1 && (await page.getByRole("button", { name: "Lanjut" }).count()) === 1,
  );
  await page.getByRole("button", { name: "Lanjut" }).click();
  await page.waitForTimeout(400);
  check("F18 tur maju ke langkah 2 (tombol Kembali muncul)", (await page.getByRole("button", { name: "Kembali" }).count()) === 1);
  check("F18 alur Fase 10f bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F19 — Fase 10g: halaman bertab (Pengaturan, Penggajian) + kalkulator bisnis.
  resetErrors();
  await gotoRoute("/app/pengaturan", 700);
  check("F19 Pengaturan memakai bilah tab (role=tablist)", (await page.locator('[role="tablist"]').count()) >= 1);
  await page.getByRole("tab", { name: "Perusahaan" }).click();
  await page.waitForTimeout(400);
  const perusahaanBody = await page.innerText("body");
  check("F19 tab Perusahaan menampilkan kartu Profil perusahaan", perusahaanBody.includes("Profil perusahaan"));
  // Fase 53a: kartu Langganan menampilkan paket yang BENAR-BENAR dipakai
  // tenant ini, bukan satu paket yang ditulis mati. Tenant ui-sim adalah akun
  // comped, jadi paketnya Enterprise — dan harganya harus ikut Enterprise.
  // Cek ini yang menangkap kartu yang menyebut harga paket lain kepada
  // pelanggan, kelas cacat yang tidak terlihat selama harganya cuma satu.
  check(
    "F53a Langganan menampilkan paket tenant sendiri (comped → Enterprise)",
    perusahaanBody.includes("Enterprise") && /Rp\s?3\.000\.000/.test(perusahaanBody),
    `→ harga=${/Rp\s?3\.000\.000/.test(perusahaanBody)}`,
  );
  check(
    "F53a Langganan tidak menyebut harga paket lain di kartu yang sama",
    !/Rp\s?750\.000/.test(perusahaanBody) && !/Rp\s?1\.500\.000/.test(perusahaanBody),
    `→ ada harga paket lain di kartu`,
  );
  // F2d — Fase 20m: halaman Pengaturan ikut EN.
  //
  // Enam berkas `pages/settings/` tak pernah masuk program dwibahasa Fase 19
  // karena glob gerbangnya tidak turun ke subfolder. Cek ini yang menjaga
  // penutupannya — termasuk tab, kartu Langganan, dan kartu Profil perusahaan.
  await page.locator("aside").getByRole("button", { name: "EN", exact: true }).first().click();
  await page.waitForTimeout(500);
  const setelanEn = await page.innerText("body");
  const adaSetelanEn =
    setelanEn.includes("Account & Display") &&
    setelanEn.includes("Subscription") &&
    setelanEn.includes("Company profile") &&
    setelanEn.includes("Document numbering");
  const tanpaSetelanId =
    !setelanEn.includes("Akun & Tampilan") &&
    !setelanEn.includes("Langganan") &&
    !setelanEn.includes("Profil perusahaan") &&
    !setelanEn.includes("Penomoran dokumen");
  check(
    "F2d halaman Pengaturan ikut EN: tab, Langganan, Profil perusahaan, Penomoran dokumen",
    adaSetelanEn && tanpaSetelanId,
    `→ EN=${adaSetelanEn} tanpaID=${tanpaSetelanId}`,
  );
  // Tab Data & Keamanan memuat label audit — kelas teks yang datang dari peta
  // kode→label, bukan dari kamus utama.
  await page.getByRole("tab", { name: "Data & Security" }).click();
  await page.waitForTimeout(700);
  const auditEn = await page.innerText("body");
  const adaAuditEn = auditEn.includes("Export & backup") && auditEn.includes("Activity history");
  const tanpaAuditId = !auditEn.includes("Ekspor & cadangan") && !auditEn.includes("Riwayat aktivitas");
  check(
    "F2d tab Data & Keamanan ikut EN termasuk kartu audit log",
    adaAuditEn && tanpaAuditId,
    `→ EN=${adaAuditEn} tanpaID=${tanpaAuditId}`,
  );
  await page.locator("aside").getByRole("button", { name: "ID", exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("tab", { name: "Perusahaan" }).click();
  await page.waitForTimeout(500);

  // F2b — Fase 20k: penjaga tombol ganti paket.
  //
  // Tenant ui-sim adalah akun comped: paketnya enterprise TANPA periode
  // berlangganan. Persis di situlah prorata tidak boleh ditawarkan — tanpa
  // siklus berjalan, "naik paket prorata" berarti naik paket seharga nyaris
  // nol. Server sudah menolaknya (400), dan cek ini menjaga layar tidak pernah
  // sampai menawarkannya.
  //
  // Dialog prorata-nya sendiri TIDAK bisa dicapai dari sini — butuh langganan
  // aktif yang tak bisa dimiliki tenant comped. Cakupannya ada di 7 unit test
  // (angka rupiahnya) + 11 cek smoke; dinyatakan apa adanya di log fase.
  const tombolGantiPaket = await page.locator('[data-testid^="ganti-paket-"]').count();
  check(
    "F2b tenant tanpa periode berlangganan TIDAK ditawari ganti paket prorata",
    tombolGantiPaket === 0,
    `→ ${tombolGantiPaket} tombol`,
  );

  // F2c — Fase 20j: field kustom per modul, dari definisi sampai terpakai.
  //
  // Diuji ujung-ke-ujung lewat UI: buat definisi di Pengaturan, lalu buktikan
  // kolomnya benar-benar MUNCUL di form Kontak. Memeriksa daftar definisinya
  // saja akan hijau walau kolomnya tak pernah sampai ke form mana pun —
  // dan itulah satu-satunya hal yang berguna bagi pemilik.
  await page.locator("#cf-key").fill("kode_wilayah");
  await page.locator("#cf-label").fill("Kode Wilayah");
  const cfPost = postDone("/custom-fields");
  await page.getByRole("button", { name: "Tambah field" }).click();
  await cfPost;
  await page.waitForTimeout(600);
  const daftarCf = await page.locator('[data-testid="daftar-field-kustom"]').innerText();
  check(
    "F2c definisi field kustom tampil di daftar (modul + kunci + tipe)",
    daftarCf.includes("Kode Wilayah") && daftarCf.includes("kode_wilayah"),
    `→ ${daftarCf.slice(0, 120)}`,
  );

  await gotoRoute("/app/master/kontak", 1100);
  // Fase 38j — kolom kustom dirender di dalam formulir kontak, yang kini
  // berada di Lembar. Yang diuji tetap sama: definisi kolom benar-benar
  // muncul sebagai medan, bukan hanya sebagai baris di daftar definisi.
  await bukaLembar(page, "Tambah kontak");
  const cfKontakAda = await page.locator('[data-testid="field-kustom-kontak"]').count();
  check(
    "F2c kolom kustom benar-benar muncul di form Kontak, bukan hanya di daftar definisi",
    cfKontakAda === 1,
    `→ ${cfKontakAda} blok`,
  );
  const labelCf = await page.locator('label[for="kontak-cf-kode_wilayah"]').count();
  check(
    "F2c label kolom kustom terpasang pada input-nya (bukan kolom tanpa nama)",
    labelCf === 1,
    `→ ${labelCf}`,
  );

  // Kartu Field kustom menjanjikan kolomnya ikut "form, cetakan, dan ekspor".
  // Dua yang terakhir diperiksa di sini — janji di layar yang tidak ditepati
  // lebih buruk daripada fitur yang tidak ada.
  const tombolEkspor = await page.locator('[data-testid="ekspor-kontak.csv"]').count();
  check(
    "F2c tombol ekspor CSV kontak tersedia (kolom kustom ikut di dalamnya)",
    tombolEkspor === 1,
    `→ ${tombolEkspor}`,
  );

  if (process.env.UI_SIM_SHOT) {
    mkdirSync(process.env.UI_SIM_SHOT, { recursive: true });
    await page.screenshot({ path: path.join(process.env.UI_SIM_SHOT, "kustom-form.png") });
  }

  // Bersihkan agar suite selanjutnya (dan jalannya berikutnya) tidak terpengaruh.
  await gotoRoute("/app/pengaturan", 800);
  if (process.env.UI_SIM_SHOT) {
    await page.getByRole("tab", { name: "Perusahaan" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(process.env.UI_SIM_SHOT, "kustom-def.png"), fullPage: true });
  }
  await page.getByRole("tab", { name: "Perusahaan" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Arsipkan field Kode Wilayah" }).click();
  await page.getByRole("button", { name: "Arsipkan field", exact: true }).click();
  await page.waitForTimeout(700);
  const setelahArsip = await page.locator('[data-testid="daftar-field-kustom"]').count();
  check(
    "F2c field kustom terakhir diarsipkan → daftar definisi kosong lagi",
    setelahArsip === 0,
    `→ ${setelahArsip}`,
  );

  // Fase 13i: kartu Penomoran dokumen dengan pratinjau langsung.
  check(
    "F19 Penomoran dokumen: kartu + pratinjau nomor tampil",
    perusahaanBody.includes("Penomoran dokumen") && perusahaanBody.includes("Pratinjau"),
    `→ ${perusahaanBody.includes("Penomoran dokumen")}`,
  );

  // Fase 13g: tab Data & Keamanan menampilkan kartu Keamanan lanjutan
  // (tenant utama berpaket trial = akses penuh → form tampil, bukan upsell).
  await page.getByRole("tab", { name: "Data & Keamanan" }).click();
  await page.waitForTimeout(500);
  const keamananBody = await page.innerText("body");
  check(
    "F19 Keamanan lanjutan: kartu 2FA wajib + pembatasan IP + ekspor audit CSV tampil",
    keamananBody.includes("Keamanan lanjutan") &&
      keamananBody.includes("Wajibkan verifikasi 2 langkah") &&
      keamananBody.includes("Pembatasan IP") &&
      keamananBody.includes("Ekspor audit log (CSV)"),
    `→ ${keamananBody.includes("Keamanan lanjutan")}`,
  );

  // Fase 13h: tab Lainnya menampilkan kartu API & Integrasi (API key + webhook).
  await page.getByRole("tab", { name: "Lainnya" }).click();
  await page.waitForTimeout(500);
  const lainnyaBody = await page.innerText("body");
  check(
    "F19 API & Integrasi: kartu API key + webhook tampil (paket penuh)",
    lainnyaBody.includes("API & Integrasi") &&
      lainnyaBody.includes("API key") &&
      lainnyaBody.includes("Webhook"),
    `→ ${lainnyaBody.includes("API & Integrasi")}`,
  );

  // F35 — Fase 21d: sakelar jurnal penutup tahunan otomatis. Layar baru wajib
  // dwibahasa sejak awal, dan sakelar yang memicu posting jurnal otomatis wajib
  // menjelaskan sendiri apa yang akan terjadi — bukan sekadar kotak centang.
  const sakelarTutup = page.locator('[data-testid="penutup-otomatis"]');
  await sakelarTutup.waitFor({ state: "visible", timeout: 15_000 });
  check(
    "F35a sakelar penutup otomatis tampil di kartu Tutup Buku, bawaan MATI",
    (await sakelarTutup.isChecked()) === false,
    `→ checked=${await sakelarTutup.isChecked()}`,
  );
  check(
    "F35b keterangan sakelar menyebut kapan jalan & apa yang terjadi bila periode terkunci",
    lainnyaBody.includes("Tutup buku tahunan otomatis") &&
      lainnyaBody.includes("31 Desember") &&
      lainnyaBody.includes("log audit"),
    `→ ${lainnyaBody.includes("Tutup buku tahunan otomatis")}`,
  );

  // F35c — temuan pemeriksaan mata Fase 21d: label peristiwa webhook masih
  // Indonesia di mode Inggris. Petanya ada di packages/shared (dipakai apps/api
  // sehingga tetap Indonesia), jadi sisi web wajib memetakan kode→kamus — pola
  // Fase 16t. Diperiksa DI MODE EN, lalu bahasanya dikembalikan.
  await page.locator("aside").getByRole("button", { name: "EN", exact: true }).first().click();
  await page.waitForTimeout(700);
  const lainnyaEn = await page.innerText("body");
  check(
    "F35c label peristiwa webhook ikut EN, tanpa sisa Indonesia",
    lainnyaEn.includes("Sales invoice created") &&
      lainnyaEn.includes("Payment received") &&
      !lainnyaEn.includes("Faktur penjualan dibuat"),
    `→ EN=${lainnyaEn.includes("Sales invoice created")} sisaID=${lainnyaEn.includes("Faktur penjualan dibuat")}`,
  );
  await page.locator("aside").getByRole("button", { name: "ID", exact: true }).first().click();
  await page.waitForTimeout(700);

  await gotoRoute("/app/hr/penggajian", 900);
  // Subjeknya TIDAK berubah: tab Karyawan tetap yang tampil lebih dulu. Yang
  // berubah hanya buktinya — dulu ditandai medan #emp-name yang selalu
  // terpasang; sejak Fase 38t medan itu hidup di dalam Lembar, jadi yang
  // ditunjuk adalah tombol yang membukanya.
  check(
    "F19 Penggajian bertab: default tab Karyawan (aksi 'Tambah karyawan')",
    (await page.getByRole("button", { name: "Tambah karyawan" }).count()) === 1,
  );
  await bukaLembar(page, "Tambah karyawan");
  check("F19 Lembar karyawan memuat medan #emp-name", (await page.locator("#emp-name").count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.getByRole("tab", { name: "Kasbon" }).click();
  await page.waitForTimeout(400);
  check("F19 tab Kasbon menampilkan kartu pinjaman karyawan", (await page.innerText("body")).includes("Kasbon / pinjaman karyawan"));

  // F55 — Fase 43a: THR. Yang diperiksa bukan sekadar "tabnya ada", melainkan
  // bahwa pratinjaunya benar-benar menghitung: karyawan tenant ini dibuat tanpa
  // tanggal masuk, jadi layarnya WAJIB mengatakan itu alih-alih diam-diam
  // menampilkan nol seolah-olah mereka sudah dihitung dan tidak berhak.
  await page.getByRole("tab", { name: "THR" }).click();
  await page.waitForTimeout(600);
  const thrBody = await page.innerText("body");
  check("F55 tab THR memuat formulir bayar & pratinjau", thrBody.includes("Bayar THR") && thrBody.includes("Pratinjau THR"));
  check(
    "F55 THR menyebut dasar hukumnya (7 hari sebelum hari raya), bukan sekadar 'tunjangan'",
    thrBody.includes("7 hari sebelum hari raya"),
  );
  check(
    "F55 karyawan tanpa tanggal masuk ditandai, bukan diam-diam dihitung nol",
    thrBody.includes("Tanggal masuk kosong"),
  );
  const thrRaya = await page.locator("#thr-raya option").allInnerTexts();
  check(
    "F55 pilihan hari raya memakai nama yang dibaca orang, bukan nilai enum",
    thrRaya.includes("Idulfitri") && thrRaya.includes("Natal") && !thrRaya.includes("idulfitri"),
    `→ ${JSON.stringify(thrRaya)}`,
  );
  check("F55 alur THR bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F56 — Fase 43b: lembur berumus. Yang diperiksa adalah bahwa layarnya
  // meminta JAM dan JENIS HARI, bukan rupiah: begitu ia meminta rupiah, rumus
  // peraturannya kembali hidup di kepala pengetiknya.
  await page.getByRole("tab", { name: "Komponen" }).click();
  await page.waitForTimeout(600);
  const lemburBody = await page.innerText("body");
  check("F56 kartu lembur muncul di tab Komponen", lemburBody.includes("Lembur"));
  check(
    "F56 lembur meminta jam & jenis hari, bukan rupiah yang diketik tangan",
    (await page.locator("#ot-jam").count()) === 1 && (await page.locator("#ot-jenis").count()) === 1,
  );
  const jenisHari = await page.locator("#ot-jenis option").allInnerTexts();
  check(
    "F56 ketiga jenis hari PP 35/2021 tersedia, termasuk beda pekan 5 & 6 hari",
    jenisHari.length === 3 && jenisHari.some((t) => t.includes("6 hari")) && jenisHari.some((t) => t.includes("5 hari")),
    `→ ${JSON.stringify(jenisHari)}`,
  );
  check(
    "F56 lembur menyebut bahwa upahnya masuk bruto & kena pajak",
    lemburBody.includes("PPh 21") && lemburBody.includes("PP 35/2021"),
  );
  check("F56 alur lembur bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F57 — Fase 44a: komisi sales. Yang diperiksa adalah bahwa layarnya
  // menawarkan DUA keputusan yang menentukan uang: dasarnya (omzet sebelum PPN
  // vs laba kotor) dan pemicunya (saat faktur vs saat pelanggan membayar).
  // Skema komisi tanpa kedua pilihan itu hanyalah satu angka persen, dan itulah
  // bentuk yang membuat perusahaan membayar komisi atas faktur tak tertagih.
  await page.getByRole("tab", { name: "Komisi" }).click();
  await page.waitForTimeout(600);
  const komisiBody = await page.innerText("body");
  check("F57 tab Komisi memuat skema & laporan", komisiBody.includes("Skema komisi") && komisiBody.includes("Laporan komisi"));
  const dasarOpsi = await page.locator("#ks-dasar option").allInnerTexts();
  check(
    "F57 dasar komisi menyebut 'sebelum PPN' secara eksplisit",
    dasarOpsi.some((t) => t.includes("sebelum PPN")) && dasarOpsi.some((t) => t.includes("Laba kotor")),
    `→ ${JSON.stringify(dasarOpsi)}`,
  );
  const pemicuOpsi = await page.locator("#ks-pemicu option").allInnerTexts();
  check(
    "F57 pemicu komisi bisa menunggu pelanggan membayar, bukan hanya saat faktur",
    pemicuOpsi.length === 2 && pemicuOpsi.some((t) => t.includes("membayar")),
    `→ ${JSON.stringify(pemicuOpsi)}`,
  );
  const pemicuBaku = await page.locator("#ks-pemicu").inputValue();
  check(
    "F57 pilihan bakunya 'pelunasan' — yang aman, bukan yang optimistis",
    pemicuBaku === "pelunasan",
    `→ ${pemicuBaku}`,
  );
  check("F57 alur komisi bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F58 — Fase 44b: target & prakiraan. Yang diperiksa adalah bahwa layarnya
  // MENUNJUKKAN DASAR prakiraannya — peluang tiap tahap terpampang. Prakiraan
  // yang hanya menampilkan satu angka besar tanpa dasarnya adalah bentuk paling
  // meyakinkan dari angka yang salah.
  await gotoRoute("/app/crm/leads", 1000);
  const targetBody = await page.innerText("body");
  check(
    "F58 kartu target & prakiraan tampil di halaman pipeline",
    targetBody.includes("Target & prakiraan penjualan") && targetBody.includes("Prakiraan dari pipeline"),
  );
  check(
    "F58 peluang tiap tahap terpampang, bukan cuma satu angka prakiraan",
    /\b10%/.test(targetBody) && /\b60%/.test(targetBody),
  );
  check(
    "F58 nilai kotor DAN tertimbang keduanya ditampilkan",
    targetBody.includes("Nilai kotor") && targetBody.includes("Tertimbang"),
  );
  check("F58 medan penetapan target tersedia bagi admin", (await page.locator("#tg-nilai").count()) === 1);
  check("F58 alur target bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F59 — Fase 45: kontrak bereskalasi & adendum. Yang diperiksa adalah bahwa
  // formulirnya menawarkan kenaikan tahunan dan perpanjangan otomatis, dan
  // bahwa jejak perubahan bisa dibuka dari daftarnya. Kontrak yang berubah
  // tanpa jejak tidak bisa dipertanggungjawabkan saat pelanggan bertanya.
  await gotoRoute("/app/kontrak", 900);
  const ktrBody = await page.innerText("body");
  check("F59 formulir kontrak menawarkan kenaikan tahunan", (await page.locator("#ct-eskalasi").count()) === 1);
  check("F59 formulir kontrak menawarkan perpanjangan otomatis", (await page.locator("#ct-autorenew").count()) === 1);
  check(
    "F59 daftar kontrak memberi jalan membuka jejak adendum",
    /Adendum \(\d+\)/.test(ktrBody),
    `→ ${ktrBody.includes("Adendum")}`,
  );
  check("F59 alur kontrak bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F60 — Fase 46: PPh 22. Yang diperiksa adalah bahwa layarnya MENGATAKAN
  // pungutan ini kredit pajak dan bukan beban. Salah mencatatnya membuat
  // perusahaan membayar pajaknya dua kali, dan aplikasi yang diam soal itu
  // ikut menyebabkannya.
  await gotoRoute("/app/keuangan/pajak", 900);
  await page.getByRole("button", { name: "PPh 22", exact: true }).click();
  await page.waitForTimeout(600);
  const p22Body = await page.innerText("body");
  check(
    "F60 layar PPh 22 menegaskan ini kredit pajak, BUKAN beban",
    p22Body.includes("kredit pajak") && p22Body.includes("bukan beban"),
  );
  check("F60 formulir bukti pungut tersedia", (await page.locator("#p22-objek").count()) === 1);
  const p22Objek = await page.locator("#p22-objek option").allInnerTexts();
  check(
    "F60 objek impor dibedakan punya API dan tanpa API",
    p22Objek.some((t) => t.includes("punya API")) && p22Objek.some((t) => t.includes("tanpa API")),
    `→ ${JSON.stringify(p22Objek)}`,
  );
  check("F60 alur PPh 22 bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F61 — Fase 47: pesangon. Yang diperiksa adalah bahwa layarnya menawarkan
  // ALASAN berakhirnya hubungan kerja, bukan satu tombol hitung. Pengali per
  // alasan itulah yang paling sering diabaikan, dan layar tanpa pilihan alasan
  // memastikan ia diabaikan.
  await gotoRoute("/app/hr/penggajian", 900);
  await page.getByRole("tab", { name: "Pesangon" }).click();
  await page.waitForTimeout(600);
  const psgBody = await page.innerText("body");
  check("F61 tab Pesangon menyebut dasar hukumnya", psgBody.includes("PP 35/2021"));
  const psgAlasan = await page.locator("#psg-alasan option").allInnerTexts();
  check(
    "F61 alasan PHK ditawarkan lengkap, termasuk pensiun & mengundurkan diri",
    psgAlasan.length >= 8 &&
      psgAlasan.some((t) => t.includes("pensiun")) &&
      psgAlasan.some((t) => t.includes("Mengundurkan diri")),
    `→ ${psgAlasan.length}`,
  );
  check(
    "F61 layar mengatakan uang pisah diatur perjanjian, bukan dikarang aplikasi",
    psgBody.includes("diatur perjanjian kerja"),
  );
  // Medan tanggal masuk baru ada sejak fase ini: sebelumnya hanya bisa diisi
  // lewat API, padahal THR dan pesangon sama-sama membutuhkannya.
  await page.getByRole("tab", { name: "Karyawan" }).click();
  await page.waitForTimeout(400);
  await bukaLembar(page, "Tambah karyawan");
  check("F61 formulir karyawan kini punya medan tanggal masuk", (await page.locator("#emp-join").count()) === 1);
  check("F61 formulir karyawan kini punya status PKWT/PKWTT", (await page.locator("#emp-tipe").count()) === 1);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("F61 alur pesangon bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F62 — Fase 48b: dropship. Yang diperiksa adalah bahwa medan HARGA POKOK
  // baru muncul setelah dropship dicentang. Tanpa harga pokok, HPP-nya nol dan
  // penjualan itu terlihat berlaba 100% — angka yang meyakinkan dan salah.
  await gotoRoute("/app/penjualan", 900);
  // Editor faktur hidup di dalam Lembar sejak Fase 38t — isinya baru ada di DOM
  // setelah lembarnya dibuka.
  await bukaLembar(page, "Faktur penjualan baru");
  check("F62 penanda dropship tersedia di faktur penjualan", (await page.locator("#doc-dropship").count()) === 1);
  check(
    "F62 medan harga pokok BELUM tampil sebelum dropship dicentang",
    (await page.locator('[aria-label="Harga pokok baris 1"]').count()) === 0,
  );
  await page.locator("#doc-dropship").check();
  await page.waitForTimeout(400);
  check(
    "F62 medan harga pokok muncul setelah dropship dicentang",
    (await page.locator('[aria-label="Harga pokok baris 1"]').count()) === 1,
  );
  await page.locator("#doc-dropship").uncheck();
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("F62 alur dropship bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  await gotoRoute("/app/alat", 700);
  const alatBody = await page.innerText("body");
  check("F19 kalkulator render (HPP + hasil Rupiah)", alatBody.includes("Harga Pokok Produksi") && /Rp\s?[1-9]/.test(alatBody.replace(/\u00A0/g, " ")));
  await page.getByRole("tab", { name: "PPh 21 (TER)" }).click();
  await page.waitForTimeout(400);
  check("F19 kalkulator PPh 21 TER menampilkan tarif efektif", (await page.innerText("body")).includes("Tarif efektif"));
  check("F19 alur Fase 10g bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F39 — Fase 22a: revaluasi saldo valas akhir periode.
  //
  // Fitur ini memposting SEPASANG jurnal ke buku besar pemilik, jadi yang
  // diperiksa bukan cuma "tombolnya ada" melainkan bahwa layarnya menyebutkan
  // pembaliknya. Revaluasi yang lupa dibalik adalah kesalahan yang baru
  // ketahuan berbulan-bulan kemudian — pemilik berhak tahu itu ditangani
  // sebelum ia menekan tombolnya.
  await gotoRoute("/app/keuangan/kurs", 1000);
  const kursBody = await page.innerText("body");
  check(
    "F39a kartu revaluasi valas tampil dengan tanggal akhir periode & tombolnya",
    kursBody.includes("Revaluasi saldo valas") &&
      kursBody.includes("Tanggal akhir periode") &&
      (await page.getByRole("button", { name: "Jalankan revaluasi" }).count()) === 1,
    `→ ${kursBody.includes("Revaluasi saldo valas")}`,
  );
  // F40 — Fase 22b: kurs bisa berubah tanpa ada yang mengetik (cron menyegarkan
  // dari sumber luar). Kolom "Terakhir diperbarui" adalah satu-satunya jejak
  // yang dilihat pemilik; tanpa itu masukan akuntansi berubah diam-diam.
  check(
    "F40 daftar kurs punya kolom 'Terakhir diperbarui' berisi tanggal, bukan strip",
    kursBody.includes("Terakhir diperbarui") && /\d{4}-\d{2}-\d{2}/.test(kursBody),
    `→ ada kolom=${kursBody.includes("Terakhir diperbarui")}`,
  );
  check(
    "F39b keterangan menyebut jurnalnya DIBALIK keesokan hari — bukan perubahan permanen",
    kursBody.includes("dibalik keesokan harinya"),
    `→ ${kursBody.slice(kursBody.indexOf("Revaluasi saldo valas"), kursBody.indexOf("Revaluasi saldo valas") + 120)}`,
  );

  // F44 — Fase 22f: proyeksi arus kas 30/60/90 hari.
  //
  // Yang diperiksa adalah RANTAI saldonya, bukan sekadar adanya tabel: proyeksi
  // yang setiap embernya dihitung ulang dari saldo awal (bukan dari ember
  // sebelumnya) akan terlihat sangat wajar — tiga angka positif berurutan —
  // sambil menyembunyikan defisit yang justru dicari pemilik.
  await gotoRoute("/app/keuangan/arus-kas", 1200);
  const pkBody = (await page.innerText("body")).replace(/\u00A0/g, " ");
  check(
    "F44a kartu proyeksi arus kas tampil dengan tabel 30/60/90",
    pkBody.includes("Proyeksi arus kas") && (await page.locator('[data-uji="pk-tabel"] tr').count()) === 3,
    `→ ada kartu=${pkBody.includes("Proyeksi arus kas")} baris=${await page.locator('[data-uji="pk-tabel"] tr').count()}`,
  );
  check(
    "F44b saldo kas sekarang ditampilkan sebagai titik tolak proyeksinya",
    /Rp/.test(await page.locator('[data-uji="pk-saldo-awal"]').innerText().catch(() => "")),
    `→ ${await page.locator('[data-uji="pk-saldo-awal"]').innerText().catch(() => "(tidak ada)")}`,
  );
  // Batas kejujuran fitur ini wajib terlihat: proyeksi mengasumsikan semua
  // tagihan dibayar tepat waktu, dan itu asumsi yang sering meleset.
  check(
    "F44c layar menyatakan asumsinya (dibayar tepat jatuh tempo, hanya satu faktur kontrak berikutnya)",
    /tepat pada tanggal jatuh temponya/.test(
      await page.locator('[data-uji="pk-asumsi"]').innerText().catch(() => ""),
    ),
    `→ ${await page.locator('[data-uji="pk-asumsi"]').innerText().catch(() => "(tidak ada)")}`,
  );

  // F45 — Fase 23a: harga bertingkat per grup pelanggan.
  //
  // Yang diuji di sini adalah hal yang TIDAK bisa dijangkau smoke: apakah
  // angkanya benar-benar sampai ke kotak isian faktur, apakah asalnya terlihat,
  // dan — yang paling penting — apakah harga yang sudah diketik manual selamat
  // ketika pelanggannya diganti. Yang terakhir itu kehilangan data yang tak
  // meninggalkan jejak apa pun bila salah.
  resetErrors();
  await gotoRoute("/app/master/grup-harga", 1000);
  await bukaLembar(page, "Grup baru");
  await page.locator("#gh-nama").fill("Grosir UI");
  await page.getByRole("button", { name: "Tambah grup" }).click();
  await page.waitForTimeout(900);

  await page.getByPlaceholder("Cari produk…").first().fill("KOPI-250");
  await page.waitForTimeout(800);
  await page.locator("div.absolute.z-30 button").first().click();
  await page.waitForTimeout(300);
  await page.locator("#gh-harga").fill("90000");
  await page.getByRole("button", { name: "Simpan harga" }).click();
  await page.waitForTimeout(1000);
  check(
    "F45a grup harga dibuat & harga khususnya tersimpan di daftar",
    (await page.locator('[data-testid="gh-harga-khusus"]').count()) === 1 &&
      /90/.test(await page.locator('[data-testid="gh-harga-khusus"]').first().innerText()),
    `→ ${await page.locator('[data-testid="gh-harga-khusus"]').first().innerText().catch(() => "(tidak ada)")}`,
  );

  // Pelanggan baru yang bergrup — dibuat lewat layar Kontak supaya jalur
  // penyimpanan `priceGroupId` dari form ikut teruji, bukan cuma API-nya.
  await gotoRoute("/app/master/kontak", 1100);
  await bukaLembar(page, "Tambah kontak");
  await page.locator("#k-name").fill("Toko Grosir UI");
  await page.locator("#k-price-group").selectOption({ label: "Grosir UI" });
  await page.getByRole("button", { name: "Tambah", exact: true }).first().click();
  await page.waitForTimeout(1200);
  // Pembanding tanpa grup, dibuat di sini juga: data smoke dan data ui-sim
  // adalah dua database berbeda, jadi kontak milik blok smoke 11n5 tidak ada
  // di sini.
  await page.locator("#k-name").fill("Pembeli Ecer UI");
  await page.locator("#k-price-group").selectOption({ label: "Tanpa grup (harga dasar)" });
  await page.getByRole("button", { name: "Tambah", exact: true }).first().click();
  await page.waitForTimeout(1200);

  await gotoRoute("/app/penjualan", 1100);
  await bukaLembar(page, "Faktur penjualan baru");
  await page.getByPlaceholder("Cari pelanggan…").first().fill("Toko Grosir UI");
  await page.waitForTimeout(800);
  await page.locator("div.absolute.z-30 button").first().click();
  await page.waitForTimeout(500);
  await page.getByPlaceholder("Cari produk (SKU/nama)…").first().fill("KOPI-250");
  await page.waitForTimeout(800);
  await page.locator("div.absolute.z-30 button").first().click();
  await page.waitForTimeout(500);
  const hargaBaris0 = page.locator('input[aria-label="Harga baris 1"]').first();
  check(
    "F45b pilih pelanggan bergrup → harga baris terisi harga GRUP (90.000), bukan harga dasar (85.000)",
    (await hargaBaris0.inputValue()) === "90000" &&
      (await page.locator('[data-testid="harga-grup-0"]').count()) === 1,
    `→ harga=${await hargaBaris0.inputValue()} lencana=${await page.locator('[data-testid="harga-grup-0"]').count()}`,
  );

  // Harga nego diketik manual, lalu pelanggan diganti ke yang TIDAK bergrup.
  // Harga yang diketik harus selamat; kalau tertimpa, kesepakatan dengan
  // pelanggan hilang tanpa ada yang tahu.
  await hargaBaris0.fill("77777");
  await page.waitForTimeout(300);
  await page.locator("#doc-contact").fill("Pembeli Ecer UI");
  await page.waitForTimeout(900);
  await page.locator("div.absolute.z-30 button").first().click();
  await page.waitForTimeout(900);
  check(
    "F45c ganti pelanggan TIDAK menimpa harga yang sudah diketik manual",
    (await hargaBaris0.inputValue()) === "77777",
    `→ ${await hargaBaris0.inputValue()}`,
  );
  check("F45 alur harga bertingkat bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F46 — Fase 23b: harga bertingkat menyebar ke kasir, pesanan penjualan,
  // penawaran, dan kontrak.
  //
  // Seluruh data yang dipakai di sini dibuat oleh F45 di alur ui-sim ini juga
  // (grup "Grosir UI", KOPI-250 @ 90.000, pelanggan "Toko Grosir UI") — BUKAN
  // oleh blok smoke. Pelajaran 23a: smoke dan ui-sim memakai database berbeda,
  // dan cek yang mengacu data smoke mati karena timeout sambil terbaca seperti
  // penjaga yang bekerja.
  resetErrors();
  await gotoRoute("/app/pos", 1200);
  if (await page.locator("#pos-opening").isVisible().catch(() => false)) {
    const whUtama46 = await page.locator("#pos-wh option", { hasText: "Utama" }).first().getAttribute("value");
    if (whUtama46) await page.selectOption("#pos-wh", whUtama46);
    await page.fill("#pos-opening", "500000");
    const shiftPost46 = postDone("/pos/shift/open");
    await page.getByRole("button", { name: "Buka Shift" }).click();
    await shiftPost46;
  }

  // Sinyal siap yang BENAR adalah respons permintaan daftar harganya, bukan
  // lencana: lencana dirender dari state yang di-set oleh respons yang sama,
  // tetapi menunggu elemen membuat ceknya bergantung pada urutan render.
  // Menunggu jaringan membuatnya bergantung pada sebab, bukan akibat.
  const hargaGrupTiba = pageGet("/price-groups/");
  await page.selectOption("#pos-grup", { label: "Grosir UI" });
  await hargaGrupTiba;
  await page.getByTestId("pos-grup-aktif").waitFor({ timeout: 15_000 });
  await page.getByPlaceholder("Cari produk / SKU…").fill("Kopi Arabika");
  await page.waitForTimeout(600);
  check(
    "F46a kartu produk kasir menampilkan harga GRUP (90.000), bukan harga dasar (85.000)",
    /90\.000/.test(await page.getByTestId("pos-harga-KOPI-250").first().innerText().catch(() => "")),
    `→ ${await page.getByTestId("pos-harga-KOPI-250").first().innerText().catch(() => "(tidak ada)")}`,
  );

  await page.getByTestId("pos-harga-KOPI-250").first().click();
  await page.waitForTimeout(500);
  const barisKeranjang46 = page.getByTestId("keranjang-baris").filter({ hasText: "Kopi Arabika Gayo" });
  check(
    "F46b item masuk keranjang pada harga grup",
    /90\.000/.test(await barisKeranjang46.first().innerText().catch(() => "")),
    `→ ${await barisKeranjang46.first().innerText().catch(() => "(kosong)")}`,
  );

  // Turunkan lagi ke tanpa grup → SELURUH keranjang dihitung ulang. Aman karena
  // harga satuan tidak bisa diketik manual di kasir.
  await page.selectOption("#pos-grup", "");
  await page.getByTestId("pos-grup-aktif").waitFor({ state: "detached", timeout: 15_000 });
  check(
    "F46c kembali ke tanpa grup menghitung ulang keranjang ke harga dasar (85.000)",
    /85\.000/.test(await barisKeranjang46.first().innerText()),
    `→ ${await barisKeranjang46.first().innerText().catch(() => "(kosong)")}`,
  );

  // Transaksi ditahan dipanggil lagi TIDAK dihitung ulang: harga saat ditahan
  // adalah harga yang sudah disebutkan ke pelanggan.
  const hargaGrupTiba2 = pageGet("/price-groups/");
  await page.selectOption("#pos-grup", { label: "Grosir UI" });
  await hargaGrupTiba2;
  await page.getByTestId("pos-grup-aktif").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(400);
  const holdPost46 = postDone("/pos/held");
  await page.getByRole("button", { name: "Tahan", exact: true }).click();
  await holdPost46;
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Panggil" }).first().click();
  await page.waitForTimeout(1000);
  check(
    "F46d transaksi ditahan dipanggil lagi TETAP pada harga saat ditahan, dan grupnya direset",
    /90\.000/.test(await barisKeranjang46.first().innerText()) &&
      (await page.locator("#pos-grup").inputValue()) === "",
    `→ baris=${await barisKeranjang46.first().innerText().catch(() => "(kosong)")} grup=${await page.locator("#pos-grup").inputValue()}`,
  );

  // Selesaikan transaksi → grup kembali ke bawaan. Kasir yang lupa menurunkan
  // mode grosir akan menjual sehari penuh di bawah harga.
  const hargaGrupTiba3 = pageGet("/price-groups/");
  await page.selectOption("#pos-grup", { label: "Grosir UI" });
  await hargaGrupTiba3;
  await page.getByTestId("pos-grup-aktif").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: "+ Tunai" }).click();
  await page.getByLabel("Nominal Tunai").fill("10000000");
  const salePost46 = postDone("/pos/sales");
  await page.getByRole("button", { name: "Bayar & Cetak Struk" }).click();
  await salePost46;
  await page.waitForTimeout(900);
  check(
    "F46e grup harga direset ke bawaan setelah transaksi selesai",
    (await page.locator("#pos-grup").inputValue()) === "",
    `→ ${await page.locator("#pos-grup").inputValue()}`,
  );

  // Penawaran (CRM): pilih pelanggan bergrup → lencana + harga grup.
  await gotoRoute("/app/crm/penawaran", 1500);
  // Fase 38t: editor penawaran keluar dari halaman, masuk ke Lembar.
  await bukaLembar(page, "Penawaran baru");
  await page.locator("#q-contact").waitFor({ timeout: 15_000 });
  const hargaGrupTiba4 = pageGet("/price-groups/");
  await page.selectOption("#q-contact", { label: "Toko Grosir UI" });
  await hargaGrupTiba4;
  await page.getByTestId("quo-grup-aktif").waitFor({ timeout: 15_000 });
  await page.locator('select[aria-label="Produk baris 1"]').first().waitFor({ timeout: 15_000 });
  await page.locator('select[aria-label="Produk baris 1"]').first().selectOption({ label: "KOPI-250 · Kopi Arabika Gayo 250g" });
  await page.waitForTimeout(500);
  check(
    "F46f penawaran untuk pelanggan bergrup memakai harga grup + lencana tampil",
    (await page.getByTestId("quo-grup-aktif").count()) === 1 &&
      (await page.locator('input[aria-label="Harga baris 1"]').first().inputValue()) === "90000",
    `→ lencana=${await page.getByTestId("quo-grup-aktif").count()} harga=${await page.locator('input[aria-label="Harga baris 1"]').first().inputValue()}`,
  );
  check("F46 alur 23b bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // F43 — Fase 22e: kalender pajak Indonesia.
  //
  // Yang diperiksa adalah PENYARINGAN, bukan tanggalnya (itu ditutup uji unit):
  // perusahaan demo bukan PKP, jadi SPT Masa PPN tidak boleh muncul. Kalender
  // yang memuat kewajiban asing melatih orang mengabaikan seluruh isinya.
  await gotoRoute("/app/keuangan/pajak", 1000);
  await page.getByRole("button", { name: "Kalender pajak" }).click();
  await page.waitForTimeout(700);
  const kpBody = (await page.innerText("body")).replace(/\u00A0/g, " ");
  check(
    "F43a tab kalender pajak menampilkan profil & daftar tenggat",
    kpBody.includes("Profil pajak perusahaan") &&
      (await page.locator('[data-uji="kp-profil"]').count()) === 1,
    `→ ada profil=${kpBody.includes("Profil pajak perusahaan")}`,
  );
  // Diperiksa DI DALAM tabel kalender, bukan di seluruh badan halaman: halaman
  // Pajak punya tab bernama "SPT Masa PPN", jadi asersi se-halaman akan merah
  // karena LABEL TAB — bukan karena isi kalendernya. Kelas kesalahan yang sama
  // dengan Fase 16e: penanda yang menyentuh sesuatu selain yang dimaksud.
  const kpTabel = await page.locator('[data-uji="kp-tabel"]').innerText().catch(() => "");
  check(
    "F43b perusahaan demo BUKAN PKP → SPT Masa PPN tidak muncul di TABEL kalendernya",
    kpTabel.length > 0 && !kpTabel.includes("SPT Masa PPN"),
    `→ isi tabel: ${kpTabel.slice(0, 160)}`,
  );
  check(
    "F43c 'punya karyawan' dinyatakan dibaca dari data, bukan disetel manual",
    /dibaca dari data karyawan|Terdeteksi punya karyawan/.test(
      await page.locator('[data-uji="kp-karyawan"]').innerText().catch(() => ""),
    ),
    `→ ${await page.locator('[data-uji="kp-karyawan"]').innerText().catch(() => "(tidak ada)")}`,
  );
  // Batas kejujuran fitur ini WAJIB terlihat pemilik: tenggat yang ditampilkan
  // bisa lebih lambat dari yang tertera kalau ada libur nasional. Menyembunyikan
  // itu berarti menjanjikan ketepatan yang tidak dimiliki.
  // F43e — ditemukan pemeriksaan mata: versi pertama membuka daftar dengan 14
  // baris "Terlambat" berturut-turut, karena perusahaan demo belum pernah
  // melapor. Daftar pengingat yang dibuka dengan tembok tunggakan melatih orang
  // mengabaikannya — kerusakan yang justru ingin dicegah fitur ini.
  const kpBarisPertama = (await page.locator('[data-uji="kp-tabel"] tbody tr').first().innerText().catch(() => "")).replace(/\u00A0/g, " ");
  check(
    "F43e baris teratas kalender BUKAN tunggakan — yang belum lewat didahulukan",
    kpBarisPertama.length > 0 && !/Terlambat/.test(kpBarisPertama),
    `→ baris pertama: ${kpBarisPertama.replace(/\s+/g, " ").slice(0, 120)}`,
  );
  check(
    "F43d layar menyatakan hari libur nasional belum diperhitungkan",
    /libur nasional/.test(await page.locator('[data-uji="kp-catatan-libur"]').innerText().catch(() => "")),
    `→ ${await page.locator('[data-uji="kp-catatan-libur"]').innerText().catch(() => "(tidak ada)")}`,
  );

  // F42 — Fase 22d: penyusutan fiskal vs komersial.
  //
  // Yang diperiksa bukan "kartunya ada" melainkan bahwa kedua angkanya BERBEDA.
  // Laporan rekonsiliasi yang menampilkan fiskal == komersial berarti kelompok
  // harta pajaknya tidak dipakai sama sekali — dan itu keadaan yang terlihat
  // persis seperti fitur yang bekerja.
  await gotoRoute("/app/keuangan/aset", 1200);
  const asetBody = (await page.innerText("body")).replace(/\u00A0/g, " ");
  check(
    "F42a kartu penyusutan fiskal vs komersial tampil dengan ketiga angkanya",
    asetBody.includes("Penyusutan fiskal vs komersial") &&
      (await page.locator('[data-uji="fiskal-ringkas"]').count()) === 1,
    `→ ada kartu=${asetBody.includes("Penyusutan fiskal vs komersial")}`,
  );
  const nKomersial = await page.locator('[data-uji="fiskal-komersial"]').innerText().catch(() => "");
  const nFiskal = await page.locator('[data-uji="fiskal-fiskal"]').innerText().catch(() => "");
  check(
    "F42b angka fiskal BERBEDA dari komersial — kelompok harta pajak benar-benar dipakai",
    nKomersial.trim() !== "" && nFiskal.trim() !== "" && nKomersial !== nFiskal,
    `→ komersial=${nKomersial} fiskal=${nFiskal}`,
  );
  check(
    "F42c layar menyatakan angka fiskal TIDAK dijurnal — pemilik tak boleh mengira bukunya ikut berubah",
    asetBody.includes("tidak pernah dijurnal"),
    `→ ${asetBody.includes("tidak pernah dijurnal")}`,
  );
  // F42e — ditemukan pemeriksaan mata: baris aset menulis "Rp 944.444/bln"
  // untuk aset saldo menurun, padahal angka itu mengecil tiap bulan. Tanpa
  // penanda, "/bln" terbaca sebagai janji angsuran tetap.
  check(
    "F42e baris aset saldo menurun menandai bahwa angkanya angsuran BERIKUTNYA, bukan tetap",
    /saldo menurun/i.test(asetBody) && /angsuran berikutnya/i.test(asetBody),
    `→ ${asetBody.slice(asetBody.indexOf("Genset"), asetBody.indexOf("Genset") + 200)}`,
  );
  check(
    "F42d form aset menawarkan metode saldo menurun & kelompok harta",
    (await page.locator("#as-metode option").allInnerTexts()).some((t) => /Saldo menurun/.test(t)) &&
      (await page.locator("#as-kelompok option").allInnerTexts()).some((t) => /Kelompok 1/.test(t)),
    `→ metode=${(await page.locator("#as-metode option").allInnerTexts()).join("|")}`,
  );

  // F41 — Fase 22c: kas kecil sistem dana tetap.
  //
  // Yang diperiksa adalah angka PENGISIAN yang dihitung sistem, bukan sekadar
  // adanya kartu. Seluruh nilai fase ini terletak di situ: kalau jumlahnya
  // diketik manusia, kas kecil cuma akun biasa dan halaman ini tak perlu ada.
  // Seed demo: dana tetap 2.000.000, bon 335.000 + 415.000 → perlu diisi 750.000.
  await gotoRoute("/app/keuangan/kas-bank", 1200);
  const kkBody = (await page.innerText("body")).replace(/\u00A0/g, " ");
  check(
    "F41a kartu kas kecil tampil dengan dana tetap & saldo menurut catatan",
    kkBody.includes("Kas kecil (dana tetap)") && kkBody.includes("Saldo menurut catatan"),
    `→ ada kartu=${kkBody.includes("Kas kecil (dana tetap)")}`,
  );
  const kkPerluDiisi = (await page.locator('[data-uji="kk-kekurangan"]').innerText().catch(() => "")).replace(/\u00A0/g, " ");
  check(
    "F41b jumlah pengisian DIHITUNG sistem (2.000.000 - 1.250.000 terpakai = 750.000)",
    /750\.000/.test(kkPerluDiisi),
    `→ ${kkPerluDiisi}`,
  );
  check(
    "F41c tombol isi ulang membawa angka itu, jadi jumlahnya tak perlu diketik",
    /750\.000/.test(await page.locator('[data-uji="kk-isi-ulang"]').innerText().catch(() => "")),
    `→ ${await page.locator('[data-uji="kk-isi-ulang"]').innerText().catch(() => "(tombol tidak ada)")}`,
  );
  // Pratinjau opname memakai fungsi murni yang sama dengan server, jadi ARAH
  // "kurang"/"lebih" yang terlihat pemilik dijamin sama dengan arah jurnalnya.
  await page.locator("#kk-fisik").fill("1200000");
  await page.waitForTimeout(300);
  check(
    "F41d pratinjau opname menyebut arahnya sebelum apa pun dijurnal (kurang 50.000)",
    /Kurang/.test(await page.locator('[data-uji="kk-pratinjau-selisih"]').innerText().catch(() => "")),
    `→ ${await page.locator('[data-uji="kk-pratinjau-selisih"]').innerText().catch(() => "(tidak ada)")}`,
  );
  await page.locator("#kk-fisik").fill("1300000");
  await page.waitForTimeout(300);
  check(
    "F41e arah pratinjau ikut berbalik saat hitungan melebihi catatan (lebih 50.000)",
    /Lebih/.test(await page.locator('[data-uji="kk-pratinjau-selisih"]').innerText().catch(() => "")),
    `→ ${await page.locator('[data-uji="kk-pratinjau-selisih"]').innerText().catch(() => "(tidak ada)")}`,
  );
  await page.locator("#kk-fisik").fill("");
  // F41f — arah takaran. Ditemukan pemeriksaan mata: bilahnya semula terisi
  // sebesar porsi yang HABIS (38%), padahal kotaknya masih berisi 62%. Ceknya
  // mengunci arah itu supaya tidak diam-diam terbalik lagi. 750.000 / 2.000.000
  // = 37,5% terpakai; `Math.round(37,5)` = 38 (pembulatan ke atas di JS), jadi
  // sisanya 62 — bukan 63.
  check(
    "F41f takaran kas kecil menunjukkan SISA isi kotak (62%), bukan porsi yang habis",
    (await page.locator('[data-uji="kk-takaran"]').getAttribute("aria-valuenow").catch(() => "")) === "62",
    `→ aria-valuenow=${await page.locator('[data-uji="kk-takaran"]').getAttribute("aria-valuenow").catch(() => "(tidak ada)")}`,
  );

  // F15 — landing harga paket tunggal (Fase 30) + masuk mode demo tanpa daftar.
  // Dijalankan TERAKHIR karena tombol demo mengganti cookie sesi konteks ini.
  console.log("3. Landing tiga paket & mode demo (Fase 53a)");
  resetErrors();
  await gotoRoute("/", 600);
  const landingText = (await page.innerText("body")).replace(/\u00A0/g, " ");
  check(
    "F53a landing menampilkan ketiga kartu paket",
    (await page.locator('[data-testid^="kartu-paket-"]').count()) === 3,
    `→ ${await page.locator('[data-testid^="kartu-paket-"]').count()} kartu`,
  );
  check(
    "F53a ketiga harga bulanan tampil, bukan hanya harga masuk",
    /Rp\s?750\.000/.test(landingText) &&
      /Rp\s?1\.500\.000/.test(landingText) &&
      /Rp\s?3\.000\.000/.test(landingText),
    `→ ${landingText.match(/Rp\s?[\d.]+/g)?.slice(0, 6).join(" ")}`,
  );
  check(
    "F53a harga tahunan tampil sebagai hemat dua bulan",
    /Rp\s?7\.500\.000/.test(landingText) && /hemat dua bulan/i.test(landingText),
    `→ tahunan tidak lengkap`,
  );
  check(
    "F53a hanya SATU kartu bertanda Paling sesuai",
    (landingText.match(/Paling sesuai/g) ?? []).length === 1,
    `→ ${(landingText.match(/Paling sesuai/g) ?? []).length} penanda`,
  );
  check(
    "F53a landing menyatakan seluruh modul terbuka — argumen jualan tiga paket",
    /[Ss]eluruh modul terbuka/.test(landingText) || /modul terbuka/.test(landingText),
    `→ klaim modul terbuka tidak ditemukan`,
  );
  check(
    "F53a landing menawarkan bantuan migrasi sebagai konsultasi, bukan harga",
    /Pindah dari aplikasi lama/i.test(landingText) &&
      /Konsultasi migrasi data/i.test(landingText),
    `→ ajakan migrasi tidak ditemukan`,
  );
  check(
    "F53d kartu paket menyebut kapasitas yang benar-benar ditegakkan",
    /1 badan usaha/.test(landingText) &&
      /2 lokasi, gudang, atau outlet/.test(landingText) &&
      /10 karyawan penggajian termasuk/.test(landingText),
    `→ baris kapasitas tidak lengkap`,
  );
  check(
    "F53d Enterprise menawarkan lokasi tak terbatas + konsolidasi",
    /Lokasi tak terbatas/.test(landingText) && /badan usaha \+ konsolidasi/.test(landingText),
    `→ baris Enterprise tidak lengkap`,
  );
  check(
    "F53d kelebihan karyawan dinyatakan per kepala, bukan lompatan tagihan",
    /per orang per tahun/.test(landingText) && /tanpa lompatan tagihan/.test(landingText),
    `→ catatan kelebihan karyawan tidak ditemukan`,
  );
  check(
    "F53a landing tidak menjual satu pun modul lewat paket",
    !/(tersedia|terbuka) (mulai|hanya) (di )?paket|terkunci di paket/i.test(landingText),
    `→ ada naskah yang menjual modul lewat paket`,
  );
  // Fase 30b — harga muncul di HERO, bukan hanya di seksi harga yang harus
  // digulir dulu. Diuji lewat posisi: teks harga harus ada SEBELUM judul seksi
  // harga di dalam innerText halaman, kalau tidak ia sebenarnya masih di bawah.
  const posHargaPertama = landingText.indexOf("750.000");
  // Fase 35c — judul seksi harga diganti; penanda posisinya ikut menyebut
  // bunyi barunya, bukan dilonggarkan menjadi pencocokan sebagian.
  // Fase 53a — judulnya berganti lagi bersama tiga paket.
  const posSeksiHarga = landingText.search(/Seluruh modul terbuka di ketiganya/);
  check(
    "F30b harga tampil di hero — sebelum seksi harga, bukan sesudahnya",
    posHargaPertama >= 0 && posSeksiHarga >= 0 && posHargaPertama < posSeksiHarga,
    `→ harga@${posHargaPertama} seksi@${posSeksiHarga}`,
  );
  check(
    "F30b hero menyebut per perusahaan, bukan per pengguna",
    /\/bulan\/perusahaan/.test(landingText),
    `→ satuan harga hero tidak ditemukan`,
  );
  // Kesimpulan kalkulator terbaca TANPA menggeser slider — inilah akibat paling
  // langsung dari harga tunggal, dan sebelumnya hanya muncul bila pengunjung
  // kebetulan menggeser ke bawah titik impas.
  check(
    "F30b titik impas dinyatakan terbuka di kalkulator (tanpa menggeser slider)",
    /Mulai \d+ pengguna, ERPindo sudah lebih murah/.test(landingText),
    `→ kalimat titik impas tidak ditemukan`,
  );
  check(
    "F30b landing tidak menyebut kedalaman demo dalam hitungan bulan",
    !/\d+\s*bulan\s+data/i.test(landingText),
    `→ ${(landingText.match(/\d+\s*bulan\s+data/i) ?? [""])[0]}`,
  );
  // Fase 32c: nama asersi ini DIPERBAIKI, bukan cakupannya diubah. Namanya
  // berbunyi "+ perbandingan kategori" padahal badannya tidak pernah memeriksa
  // tabel itu sama sekali — hanya kalkulatornya. Nama yang menjanjikan lebih
  // dari yang diperiksanya lebih berbahaya daripada tidak ada asersi: ia
  // membuat pembaca berikutnya menyangka ada yang menjaga, lalu tenang.
  check(
    "F15 landing memuat kalkulator per-pengguna",
    landingText.includes("per pengguna") && landingText.includes("ERPindo"),
  );
  // F46 — Fase 24d. Trial 30 hari dihapus Fase 24a, tetapi tombol bilah atas
  // masih berbunyi "Coba Gratis" sampai fase ini: ajakan pertama yang dilihat
  // pengunjung menjanjikan sesuatu yang tidak lagi ada di balik tombolnya.
  // Diperiksa dari teks yang benar-benar terender, bukan dari berkas sumber.
  check(
    "F46 landing tidak menjanjikan 'Coba Gratis' (trial dihapus Fase 24a)",
    !/Coba Gratis/i.test(landingText) && !/gratis 30 hari/i.test(landingText),
    `→ ajakan trial masih tampil di landing`,
  );
  // --- F47 (Fase 27a): hierarki ajakan & corong paket -------------------------
  //
  // Sampai fase ini kedua tombol hero memakai `variant="secondary"`, jadi
  // halaman konversi utama tidak punya SATU PUN tombol utama — dua kotak putih
  // identik. Keputusan Fase 24 (demo mendahului daftar) tidak pernah terlihat.
  // Diperiksa dari gaya yang benar-benar terender, bukan dari berkas sumber.
  const heroPrimary = await page
    .locator("section")
    .first()
    .locator("button.bg-brand-600, a.bg-brand-600")
    .count();
  check("F47 hero punya tepat SATU tombol utama", heroPrimary === 1, `→ ${heroPrimary} tombol utama`);
  const heroDemoPrimary = await page
    .locator("section")
    .first()
    .locator("button.bg-brand-600", { hasText: /Lihat Demo/ })
    .count();
  check("F47 tombol utama hero adalah 'Lihat Demo' (bukan daftar)", heroDemoPrimary === 1, `→ ${heroDemoPrimary}`);

  // Pita CTA penutup: kalimatnya menjanjikan "telusuri demo tanpa mendaftar",
  // tetapi tombolnya dulu menuju formulir pendaftaran.
  const pitaDemo = await page.locator("section", { hasText: "Buka demonya" }).getByRole("button", { name: /Lihat Demo/ }).count();
  check("F47 pita CTA penutup menawarkan demo, sesuai kalimatnya", pitaDemo >= 1, `→ ${pitaDemo}`);

  // Fase 30: corong "paket terpilih" DICABUT bersama paket bertingkat. Kartu
  // harga kini menuju /daftar polos, dan halaman daftar tidak lagi menampilkan
  // lencana paket — tidak ada yang bisa dipilih.
  await page.locator('a[href="/daftar"]').first().click();
  await page.waitForURL("**/daftar", { timeout: 15_000 });
  const paketLencana = await page.locator('[data-testid="paket-dipilih"]').count();
  check("F47/30 halaman daftar tidak menampilkan lencana paket", paketLencana === 0, `→ ${paketLencana} lencana`);
  // Parameter sisa dari tautan lama tidak boleh memunculkan galat — URL yang
  // sudah dibagikan/di-bookmark orang tetap harus membuka halaman yang benar.
  // Fase 31e: `?paket=business` dibuang. PLANS menjadi ["lengkap"] sejak Fase A,
  // jadi parameter itu sudah tidak menunjuk apa pun sejak berbulan-bulan lalu.
  await gotoRoute("/daftar", 400);
  const daftarLama = await page.locator("form").count();
  check("F47/30 tautan lama ?paket= tetap membuka formulir daftar tanpa galat", daftarLama >= 1, `→ ${daftarLama} form`);
  await gotoRoute("/", 600);

  // Fase 14e: output "Hemat" di kalkulator per-pengguna (penanda netral-bahasa).
  check(
    "F15 landing: hemat Rp tampil di kalkulator per-pengguna",
    landingText.includes("Hemat sekitar"),
    `→ teks hemat tidak tampil`,
  );

  // F15b — Fase 32c: klaim kompatibilitas DIPINDAHKAN ke /fitur, bukan dihapus.
  //
  // Asersi ini ditulis SEBELUM pita itu dibuang dari landing, dan dijalankan
  // lebih dulu untuk membuktikan isinya benar-benar sudah ada di rumah barunya.
  // Percobaan pertama melakukannya terbalik — membuang dulu, baru memindahkan
  // asersi — dan langsung menemukan bahwa `/fitur` tidak menyebut "Xendit" sama
  // sekali. Satu klaim nyata nyaris hilang dari seluruh situs.
  await gotoRoute("/fitur", 700);
  const teksFitur = await page.innerText("body");
  check(
    "F15b /fitur memuat klaim kompatibilitas Xendit & Coretax",
    teksFitur.includes("Xendit") && teksFitur.includes("Coretax"),
    `→ Xendit=${teksFitur.includes("Xendit")} Coretax=${teksFitur.includes("Coretax")}`,
  );
  await gotoRoute("/", 600);
  // F21 — Fase 17d, DIPINDAHKAN pada 32c.
  //
  // Yang dijaga adalah KELAS cacatnya, bukan satu kisi tertentu: pada kisi yang
  // berbagi garis (`gap-px` di atas latar garis), jumlah sel yang tidak habis
  // dibagi jumlah kolom meninggalkan lubang menganga — dan pada tata letak
  // kartu terpisah yang lama, lubang itu tak terlihat sama sekali.
  //
  // Kisi 11 modul di landing sudah dibuang (isinya ada di /fitur yang jauh
  // lebih lengkap). Kisi integrasi di /fitur berisi 6 butir pada 3 kolom, jadi
  // cacat yang sama bisa muncul di sana bila butir ke-7 ditambahkan kelak.
  await gotoRoute("/fitur", 700);
  const selIntegrasi = await page.locator('[data-kisi="integrasi"] > *').count();
  check(
    "F21 kisi integrasi /fitur terisi penuh (kelipatan 3 kolom, tanpa sel kosong)",
    selIntegrasi > 0 && selIntegrasi % 3 === 0,
    `→ ${selIntegrasi} sel`,
  );
  await gotoRoute("/", 600);

  // F22 — Fase 17e. Gambar produk di landing adalah aset ter-commit yang
  // dihasilkan skrip terpisah (`screenshots.mjs`). Skrip itu diam-diam rusak
  // sejak Fase 13b, jadi gambarnya tertinggal belasan fase tanpa ada yang
  // berbunyi. Cek ini tidak bisa tahu gambarnya BASI, tapi bisa memastikan
  // berkasnya benar-benar ada dan termuat — kegagalan paling kasarnya.
  // Fase 35a — hero tidak lagi memuat gambar; ia memuat PERAGAAN.
  //
  // Penjaganya tidak dihapus, melainkan diarahkan ke hal yang sekarang memikul
  // bukti — dan hasilnya justru lebih kuat daripada yang lama. Cek lama hanya
  // memastikan sebuah berkas gambar termuat; cek ini memastikan jurnal yang
  // diperagakan benar-benar SEIMBANG. Angka karangan di layar pertama akan
  // langsung terlihat oleh pembeli yang paham pembukuan.
  const peragaan = (await page.innerText("body")).replace(/\u00A0/g, " ");
  const adaPeragaan =
    peragaan.includes("Faktur penjualan baru") &&
    peragaan.includes("Piutang Usaha") &&
    peragaan.includes("Debit = Kredit");
  // 1.665.000 + 900.000 = 2.565.000 = 1.500.000 + 165.000 + 900.000
  const angkaSeimbang = peragaan.includes("2.565.000") && peragaan.includes("1.665.000");
  check(
    "F22 peragaan hero tampil dan jurnalnya seimbang",
    adaPeragaan && angkaSeimbang,
    `→ peragaan=${adaPeragaan} seimbang=${angkaSeimbang}`,
  );

  // --- F49 Peragaan (Fase 38b) ---------------------------------------------
  //
  // Tangkapan layar produk diganti peragaan beranimasi. Empat asersi di bawah
  // menjaga sifat yang membuat penggantian itu layak — dan tiap satunya ada
  // karena kegagalannya akan SENYAP.

  // Beranda kini memikul buktinya lewat peragaan, bukan berkas gambar. Bila
  // salah satu hilang, halaman kehilangan pembuktiannya tanpa galat apa pun.
  const jumlahPeragaan = await page.locator("[data-peragaan]").count();
  check(
    "F49a beranda memuat peragaan hero + lima peragaan showcase",
    jumlahPeragaan >= 2,
    `→ ${jumlahPeragaan} peragaan`,
  );

  // Nol gambar produk. Ini yang membuat 3,9 MB bisa dihapus, dan yang menjaga
  // agar tangkapan layar tidak menyelinap kembali satu per satu.
  const gambarLanding = await page.locator("main img, section img").count();
  check("F49a beranda tidak memuat satu pun berkas gambar produk", gambarLanding === 0, `→ ${gambarLanding} <img>`);

  // Peragaan adalah gambar yang bergerak, bukan antarmuka. Kontrol palsu yang
  // bisa ditekan Tab tetapi tidak melakukan apa pun adalah jebakan bagi
  // pengguna papan tik — dan tombol "Posting" di dalamnya terlihat persis
  // seperti tombol sungguhan.
  // Fase 38f — selektornya dipersempit ke `[data-bingkai]`, yaitu permukaan
  // PERAGA-nya saja. Yang dilarang adalah kontrol PALSU: tombol yang terlihat
  // seperti tombol sungguhan, bisa ditekan Tab, dan tidak melakukan apa pun.
  //
  // Tombol "Putar ulang" di kaki peragaan panduan bukan kontrol palsu — ia
  // benar-benar memutar ulang. Melarangnya berarti memakai asersi ini untuk
  // hal yang bukan maksudnya.
  const fokusDalamPeragaan = await page
    .locator('[data-bingkai] :is(a, button, input, select, textarea, [tabindex]:not([tabindex="-1"]))')
    .count();
  check(
    "F49e bingkai peraga tidak memuat satu pun kontrol palsu yang bisa difokus",
    fokusDalamPeragaan === 0,
    `→ ${fokusDalamPeragaan} elemen fokus`,
  );

  // Seluruh isi ada di DOM sejak bingkai pertama; animasi hanya menyingkapnya.
  // Diperiksa dengan membaca teks peragaan showcase yang BELUM digulir ke
  // layar — bila isinya baru ditulis saat animasinya berjalan, pembaca layar
  // dan perayap tidak akan pernah mendapatkannya.
  // Fase 40b: kalimat langkah disederhanakan ("Jurnalnya terbentuk sendiri,
  // dan debit sama dengan kredit") supaya pembaca yang bukan akuntan tetap
  // memahaminya. Istilah "double-entry" tetap ada di FAQ, /fitur, dan JSON-LD;
  // yang berubah hanya narasi langkah yang dipindai sekilas.
  const narasiTersedia = peragaan.includes("Jurnalnya terbentuk sendiri");
  check(
    "F49b narasi langkah terbaca tanpa menunggu animasi selesai",
    narasiTersedia,
    `→ narasi ${narasiTersedia ? "ada" : "belum ada"}`,
  );

  // F29 — Fase 18f: halaman /fitur (penjelasan mendalam per modul).
  // Diperiksa dari SISI PENGUNJUNG: benar-benar bisa dicapai lewat tautan di
  // landing (bukan hanya lewat URL yang diketik), memuat modul-modul kunci,
  // dan bebas galat. Menguji lewat tautan penting karena rute yang ada tetapi
  // tak tertaut dari mana pun sama saja tidak ada bagi pengunjung.
  await page.locator('a[href="/fitur"]').first().click();
  await page.waitForURL("**/fitur", { timeout: 15_000 });
  await page.waitForTimeout(900);
  const fiturText = await page.innerText("body");
  const modulKunci = ["Akuntansi & Jurnal", "Kasir (POS)", "Stok & Gudang", "Gaji & PPh 21", "Pajak & e-Faktur"];
  const hilang = modulKunci.filter((m) => !fiturText.includes(m));
  check(
    "F29 halaman /fitur terjangkau dari landing & memuat modul-modul kunci",
    hilang.length === 0 && fiturText.includes("Bagaimana ERPindo mengerjakannya"),
    `→ modul hilang: ${hilang.join(", ") || "tidak ada"}`,
  );
  check("F29 halaman /fitur bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // --- F49 lanjutan: peragaan di /fitur (Fase 38e) --------------------------
  //
  // Dua puluh dua modul, dua puluh dua peragaan, nol berkas gambar. Ini
  // halaman dengan peragaan terbanyak di seluruh situs, jadi ia yang paling
  // mungkin memperlihatkan cacat kinerja maupun cacat tata letak lebih dulu.
  const peragaanFitur = await page.locator("[data-peragaan]").count();
  check(
    "F49a /fitur memuat satu peragaan untuk tiap modul bergambar",
    peragaanFitur >= 20,
    `→ ${peragaanFitur} peragaan`,
  );
  const gambarFitur = await page.locator("main img").count();
  check("F49a /fitur tidak memuat satu pun berkas gambar produk", gambarFitur === 0, `→ ${gambarFitur} <img>`);

  // Antrean global membatasi pemutar aktif menjadi dua, berapa pun yang
  // terlihat. Diuji dengan menggulir ke tengah halaman — tempat paling banyak
  // peragaan berada di dalam layar sekaligus.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1200);
  const berjalan = await page.locator('[data-peragaan] [data-kursor]').count();
  check(
    "F49c /fitur tidak menjalankan lebih dari dua peragaan sekaligus",
    berjalan <= 2,
    `→ ${berjalan} kursor aktif`,
  );

  // Narasi tiap peragaan ada di DOM sejak awal, jadi perayap dan pembaca layar
  // mendapat isi halaman ini tanpa menunggu satu animasi pun selesai.
  const teksNarasiFitur = await page.innerText("body");
  check(
    "F49b narasi peragaan /fitur terbaca tanpa menunggu animasi",
    teksNarasiFitur.includes("Jurnal pembalik terbentuk") || teksNarasiFitur.includes("jurnal pembalik"),
    `→ narasi tidak ditemukan`,
  );
  await page.evaluate(() => window.scrollTo(0, 0));

  // --- F50 Kerangka publik disatukan (Fase 38c) -----------------------------
  //
  // Footer ditulis TIGA kali (landing, /fitur, blog SSR) dan perbedaannya
  // seluruhnya tak disengaja — pengunjung /fitur tidak punya jalan ke blog, ke
  // FAQ, maupun ke pendaftaran dari kaki halaman. Persis pola yang sudah
  // diselesaikan untuk header pada Fase 31c.
  //
  // Diperiksa di /fitur, bukan di beranda: beranda selalu punya footer
  // terlengkap justru karena ia yang disalin. Yang perlu dijaga adalah halaman
  // SALINANNYA.
  const kakiFitur = await page.innerText("footer");
  const tautanKaki = ["Blog", "Panduan", "Masuk", "Daftar"];
  const kakiHilang = tautanKaki.filter((t) => !kakiFitur.includes(t));
  check(
    "F50 kaki halaman /fitur memuat tautan yang sama dengan beranda",
    kakiHilang.length === 0,
    `→ hilang: ${kakiHilang.join(", ") || "tidak ada"}`,
  );

  // GuideHeader punya tombol "Masuk"/"Daftar" yang ditulis harfiah dalam bahasa
  // Indonesia — satu-satunya header publik yang tidak pernah ikut berbahasa
  // Inggris, dan tidak ada yang menyadarinya selama tujuh belas fase.
  await gotoRoute("/panduan", 700);
  const kepalaPanduan = await page.locator("header").first().innerText();
  check(
    "F50 /panduan memakai header publik bersama, bukan header keempat",
    kepalaPanduan.includes("Panduan") && (await page.locator("header [data-wordmark]").count()) === 1,
    `→ ${kepalaPanduan.slice(0, 60)}`,
  );
  const pemilihBahasaPanduan = await page.getByRole("button", { name: "EN", exact: true }).count();
  check(
    "F50 /panduan punya pemilih bahasa (dulu satu-satunya halaman publik tanpa itu)",
    pemilihBahasaPanduan >= 1,
    `→ ${pemilihBahasaPanduan} tombol`,
  );
  check("F50 /panduan punya kaki halaman", (await page.locator("footer").count()) >= 1);

  // --- F49d Peragaan di panduan (Fase 38f) ---------------------------------
  //
  // Panduan mendapat perlakuan yang BERBEDA dari halaman jualan, dan
  // perbedaannya diuji — karena ia yang membuat penggantian tangkapan layar di
  // sini bisa dipertanggungjawabkan.
  await gotoRoute("/panduan/pos", 900);
  const peragaanPanduan = await page.locator("[data-peragaan]").count();
  check("F49d halaman panduan modul memuat peragaan", peragaanPanduan >= 1, `→ ${peragaanPanduan}`);
  const gambarPanduan = await page.locator("main img").count();
  check("F49d panduan tidak memuat satu pun tangkapan layar", gambarPanduan === 0, `→ ${gambarPanduan} <img>`);

  // Daftar langkah TERLIHAT di panduan, bukan tersembunyi bagi mata seperti di
  // halaman jualan. Pembaca panduan memakai langkahnya sebagai instruksi.
  const langkahTampak = await page.locator("[data-peragaan] figcaption ol li").first().isVisible();
  check("F49d langkah peragaan panduan terlihat di layar, bukan hanya bagi pembaca layar", langkahTampak);

  // Peragaan panduan berhenti di keadaan akhir dan menawarkan tombol ulang.
  // Tombol itu kontrol SUNGGUHAN — satu-satunya di seluruh peragaan — dan
  // sengaja berada di luar bingkai peraga supaya F49e tetap berlaku.
  await page.waitForTimeout(9000);
  const tombolUlang = await page.getByRole("button", { name: /Putar ulang/i }).count();
  check(
    "F49d peragaan panduan berhenti dan menawarkan tombol ulang",
    tombolUlang >= 1,
    `→ ${tombolUlang} tombol`,
  );
  check("F49d halaman panduan bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // --- F51 Enam halaman publik (Fase 38d) ----------------------------------
  //
  // Diperiksa dari SISI PENGUNJUNG, mengikuti alasan F29: rute yang ada tetapi
  // tak tertaut dari mana pun sama saja tidak ada. Karena itu `/harga` dicapai
  // lewat klik pada bilah atas, bukan lewat URL yang diketik.
  await gotoRoute("/", 700);
  await page.locator('header a[href="/harga"]').first().click();
  await page.waitForURL("**/harga", { timeout: 15_000 });
  await page.waitForTimeout(700);
  const hargaText = (await page.innerText("body")).replace(/\u00A0/g, " ");
  check(
    "F51 /harga terjangkau dari bilah atas dan memuat harga bulanan paket masuk",
    hargaText.includes("Rp 750.000"),
    `→ harga tidak ditemukan`,
  );
  // 36 × 750.000 = 27.000.000. Diuji karena inilah angka yang diminta bagian
  // pengadaan, dan satu-satunya angka di situs yang dihitung dari perkalian —
  // jadi ia akan salah diam-diam bila harga bulanannya berubah tanpa halaman
  // ini ikut dihitung ulang. Sejak Fase 53a angkanya disisipkan lewat lubang
  // `{0}`, bukan dieja di kamus, jadi cek ini sekaligus membuktikan lubangnya
  // benar-benar terisi.
  check(
    "F51 /harga menyebut biaya kepemilikan tiga tahun yang benar",
    hargaText.includes("27.000.000"),
    `→ biaya 3 tahun tidak ditemukan`,
  );

  await gotoRoute("/keamanan", 700);
  const amanText = await page.innerText("body");
  // Seksi "yang belum ada" adalah yang membuat halaman keamanan layak
  // dipercaya. Halaman keamanan yang hanya memuat hal baik terbaca sebagai
  // brosur — dan brosur tidak diteruskan manajer TI ke bagian pengadaan.
  check(
    "F51 /keamanan menyebut sertifikasi yang BELUM dimiliki, bukan hanya yang baik",
    amanText.includes("ISO 27001") && amanText.includes("SOC 2"),
    `→ seksi kejujuran tidak ditemukan`,
  );

  await gotoRoute("/kontak", 700);
  const kontakText = await page.innerText("body");
  check(
    "F51 /kontak memuat alamat surel yang bisa diklik",
    (await page.locator('a[href^="mailto:"]').count()) >= 1 && kontakText.includes("@erpindo.id"),
    `→ mailto tidak ditemukan`,
  );

  // Kedua halaman hukum WAJIB menyatakan dirinya draf selama penampung
  // identitas penyelenggara masih ada. Dokumen yang tampak final padahal masih
  // berpenampung akan beredar ke bagian hukum calon pelanggan.
  for (const jalur of ["/syarat", "/privasi"]) {
    await gotoRoute(jalur, 600);
    const teks = await page.innerText("body");
    const berpenampung = teks.includes("[NAMA BADAN USAHA]");
    check(
      `F51 ${jalur} menyatakan dirinya draf selagi penampung identitas ada`,
      !berpenampung || teks.includes("Draf menunggu tinjauan"),
      `→ penampung=${berpenampung}`,
    );
  }

  await gotoRoute("/tentang", 600);
  check(
    "F51 /tentang menyebut sumber angka yang dikutipnya",
    (await page.innerText("body")).includes("Panorama Consulting"),
    `→ sumber tidak dicantumkan`,
  );

  check("F51 enam halaman publik bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // --- F53 Halaman tampilan aplikasi (Fase 39d) -----------------------------
  //
  // Dicapai lewat KLIK di bilah atas, mengikuti alasan F51/F29: rute yang tidak
  // tertaut dari mana pun sama saja tidak ada.
  //
  // Yang paling perlu dijaga di halaman ini bukan tata letaknya melainkan
  // GAMBARNYA BENAR-BENAR TERMUAT. Uji vitest sudah memastikan berkasnya ada di
  // cakram, tetapi berkas yang ada bisa tetap gagal tampil di peramban — jalur
  // salah, dilayani sebagai 404 HTML, atau tertahan aturan aset Worker. Hanya
  // peramban sungguhan yang bisa membedakannya, dan `naturalWidth === 0` adalah
  // caranya: itu nilai gambar yang gagal dimuat, apa pun sebabnya.
  await gotoRoute("/", 700);
  await page.locator('header a[href="/tampilan"]').first().click();
  await page.waitForURL("**/tampilan", { timeout: 15_000 });
  await page.waitForTimeout(900);
  const tampilanBody = await page.innerText("body");
  check(
    "F53 /tampilan terjangkau dari bilah atas",
    page.url().includes("/tampilan") && tampilanBody.includes("Seperti apa layarnya"),
    `→ url=${page.url()}`,
  );

  // Gulir sampai bawah supaya gambar `loading="lazy"` ikut diminta — tanpa ini
  // sembilan dari sepuluh gambar tidak pernah dimuat dan ceknya lulus palsu.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  const gambar = await page.evaluate(() =>
    [...document.querySelectorAll("main img, figure img")].map((g) => ({
      src: g.getAttribute("src") ?? "",
      lebarAsli: g.naturalWidth,
      punyaAlt: (g.getAttribute("alt") ?? "").length > 0,
    })),
  );
  const tangkapan = gambar.filter((g) => g.src.startsWith("/tampilan/"));
  check(
    "F53 /tampilan memuat sepuluh tangkapan layar",
    tangkapan.length === 10,
    `→ ${tangkapan.length} gambar`,
  );
  const gagalMuat = tangkapan.filter((g) => g.lebarAsli === 0).map((g) => g.src);
  check(
    "F53 setiap tangkapan benar-benar termuat di peramban (bukan kotak kosong)",
    gagalMuat.length === 0,
    `→ gagal: ${gagalMuat.join(", ")}`,
  );
  check(
    "F53 setiap tangkapan punya teks alternatif",
    tangkapan.every((g) => g.punyaAlt),
    `→ tanpa alt: ${tangkapan.filter((g) => !g.punyaAlt).length}`,
  );

  // Umur tangkapan tercetak di halaman. Inilah yang membedakan halaman ini dari
  // tangkapan layar yang dihapus Fase 38: gambar boleh menua, asalkan
  // menyebutkan umurnya sendiri alih-alih mengaku segar.
  check(
    "F53 /tampilan menyebutkan kapan gambarnya ditangkap",
    /Ditangkap\s+\d{4}-\d{2}-\d{2}/.test(tampilanBody.replace(/\u00A0/g, " ")),
    `→ tanggal penangkapan tidak disebut`,
  );

  // Halaman ini TIDAK boleh menjadi jalan masuknya gambar kembali ke beranda:
  // keputusan Fase 38 (peragaan menggantikan tangkapan layar di halaman jualan
  // utama) tetap berlaku, dan pelanggarannya akan merayap masuk diam-diam.
  await gotoRoute("/", 900);
  const gambarBeranda = await page.evaluate(
    () => [...document.querySelectorAll("img")].filter((g) => (g.getAttribute("src") ?? "").startsWith("/tampilan/")).length,
  );
  check(
    "F53 beranda TETAP tanpa tangkapan layar — peragaan tidak digantikan",
    gambarBeranda === 0,
    `→ ${gambarBeranda} tangkapan bocor ke beranda`,
  );

  check("F53 halaman tampilan bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  await gotoRoute("/", 700);

  // Multibahasa (Fase 13d): toggle EN → hero & harga berbahasa Inggris, lalu kembali ID.
  await page.getByRole("button", { name: "EN", exact: true }).first().click();
  await page.waitForTimeout(300);
  const enText = await page.innerText("body");
  check(
    "F15 toggle EN menerjemahkan hero + harga ke Inggris",
    // Fase 53a: lencana kartu tunggal "One plan for everything" berganti
    // menjadi penanda satu paket pilihan di antara tiga.
    enText.includes("in a single application") && enText.includes("Best fit") && enText.includes("/month"),
    `→ EN tidak lengkap`,
  );
  // Fase 14f: seluruh seksi landing (Showcase/Comparison/Security/FAQ) kini dwibahasa.
  //
  // Fase 38b — penanda seksi Showcase berubah dari "Not a mockup" menjadi
  // "Do not take our word for it". Subjek asersinya TIDAK berubah (seksi
  // Showcase ikut berbahasa Inggris); yang berubah hanya kalimat yang
  // dicarinya, karena judul lama ("Ini tampilan aslinya. Bukan gambar rekaan.")
  // menjadi tidak benar begitu tangkapan layar diganti peragaan.
  check(
    "F15 landing 100% dwibahasa: seksi Showcase/Comparison/FAQ ikut ke Inggris",
    enText.includes("Do not take our word for it") && enText.includes("Still using") && enText.includes("Frequently asked questions"),
    `→ seksi landing belum sepenuhnya EN`,
  );
  await page.getByRole("button", { name: "ID", exact: true }).first().click();
  await page.waitForTimeout(300);
  // Fase 35a — judul hero diganti; asersi ikut menyebut bunyi barunya, bukan
  // dilonggarkan menjadi pencocokan sebagian.
  //
  // Fase 40a: judul diganti lagi. Bunyi lama ("tanpa proyek implementasi")
  // adalah alih-kata dari Inggris.
  //
  // Fase 40c: judul berhenti berporos pada industrinya sama sekali. Penandanya
  // kini pekerjaan yang dikenali pembaca dari kantornya sendiri.
  check(
    "F15 toggle kembali ke ID",
    (await page.innerText("body")).includes("Penjualan, stok, gaji, dan pajak perusahaan Anda"),
  );
  // --- Fase 27b: formulir "Jadwalkan demo" DIHAPUS ----------------------------
  //
  // Cek lama di sini mengisi & mengirim formulir itu. Fiturnya dihapus karena
  // bertabrakan dengan tombol "Lihat Demo" — pengunjung diminta menunggu
  // ditelepon untuk melihat sesuatu yang sudah bisa ia buka sendiri sekali klik.
  // Penggantinya menjaga agar formulirnya tidak kembali diam-diam, DAN agar yang
  // dihapus benar yang itu: demonya sendiri harus tetap ada.
  const formDemo = await page.getByRole("button", { name: "Kirim permintaan demo" }).count();
  const jangkarDemo = await page.locator('a[href="#demo"], #demo').count();
  check(
    "F48 formulir 'Jadwalkan demo' sudah tidak ada di landing",
    formDemo === 0 && jangkarDemo === 0,
    `→ tombol=${formDemo} jangkar=${jangkarDemo}`,
  );
  const demoButtons = await page.getByRole("button", { name: /Lihat Demo/ }).count();
  check("F15 landing memuat tombol 'Lihat Demo'", demoButtons >= 1, `→ ${demoButtons} tombol`);
  await page.getByRole("button", { name: /Lihat Demo/ }).first().click();
  await page.waitForURL("**/app", { timeout: 30_000 });
  await page.waitForTimeout(1500);
  const demoBody = await page.innerText("body");
  check("F15 masuk demo tanpa daftar → banner 'Mode demo' tampil", demoBody.includes("Mode demo"));
  check("F15 sesi demo berada di PT Demo Sejahtera", demoBody.includes("PT Demo Sejahtera"));
  // Pasangan negatif F30f: akun demo adalah viewer tanpa hak platform, jadi
  // menu Admin TIDAK boleh tampil. Diuji di sini — bukan di sesi utama yang
  // kini admin platform — supaya penjaga visibilitasnya tidak hilang saat
  // dasbor admin mulai punya cakupan peramban.
  const adminNavDemo = await page.locator("aside nav a:visible", { hasText: "Admin" }).count();
  check("F30f menu 'Admin' tersembunyi untuk pengguna biasa (sesi demo)", adminNavDemo === 0, `→ ${adminNavDemo} tautan`);
  // Dan bukan cuma menunya: rute langsungnya pun harus menolak.
  await gotoRoute("/app/admin", 900);
  const adminDemoTeks = await page.innerText("body");
  check(
    "F30f rute /app/admin menolak pengguna biasa, bukan hanya menyembunyikan menunya",
    /khusus admin platform|platform admins only/i.test(adminDemoTeks),
    `→ penolakan tidak ditemukan`,
  );

  check("F15 mode demo bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);

  // ---------------------------------------------------------------------------
  // F26/F27 — Fase 18c: layar kecil.
  //
  // Sampai fase ini, SELURUH cek di berkas ini berjalan pada satu viewport
  // (1360×900). Artinya klaim "responsif" tidak pernah dijaga apa pun — dan
  // memang terlihat di kodenya: di 36 berkas halaman hanya ada 10 kelas `md:`.
  //
  // Ditaruh paling akhir dengan sengaja: mengubah viewport di tengah suite bisa
  // menggeser tata letak yang diandalkan asersi lain. Di sini tidak ada lagi
  // asersi setelahnya.
  // ---------------------------------------------------------------------------
  resetErrors();
  await page.setViewportSize({ width: 390, height: 844 });
  const ruteMobile = ["/app", "/app/stok", "/app/penjualan", "/app/keuangan/neraca-saldo"];
  const meluber = [];
  for (const rute of ruteMobile) {
    await gotoRoute(rute, 900);
    // Gulir mendatar pada <body> = tata letak bocor keluar layar. Diberi
    // toleransi 2px untuk pembulatan sub-piksel peramban.
    const lebar = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      klien: document.documentElement.clientWidth,
    }));
    if (lebar.scroll > lebar.klien + 2) meluber.push(`${rute} (${lebar.scroll}>${lebar.klien})`);
  }
  check(
    "F26 layar 390px: tidak ada gulir mendatar di rute inti",
    meluber.length === 0,
    `→ meluber: ${meluber.join(", ") || "tidak ada"}`,
  );

  // F28 — Fase 18d: tabel menumpuk jadi kartu di layar kecil.
  //
  // Perlu cek tersendiri karena F26 TIDAK cukup: F26 hanya melihat gulir pada
  // dokumen, sementara tabel lama menggulir DI DALAM wadah `overflow-x-auto`
  // miliknya sendiri. Halaman Stok lolos F26 sementara kolom "Kedaluwarsa" dan
  // "Qty" terpotong di luar layar — terbukti dari tangkapan layar Fase 18c.
  await gotoRoute("/app/stok", 900);
  const tabelHp = await page.evaluate(() => {
    const tabel = document.querySelector("table");
    if (!tabel) return null;
    const thead = tabel.querySelector("thead");
    const td = tabel.querySelector("tbody td");
    // Label kolom hanya dirender untuk layar kecil; di desktop ia `hidden`.
    const labelTampak = [...tabel.querySelectorAll("tbody td > span")].filter(
      (el) => getComputedStyle(el).display !== "none" && el.textContent?.trim(),
    ).length;
    return {
      kepalaTersembunyi: thead ? getComputedStyle(thead).display === "none" : null,
      selBlok: td ? getComputedStyle(td).display : null,
      meluber: tabel.scrollWidth > tabel.clientWidth + 2,
      labelTampak,
    };
  });
  check(
    "F28 layar 390px: tabel menumpuk jadi kartu berlabel, tanpa gulir di dalam tabel",
    Boolean(
      tabelHp &&
        tabelHp.kepalaTersembunyi === true &&
        tabelHp.selBlok === "flex" &&
        !tabelHp.meluber &&
        tabelHp.labelTampak > 3,
    ),
    `→ ${tabelHp ? `kepalaTersembunyi=${tabelHp.kepalaTersembunyi} sel=${tabelHp.selBlok} meluber=${tabelHp.meluber} label=${tabelHp.labelTampak}` : "tidak ada <table>"}`,
  );

  // F32 — Fase 18p: baris BER-`colSpan` ikut menumpuk dengan benar.
  //
  // F28 memakai tabel Stok, yang seluruh barisnya seragam. Bentuk yang benar-
  // benar bisa pecah adalah baris total ber-`colSpan` — pada mode kartu setiap
  // sel jadi blok dan `colSpan` kehilangan artinya, sehingga baris total mudah
  // meluber atau tampil tanpa konteks. Tabel routing manufaktur memuat persis
  // bentuk itu, dan `F26` tidak akan menyadarinya bila luberannya terjadi di
  // dalam wadah tabel, bukan di dokumen — pelajaran yang sama yang melahirkan
  // F28.
  //
  // Catatan: pada titik ini suite berada di sesi demo (viewer, lihat F15), jadi
  // kolom aksi memang tidak dirender. Cek ini sengaja menyasar bentuk yang
  // benar-benar dilihat pengunjung demo, bukan bentuk yang hanya ada bagi admin.
  await gotoRoute("/app/manufaktur", 900);
  // Tabel routing baru muncul setelah satu perintah produksi dipilih.
  await page.locator("#rt-prod").selectOption({ index: 1 });
  await page.waitForTimeout(1200);
  const routingHp = await page.evaluate(() => {
    const sel = document.querySelector("table td[colspan]");
    if (!sel) return null;
    const baris = sel.closest("tr");
    const tabel = baris.closest("table");
    const kartu = baris.getBoundingClientRect();
    return {
      // Kartu baris tidak boleh melewati tepi kanan layar.
      dalamLayar: kartu.right <= window.innerWidth + 2,
      // Tabel induk tidak menggulir mendatar di dalam dirinya sendiri.
      tabelMeluber: tabel.scrollWidth > tabel.clientWidth + 2,
      // Baris memang sedang dalam mode kartu (bukan sekadar kebetulan muat).
      barisBlok: getComputedStyle(baris).display === "block",
      // Sel ber-`colSpan` pun ikut jadi blok, bukan tetap sel tabel selebar
      // beberapa kolom yang tak ada lagi.
      selFleks: getComputedStyle(sel).display === "flex",
      kanan: Math.round(kartu.right),
      layar: window.innerWidth,
    };
  });
  check(
    "F32 layar 390px: baris total ber-colSpan (routing manufaktur) menumpuk rapi jadi kartu",
    Boolean(
      routingHp &&
        routingHp.dalamLayar &&
        !routingHp.tabelMeluber &&
        routingHp.barisBlok === true &&
        routingHp.selFleks === true,
    ),
    `→ ${routingHp ? `kanan=${routingHp.kanan} layar=${routingHp.layar} tabelMeluber=${routingHp.tabelMeluber} blok=${routingHp.barisBlok} sel=${routingHp.selFleks}` : "tidak ada sel ber-colSpan"}`,
  );

  // F33 — Fase 18q: kartu baris harus MEMENUHI LEBAR wadahnya.
  //
  // F28 memeriksa bentuk (kepala tersembunyi, sel jadi blok, ada label) tetapi
  // tidak memeriksa LEBAR. Ternyata itu celah nyata: `<tbody>` yang masih
  // `table-row-group` membungkus baris-blok dengan tabel anonim yang menciut ke
  // lebar isinya, sehingga kartu berhenti di tengah kartu induknya. Cacatnya
  // ada sejak 18d dan lolos seluruh asersi selama dua belas sub-fase, karena
  // tabel-tabel yang dimigrasikan lebih dulu isinya kebetulan cukup lebar.
  //
  // Halaman Mata Uang dipakai justru karena tabelnya SEMPIT (3 kolom pendek) —
  // di sinilah selisih lebar itu terlihat.
  await gotoRoute("/app/keuangan/kurs", 900);
  const lebarKartu = await page.evaluate(() => {
    const baris = document.querySelector("table tbody tr");
    if (!baris) return null;
    const wadah = baris.closest("table").parentElement;
    const b = baris.getBoundingClientRect();
    const w = wadah.getBoundingClientRect();
    return { baris: Math.round(b.width), wadah: Math.round(w.width) };
  });
  check(
    "F33 layar 390px: kartu baris memenuhi lebar wadahnya (tbody ikut jadi blok)",
    Boolean(lebarKartu && lebarKartu.baris >= lebarKartu.wadah - 2),
    `→ ${lebarKartu ? `baris=${lebarKartu.baris} wadah=${lebarKartu.wadah}` : "tidak ada baris tabel"}`,
  );

  // Drawer navigasi adalah SATU-SATUNYA jalan ke menu di layar kecil (sidebar
  // desktop `hidden md:flex`). Kalau ia rusak, aplikasi praktis tak bisa
  // dipakai di HP — dan tak satu pun cek lama akan menyadarinya.
  await gotoRoute("/app", 700);
  const tombolMenu = page.locator('button[aria-label="Menu"]');
  const kotakMenu = await tombolMenu.boundingBox();
  await tombolMenu.click();
  await page.waitForTimeout(500);
  const drawerNav = page.locator('aside[aria-label="Menu navigasi"]');
  const drawerTerbuka = await drawerNav.locator("nav a:visible").count();
  await page.locator('button[aria-label="Tutup menu"]').click();
  await page.waitForTimeout(500);
  const kotakDrawer = await drawerNav.boundingBox();
  check(
    "F27 layar 390px: drawer menu bisa dibuka & ditutup, tombolnya cukup besar disentuh",
    drawerTerbuka > 5 &&
      Boolean(kotakMenu && kotakMenu.width >= 36 && kotakMenu.height >= 36) &&
      Boolean(kotakDrawer && kotakDrawer.x + kotakDrawer.width <= 1),
    `→ tautan=${drawerTerbuka} tombol=${kotakMenu ? `${Math.round(kotakMenu.width)}x${Math.round(kotakMenu.height)}` : "?"} tertutup=${kotakDrawer ? Math.round(kotakDrawer.x + kotakDrawer.width) <= 1 : "?"}`,
  );
  // --- F47 (Fase 27a): CTA lengket mobile harus memuat jalan ke demo ----------
  //
  // Dulu isinya "Daftar & Berlangganan" + "Hubungi" (menuju formulir), sehingga
  // demo — ajakan utama sejak Fase 24 — sama sekali tak terjangkau di layar
  // kecil, tempat sebagian besar pengunjung berada.
  await gotoRoute("/", 800);
  // Fase 35a — bilah ini sengaja BELUM muncul di layar pertama: tombol yang sama
  // sudah ada di dalam hero, dan menampilkan keduanya berarti empat tombol di
  // satu layar 390px. Ia muncul setelah hero terlewati, jadi asersinya menggulir
  // dulu — persis seperti pengunjungnya.
  const sebelumGulir = await page.locator("div.fixed.bottom-0").count();
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(400);
  const stickyDemo = await page.locator("div.fixed.bottom-0").getByRole("button", { name: /Lihat Demo/ }).count();
  const stickyDaftar = await page.locator("div.fixed.bottom-0").getByRole("button", { name: /^Daftar$/ }).count();
  check(
    "F47 layar 390px: CTA lengket memuat 'Lihat Demo' + 'Daftar' setelah digulir",
    stickyDemo === 1 && stickyDaftar === 1,
    `→ demo=${stickyDemo} daftar=${stickyDaftar}`,
  );
  check(
    "F47b layar 390px: CTA lengket TIDAK menutupi layar pertama",
    sebelumGulir === 0,
    `→ ${sebelumGulir} bilah tampil sebelum digulir`,
  );
  check("F26 layar kecil bebas galat halaman", errors.length === 0, `→ ${errors[0] ?? ""}`);
  // Tangkapan layar HP untuk halaman DALAM aplikasi diambil di sini, selagi
  // sesi masih hidup — blok UI_SIM_SHOT di bawah sudah membuang cookie demi
  // menangkap /masuk, jadi rute /app tidak bisa lagi diambil di sana.
  if (process.env.UI_SIM_SHOT) {
    mkdirSync(process.env.UI_SIM_SHOT, { recursive: true });
    for (const [rute, nama] of [
      ["/app", "hp-dasbor"],
      ["/app/stok", "hp-stok"],
      ["/app/manufaktur", "hp-manufaktur"],
    ]) {
      await gotoRoute(rute, 900);
      await page.screenshot({ path: path.join(process.env.UI_SIM_SHOT, `${nama}.png`) });
    }
    await gotoRoute("/app", 600);
    await page.locator('button[aria-label="Menu"]').click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(process.env.UI_SIM_SHOT, "hp-drawer.png") });
    await page.locator('button[aria-label="Tutup menu"]').click();
    await page.waitForTimeout(400);
  }
  await page.setViewportSize({ width: 1360, height: 900 });

  // Tangkapan layar opsional (Fase 17c) — BUKAN cek, tidak menambah hitungan.
  // Perombakan desain Fase 17 perlu diperiksa mata, bukan hanya oleh asersi:
  // asersi bisa lolos sementara tata letaknya kacau. Set `UI_SIM_SHOT=<dir>`
  // untuk merekam beberapa halaman kunci pada akhir jalannya suite.
  // Sengaja memakai suite ini karena di sinilah sesi sudah masuk dan datanya
  // sudah tersemai penuh — set `audit` di screenshots.mjs menyemai ulang dan
  // tertahan batas "satu perusahaan trial per akun".
  if (process.env.UI_SIM_SHOT) {
    const dir = process.env.UI_SIM_SHOT;
    mkdirSync(dir, { recursive: true });
    // Memakai `page` yang sudah ada, BUKAN ctx.newPage(): penjaga di atas
    // (`ctx.on("page", …)`) menutup setiap halaman selain `page`.
    const halaman = page;
    for (const [rute, nama, penuh] of [
      ["/app", "dasbor", false],
      ["/app/master/produk", "produk", false],
      ["/app/keuangan/jurnal", "jurnal", false],
      ["/app/stok", "stok", false],
    ]) {
      await halaman.goto(`${BASE}${rute}`, { waitUntil: "networkidle" });
      await halaman.waitForTimeout(1200);
      await halaman.screenshot({ path: path.join(dir, `${nama}.png`), fullPage: penuh });
    }
    // Palet perintah terbuka — rasa "alat pro" yang jadi inti fase ini.
    await halaman.keyboard.press("Control+k");
    await halaman.waitForTimeout(500);
    await halaman.screenshot({ path: path.join(dir, "palet.png"), fullPage: false });
    // Landing terakhir — palet hanya ada di dalam shell aplikasi, jadi urutannya
    // tidak boleh dibalik.
    for (const [rute, nama, penuh] of [
      ["/", "landing-atas", false],
      ["/", "landing-penuh", true],
      ["/fitur", "fitur", false],
      ["/fitur", "fitur-penuh", true],
      // Halaman masuk dilihat SETELAH sesi dibuang; kalau masih ada sesi,
      // /masuk mengalihkan ke /app dan tangkapannya jadi salah halaman.
      ["/masuk", "masuk", false],
    ]) {
      if (rute === "/masuk") await ctx.clearCookies();
      await halaman.goto(`${BASE}${rute}`, { waitUntil: "networkidle" });
      await halaman.waitForTimeout(1200);
      await halaman.screenshot({ path: path.join(dir, `${nama}.png`), fullPage: penuh });
    }
    // Layar kecil (Fase 18c). Tanpa ini tampilan HP hanya pernah DIUKUR asersi,
    // tidak pernah benar-benar dilihat — padahal bug tata letak paling sering
    // ketahuan dari melihat, bukan dari angka.
    await halaman.setViewportSize({ width: 390, height: 844 });
    for (const [rute, nama] of [
      ["/masuk", "hp-masuk"],
      ["/", "hp-landing"],
    ]) {
      await halaman.goto(`${BASE}${rute}`, { waitUntil: "networkidle" });
      await halaman.waitForTimeout(1000);
      await halaman.screenshot({ path: path.join(dir, `${nama}.png`) });
    }
    console.log(`\nTangkapan layar ditulis ke ${dir}`);
  }

  // ---------------------------------------------------------------------------
  // F1q/F1r — Fase 19q: halaman masuk/daftar dwibahasa.
  //
  // Diletakkan PALING AKHIR dengan sengaja. Halaman auth hanya bisa dilihat
  // tanpa sesi (dengan sesi hidup, /masuk mengalihkan ke /app), sementara
  // seluruh suite di atas bergantung pada sesi yang sudah masuk. Menaruhnya di
  // awal berarti menyentuh gerbang `#email`/`#password` yang menopang 200-an
  // asersi lain — persis yang dilarang komentar kontrak di auth.tsx.
  // ---------------------------------------------------------------------------
  // F51d — empat halaman CETAK, yang belum pernah dibuka peramban sama sekali.
  //
  // `/cetak/faktur`, `/cetak/penawaran`, `/cetak/slip-gaji`, dan `/cetak/1721a1`
  // tidak ada di `audit-routes.mjs` dan tidak disebut di mana pun dalam berkas
  // ini. Padahal justru inilah yang DISERAHKAN keluar: faktur ke pelanggan,
  // slip gaji dan 1721-A1 ke karyawan.
  //
  // Halaman-halaman ini mengambil parameternya dari query string dan mencari
  // dokumennya di daftar. Bila salah satu pemanggilan API-nya berubah bentuk,
  // yang muncul adalah "tidak ditemukan" — dan tidak ada gerbang yang akan
  // melihatnya sampai ada pengguna menekan tombol cetak.
  //
  // Asersinya sengaja dua sisi: nomor dokumennya HARUS muncul, DAN kalimat
  // "tidak ditemukan" harus absen. Memeriksa satu sisi saja akan hijau pada
  // halaman kosong yang kebetulan tidak memuat kata itu.
  {
    const tid = await page.evaluate(() => localStorage.getItem("erpindo-tenant"));
    const rujukan = await page.evaluate(async (t) => {
      const ambil = async (jalur) => {
        const r = await fetch(`/api/tenants/${t}/${jalur}`);
        return r.ok ? r.json() : null;
      };
      const [inv, quo, run, emp] = await Promise.all([
        ambil("invoices"),
        ambil("quotations"),
        ambil("payroll-runs"),
        ambil("employees"),
      ]);
      return {
        invoice: inv?.docs?.[0] ?? null,
        quotation: quo?.quotations?.[0] ?? null,
        run: run?.runs?.[0] ?? null,
        employee: emp?.employees?.[0] ?? null,
      };
    }, tid);

    const bukaCetak = async (nama, url, harusAda) => {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(700);
      const teks = await page.innerText("body");
      const adaIsi = harusAda.every((t) => t && teks.includes(t));
      const takDitemukan = /tidak ditemukan/i.test(teks);
      check(
        `F51d halaman cetak ${nama} merender dokumennya`,
        adaIsi && !takDitemukan,
        `→ isi=${adaIsi} takDitemukan=${takDitemukan} cuplikan="${teks.slice(0, 120).replace(/\n/g, " ")}"`,
      );
    };

    if (rujukan.invoice) {
      await bukaCetak("faktur", `/cetak/faktur?tenant=${tid}&id=${rujukan.invoice.id}`, [
        rujukan.invoice.docNo ?? rujukan.invoice.invoiceNo,
      ]);
    } else {
      check("F51d halaman cetak faktur merender dokumennya", false, "→ tidak ada faktur di demo");
    }

    if (rujukan.quotation) {
      await bukaCetak("penawaran", `/cetak/penawaran?tenant=${tid}&id=${rujukan.quotation.id}`, [
        rujukan.quotation.quoteNo ?? rujukan.quotation.docNo,
      ]);
    } else {
      check("F51d halaman cetak penawaran merender dokumennya", false, "→ tidak ada penawaran di demo");
    }

    if (rujukan.run && rujukan.employee) {
      await bukaCetak(
        "slip gaji",
        `/cetak/slip-gaji?tenant=${tid}&run=${rujukan.run.id}&employee=${rujukan.employee.id}`,
        [rujukan.employee.name],
      );
      await bukaCetak(
        "1721-A1",
        `/cetak/1721a1?tenant=${tid}&employee=${rujukan.employee.id}&year=${new Date().getFullYear()}`,
        [rujukan.employee.name],
      );
    } else {
      check("F51d halaman cetak slip gaji merender dokumennya", false, "→ tidak ada payroll run/karyawan di demo");
      check("F51d halaman cetak 1721-A1 merender dokumennya", false, "→ tidak ada payroll run/karyawan di demo");
    }

    await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
  }

  // ---------------------------------------------------------------------------
  // F51b — kegagalan MEMUAT sampai ke pengguna (Fase 51b).
  //
  // 140 dari 201 `useQuery` memakai `data?.xxx ?? []` tanpa membaca `.isError`,
  // sehingga gagal-memuat tampil sama persis dengan tidak-ada-data: halaman
  // Faktur yang gagal memuat berbunyi "Belum ada faktur". Diperbaiki sekali
  // lewat `QueryCache.onError` di main.tsx.
  //
  // Yang dibuktikan DI SINI adalah kabelnya, bukan keputusannya (itu diuji di
  // `test/galat-query.test.ts`): QueryCache → toastGlobal → ToastProvider.
  // Kalau salah satu sambungan putus, perbaikannya diam-diam tidak melakukan
  // apa pun — persis kelas cacat yang sedang ditutup.
  //
  // Ditaruh setelah SELURUH asersi bersesi selesai, dan permintaannya
  // dikembalikan (`unroute`) segera: yang menyusul hanya bagian tanpa sesi,
  // yang membersihkan cookie sendiri.
  {
    const pesanUji = "Uji 51b: server sengaja dibuat bermasalah";
    await page.route("**/api/tenants/*/invoices*", (r) =>
      r.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: pesanUji }) }),
    );
    await page.goto(`${BASE}/app/penjualan`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const toastTerlihat = await page.getByText(pesanUji, { exact: false }).count();
    check(
      "F51b gagal memuat memunculkan pemberitahuan, bukan halaman kosong yang menyesatkan",
      toastTerlihat > 0,
      `→ toast tidak muncul; pengguna hanya melihat daftar kosong`,
    );
    await page.unroute("**/api/tenants/*/invoices*");
  }

  await page.setViewportSize({ width: 1360, height: 900 });
  await ctx.clearCookies();
  await page.goto(`${BASE}/masuk`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // ---------------------------------------------------------------------------
  // F51a — halaman "lupa password" tidak lagi gagal dalam diam.
  //
  // Sebelum Fase 51a hanya `isSuccess` yang dirender: bila permintaannya gagal
  // (endpoint-nya dibatasi 5×/5 menit, jadi 429 nyata), spinner berhenti dan
  // TIDAK ADA apa pun yang berubah di layar — pada satu-satunya jalan pulih
  // akun. Halaman ini juga tidak pernah dibuka ui-sim sampai sekarang.
  {
    const pesanUji = "Uji 51a: terlalu sering, coba lagi nanti";
    await page.route("**/api/auth/forgot-password", (r) =>
      r.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: pesanUji }) }),
    );
    await page.goto(`${BASE}/lupa-password`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await page.locator("#email").fill("pemilik@contoh.co.id");
    await page.getByRole("button", { name: /kirim/i }).first().click();
    await page.waitForTimeout(700);
    const terlihat = await page.getByText(pesanUji, { exact: false }).count();
    check(
      "F51a lupa-password menampilkan sebab kegagalan, bukan diam",
      terlihat > 0,
      `→ tidak ada pesan galat di layar setelah permintaan ditolak`,
    );
    await page.unroute("**/api/auth/forgot-password");
    await page.goto(`${BASE}/masuk`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
  }

  // Sampai Fase 19q ini satu-satunya layar publik TANPA tombol bahasa.
  const saklarBahasa = page.getByRole("group", { name: "Bahasa" });
  const adaSaklar = (await saklarBahasa.count()) > 0;
  check(
    "F1q halaman masuk punya tombol pemilih bahasa (dulu satu-satunya layar publik tanpa itu)",
    adaSaklar,
    `→ jumlah saklar=${await saklarBahasa.count()}`,
  );

  if (adaSaklar) {
    // Mulai dari ID secara eksplisit: bahasa tersimpan di localStorage dan
    // suite di atas sempat menggantinya — jangan mengandalkan sisa keadaan.
    await saklarBahasa.getByRole("button", { name: "ID", exact: true }).first().click();
    await page.waitForTimeout(300);
    const masukId = await page.innerText("body");
    await saklarBahasa.getByRole("button", { name: "EN", exact: true }).first().click();
    await page.waitForTimeout(300);
    const masukEn = await page.innerText("body");
    const adaMasukEn =
      masukEn.includes("Welcome back") &&
      masukEn.includes("Sign in to pick up where you left off") &&
      masukEn.includes("One app for everything your company runs on.") &&
      masukEn.includes("Forgot your password?");
    const tanpaMasukId =
      !masukEn.includes("Selamat datang kembali") &&
      !masukEn.includes("Satu aplikasi untuk seluruh operasional") &&
      !masukEn.includes("Lupa password?");
    check(
      "F1r halaman masuk ikut EN: judul, pengantar, panel manfaat, tanpa teks Indonesia",
      adaMasukEn && tanpaMasukId && masukId.includes("Selamat datang kembali"),
      `→ EN=${adaMasukEn} tanpaID=${tanpaMasukId} awalID=${masukId.includes("Selamat datang kembali")}`,
    );
    await saklarBahasa.getByRole("button", { name: "ID", exact: true }).first().click();
    await page.waitForTimeout(200);
  }

  await ctx.close();
  await browser.close();
  browser = undefined;
} catch (err) {
  console.error("GALAT FATAL:", err);
  failures.push(`fatal: ${err.message}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  dev.kill("SIGTERM");
  setTimeout(() => dev.kill("SIGKILL"), 1500);
  setTimeout(() => rmSync(persistDir, { recursive: true, force: true }), 2000);
  rmSync(kameraPalsu, { force: true });
}

// Angka gerbang di dokumen tayang (Fase 50a) — lihat `lib/angka-gerbang.mjs`.
// Hanya di titik ini jumlah cek browser sudah final, jadi hanya di sini
// `docs/STATUS.md` dan `docs/05-runbook-go-live.md` bisa ditagih kebenarannya.
// Sengaja tidak lewat `check()`: satu cek tambahan akan membuat angka yang
// diperiksa selalu meleset satu dari angka akhirnya.
// Dihitung TERPISAH dari `failures` supaya baris "474/474" tetap melaporkan
// jumlah cek browser yang sebenarnya — angka basi di dokumen bukan cek browser
// yang gagal, dan mencampurnya akan mengaburkan angka yang sedang dijaga.
const angkaBasi = laporAngkaGerbang({ browser: passed });

const total = passed + failures.length;
if (failures.length > 0) {
  console.error(`\nUI-SIM: ${passed}/${total} checks passed — ${failures.length} GAGAL:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\nUI-SIM: ${passed}/${total} checks passed ✅`);
process.exit(angkaBasi > 0 ? 1 : 0);
