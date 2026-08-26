import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Gerbang struktural RBAC (Fase 9a): middleware auth dipasang per-handler
 * (bukan .use() level router), sehingga SATU registrasi yang lupa memasang
 * requireAuth otomatis menjadi endpoint publik tanpa terlihat. Test ini
 * mem-parse semua file rute dan memastikan tiap registrasi punya penjaga —
 * kecuali daftar putih endpoint yang MEMANG publik / ber-scope user.
 */

const ROUTES_DIR = join(dirname(fileURLToPath(import.meta.url)), "../src/routes");

/** Endpoint yang memang tanpa requireAuth: alur auth publik. */
const PUBLIC_ALLOWLIST = new Set([
  'auth.ts POST "/register"',
  'auth.ts POST "/login"',
  // Sesi demo publik baca-saja (Fase 10b) — rate-limited, hanya membuat sesi
  // viewer di perusahaan demo.
  'auth.ts POST "/demo"',
  // Masuk via Google (Fase 10d) — alur OAuth memang pra-login: /available
  // hanya membaca konfigurasi, "/" me-redirect ke consent Google, /callback
  // memvalidasi state bertanda tangan sebelum membuat sesi.
  'authGoogle.ts GET "/available"',
  'authGoogle.ts GET "/"',
  'authGoogle.ts GET "/callback"',
  'auth.ts POST "/verify"',
  'auth.ts POST "/forgot-password"',
  'auth.ts POST "/reset-password"',
  // Blog publik SSR + sitemap/robots (Fase 10e) — konten pemasaran memang
  // untuk semua orang; hanya artikel ber-published_at yang dilayani.
  'blog.ts GET "/blog"',
  'blog.ts GET "/blog/:slug"',
  'blog.ts GET "/sitemap.xml"',
  'blog.ts GET "/robots.txt"',
  // `/llms.txt` (Fase 39a) — peta situs berbentuk prosa untuk mesin penjawab.
  // Publik dengan alasan yang persis sama seperti robots.txt dan sitemap.xml:
  // isinya naskah pemasaran yang memang ditujukan untuk dibaca siapa pun, dan
  // tidak satu pun datanya berasal dari tenant.
  'blog.ts GET "/llms.txt"',
  // Webhook notifikasi Midtrans (Fase 11b) — dipanggil server Midtrans, bukan
  // pengguna; diamankan lewat verifikasi tanda tangan SHA-512, bukan sesi.
  'billing.ts POST "/notification"',
  // Form lead publik milik TENANT (Fase 21e) — ditempel pemilik di landing/bio
  // media sosialnya, jadi pengirimnya memang pengunjung tanpa akun. Yang
  // menggantikan sesi: slug tenant + token form yang harus cocok, ditambah
  // rate-limit per IP. Tokennya sengaja bukan rahasia (tertanam di HTML publik)
  // — perinciannya di `routes/leadForm.ts`. Rute ini hanya bisa MENYISIPKAN
  // satu baris lead; ia tidak membaca maupun mengubah data tenant lain.
  'leadForm.ts POST "/lead/:slug"',
  // Dokumentasi API publik SSR (Fase 13h) — halaman pemasaran statis.
  'apiDocs.ts GET "/api-docs"',
  // SEO landing SSR (Fase 14d) — menyisipkan JSON-LD ke shell SPA publik.
  'landingSeo.ts GET "/"',
  // Halaman /fitur (Fase 18f) — halaman pemasaran publik, perlakuan SEO sama
  // persis dengan "/" di atas: menyisipkan canonical + JSON-LD + <noscript> ke
  // shell SPA. Tidak memuat data tenant apa pun.
  'landingSeo.ts GET "/fitur"',
  // Enam halaman publik Fase 38d — perlakuan yang sama persis: menyisipkan
  // canonical + JSON-LD + <noscript> ke shell SPA. Tidak satu pun menyentuh
  // basis data tenant, dan tidak satu pun menerima masukan pengguna.
  //
  // Bahwa keenamnya harus didaftarkan di sini adalah gerbang ini bekerja
  // sebagaimana mestinya: rute publik baru tidak bisa lahir tanpa seseorang
  // menyatakannya publik dengan sengaja.
  'landingSeo.ts GET "/harga"',
  'landingSeo.ts GET "/keamanan"',
  'landingSeo.ts GET "/tentang"',
  'landingSeo.ts GET "/kontak"',
  'landingSeo.ts GET "/syarat"',
  'landingSeo.ts GET "/privasi"',
  // `/tampilan` (Fase 39d) — halaman tangkapan layar. Publik seperti kedelapan
  // jalur SEO di atasnya; gambarnya ditangkap dari data demo, bukan data tenant.
  'landingSeo.ts GET "/tampilan"',
]);

/** Endpoint ber-requireAuth yang memang tanpa role gate: ber-scope user
 *  (profil/2FA/buat perusahaan), lintas-tenant terbatas owner via query
 *  (konsolidasi memfilter ownedTenants), callback OAuth, dan terima undangan. */
const USER_SCOPED_ALLOWLIST = new Set([
  'auth.ts POST "/companies"',
  'auth.ts POST "/logout"',
  'auth.ts GET "/me"',
  'auth.ts PATCH "/profile"',
  'auth.ts POST "/change-password"',
  'auth.ts POST "/2fa/setup"',
  'auth.ts POST "/2fa/enable"',
  'auth.ts POST "/2fa/disable"',
  'consolidation.ts GET "/companies"',
  'consolidation.ts GET "/income-statement"',
  'consolidation.ts GET "/balance-sheet"',
  'drive.ts GET "/callback"',
  'tenants.ts POST "/accept"',
  // Dukungan/masukan (Fase 10e): kirim & lihat masukan milik sendiri —
  // ber-scope user, rate-limited, tanpa konteks tenant.
  'admin.ts POST "/"',
  'admin.ts GET "/mine"',
  // Billing (Fase 11b): sengaja tanpa requireTenantRole — memeriksa keanggotaan
  // & peran owner secara manual agar tenant PAST_DUE tetap boleh membayar
  // (requireTenantRole memblokir tulis saat past_due).
  'billing.ts GET "/:tenantId/billing"',
  'billing.ts POST "/:tenantId/billing/checkout"',
  // Payment collection (Fase 11d): sama seperti billing — cek keanggotaan/peran
  // manual agar tenant past_due tetap boleh menagih pelanggannya.
  'collections.ts GET "/:tenantId/invoices/:id/payment-link"',
  'collections.ts POST "/:tenantId/invoices/:id/payment-link"',
]);

type Registration = { key: string; middleware: string };

function collectRegistrations(): Registration[] {
  const regs: Registration[] = [];
  const re = /\.(get|post|put|patch|delete)\(\s*(`[^`]*`|"[^"]*")\s*,([\s\S]*?)(?:async\s*\(|\(c\)\s*=>)/g;
  for (const file of readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".ts"))) {
    const source = readFileSync(join(ROUTES_DIR, file), "utf8");
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const path = m[2]!.startsWith("`") ? `"${m[2]!.slice(1, -1)}"` : m[2]!;
      regs.push({ key: `${file} ${m[1]!.toUpperCase()} ${path}`, middleware: m[3]! });
    }
  }
  return regs;
}

describe("penjaga RBAC per-registrasi rute", () => {
  const regs = collectRegistrations();

  it("parser menemukan registrasi dalam jumlah wajar (regresi parser)", () => {
    // Saat ini 220 registrasi; bila parser rusak (mis. gaya penulisan berubah)
    // angka anjlok dan test ini gagal lebih dulu daripada diam-diam melewatkan.
    expect(regs.length).toBeGreaterThanOrEqual(200);
  });

  it("semua endpoint non-publik memakai requireAuth", () => {
    const missing = regs
      // requireApiKey (Fase 13h): autentikasi via Bearer API key untuk /api/v1 —
      // penjaga yang setara requireAuth (menyematkan konteks tenant, menolak 401).
      .filter((r) => !r.middleware.includes("requireAuth") && !r.middleware.includes("requireApiKey"))
      .map((r) => r.key)
      .filter((k) => !PUBLIC_ALLOWLIST.has(k));
    expect(missing).toEqual([]);
  });

  it("semua endpoint ber-auth non-user-scoped memakai role gate", () => {
    const missing = regs
      .filter(
        (r) =>
          r.middleware.includes("requireAuth") &&
          !r.middleware.includes("requireTenantRole") &&
          !r.middleware.includes("requirePermission") &&
          // Admin platform (Fase 10e): requirePlatformAdmin = gate peran.
          !r.middleware.includes("requirePlatformAdmin"),
      )
      .map((r) => r.key)
      .filter((k) => !USER_SCOPED_ALLOWLIST.has(k));
    expect(missing).toEqual([]);
  });

  it("daftar putih tidak mengandung entri basi", () => {
    const keys = new Set(regs.map((r) => r.key));
    const stale = [...PUBLIC_ALLOWLIST, ...USER_SCOPED_ALLOWLIST].filter((k) => !keys.has(k));
    expect(stale).toEqual([]);
  });
});
