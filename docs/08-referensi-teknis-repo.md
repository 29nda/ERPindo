# Referensi teknis repo

> Untuk siapa pun — manusia atau agen — yang akan menyentuh kode ini. Versi
> non-teknis untuk pemilik: [`07-peta-repo-untuk-pemilik.md`](07-peta-repo-untuk-pemilik.md).
> Aturan kerja yang mengikat (bahasa Indonesia di seluruh repo, konvensi Fase,
> larangan yang sudah diputuskan) ada di `CLAUDE.md` di akar repo.
>
> Angka dalam dokumen ini diukur pada **14 Agustus 2026**; perintah untuk
> menghitung ulangnya disertakan supaya bisa diperiksa, bukan dipercaya.

## Tata letak & arah ketergantungan

pnpm workspaces, Node ≥ 22. Empat paket:

```
packages/shared ──┬──▶ apps/api ──▶ packages/db
                  └──▶ apps/web
```

| Paket | Isi | Catatan penting |
| --- | --- | --- |
| `packages/shared` | 20 modul skema zod + tipe API + fungsi murni (`core.ts`, `accounting.ts`, `pos.ts`, `payroll.ts`, …) | **Satu-satunya kontrak** antara api & web. Diimpor sebagai `@erpindo/shared` |
| `packages/db` | `migrations.ts` (skema tenant) + `control-plane/schema.ts` (Drizzle) | Migrasi **append-only**: jangan pernah mengubah entri lama |
| `apps/api` | Hono di Cloudflare Workers. Entry `src/index.ts` | Juga menyajikan SPA lewat binding `ASSETS` |
| `apps/web` | React 19 + Vite + TanStack Router/Query + Tailwind 4 + PWA | Klien API tunggal di `src/api/client.ts` |

Angka acuan: **48 modul route** (`apps/api/src/routes/`), **~40 halaman
aplikasi** + halaman landing/panduan (`apps/web/src/pages/`).

## Siklus permintaan

`apps/api/src/index.ts` adalah satu-satunya entry. Urutannya:

1. `secureHeaders()` dari Hono.
2. `enforcePlanByPath` — pagar paket berbasis prefiks path
   (`MODULE_ROUTE_PREFIXES` di `middleware/auth.ts:264`). Ini jaring pengaman
   lapis dua: tiap route juga memasang `requirePlanModule`/`requirePermission`
   sendiri, tetapi pagar per-path memastikan modul baru tidak lolos hanya karena
   penulisnya lupa.
3. Pemasangan ~48 modul route di bawah `/api/*`.
4. `requireAuth` (`middleware/auth.ts:23`) — sesi lewat cookie `erpindo_sid`.
5. `requireTenantRole` / `requirePermission` — RBAC, termasuk peran kustom
   (`resolvePermissions`).
6. `rateLimit` / `rateLimitUser` (`middleware/rateLimit.ts`) — hitungan di KV
   `RATE_KV`.
7. Resolusi database tenant (bagian berikutnya), lalu handler.

Semua yang bukan `/api/*` dilayani sebagai SPA dari binding `ASSETS`, kecuali
daftar path di `wrangler.jsonc` → `assets.run_worker_first` (`/blog`,
`/sitemap.xml`, `/robots.txt`, `/`, `/fitur`, …) yang sengaja dirender di server
untuk mesin pencari.

## Dua bidang database

**Control-plane** (binding `DB`, D1 `erpindo-control-plane`): **17 tabel**,
**16 migrasi** — `users`, `tenants`, `memberships`, `sessions`, `tokens`,
`subscription_invoices`, `payment_links`, `audit_logs`, `blog_posts`, `feedback`,
`demo_requests`, `api_keys`, `webhooks`, `webhook_deliveries`, `custom_roles`,
`drive_connections`, `oauth_states`.

**Per tenant**: **81 tabel**, **46 migrasi** (`TENANT_SCHEMA_VERSION =
TENANT_MIGRATIONS.length`, `packages/db/src/migrations.ts`).

> **Koreksi (Fase 26b).** Versi pertama dokumen ini menulis "3 migrasi
> control-plane · 82 tabel tenant · 33 migrasi tenant". Ketiganya salah, dan
> penyebabnya adalah perintah penghitung yang ikut diterbitkan di sini: ia
> membaca berkas sebagai teks dan mencocokkan `^\s*\{\s*id:`, pola yang tidak
> mengenai entri yang didahului komentar. Angka di atas kini dihitung dari
> **modul yang sudah dimuat**, bukan dari teks berkas — satu-satunya cara yang
> tidak bisa dibohongi oleh format penulisan.

Hitung ulang kapan saja (jalankan dari `apps/api`):

```sh
npx vitest run --reporter=basic -t hitung 2>/dev/null || \
node --experimental-strip-types -e '
  import("@erpindo/db").then(({ CONTROL_PLANE_MIGRATIONS, TENANT_MIGRATIONS }) => {
    const tabel = (m) => m.flatMap((x) => x.statements).filter((s) => /CREATE TABLE/.test(s)).length;
    console.log("control-plane:", CONTROL_PLANE_MIGRATIONS.length, "migrasi,", tabel(CONTROL_PLANE_MIGRATIONS), "tabel");
    console.log("tenant       :", TENANT_MIGRATIONS.length, "migrasi,", tabel(TENANT_MIGRATIONS), "tabel");
  })'
```

### Resolusi database tenant — `apps/api/src/lib/tenantDb.ts`

`tenants.db_ref` menyimpan **cara menemukan** database perusahaan, dan dua
bentuknya hidup berdampingan:

| Bentuk `db_ref` | Artinya | Mode |
| --- | --- | --- |
| `binding:TENANT_DB_3` | salah satu dari 6 binding di `wrangler.jsonc` | `TENANT_DB_MODE=local` |
| `uuid:<id>` | database D1 yang dibuat lewat REST API saat pendaftaran | `TENANT_DB_MODE=cloudflare` |
| `""` (`TANPA_DB`) | tenant `provisioning` — **belum membayar**, belum punya database | keduanya |

`getTenantDb()` menyelesaikan per-`db_ref`, jadi peralihan mode tidak memerlukan
migrasi data: tenant lama tetap `binding:`, tenant baru lahir `uuid:`.

Fungsi lain yang penting: `hitungKapasitasPool()` (dipakai kartu kapasitas di
Admin → Infra; membedakan slot **bebas bersih** dan **bebas tetapi masih
berisi data**), `provisionTenantDb()` (melempar `KapasitasTenantPenuhError` →
503 berpesan, bukan 500), `ensureTenantMigrated()` (migrasi malas saat tenant
disentuh) dan `migrateAllTenants()` (sapuan di cron, untuk tenant yang jarang
dibuka).

## Jurnal double-entry adalah pusatnya

Modul mana pun yang berdampak keuangan **memposting jurnal**, dan seluruh laporan
membaca dari jurnal berstatus `posted` — bukan dari tabel modulnya.

- `apps/api/src/lib/accounting.ts` — pembuatan & posting jurnal, aturan
  keseimbangan.
- `apps/api/src/lib/commercePosting.ts` — pemetaan transaksi dagang (penjualan,
  pembelian, retur, POS) menjadi baris jurnal.
- `apps/api/src/lib/reports.ts` — laba rugi, neraca, arus kas dari jurnal.

Konsekuensi praktis: menambah modul yang menyentuh uang **tanpa** posting jurnal
akan membuat laporan diam-diam salah, dan tidak ada uji yang otomatis
menangkapnya kecuali Anda menambahkannya.

## Handler `scheduled` (cron harian 01:17 UTC / 08:17 WIB)

Urutan di `apps/api/src/index.ts:219`:

1. `migrateAllTenants` — sapuan skema sebelum tugas bisnis menyentuh data.
2. Siklus langganan: `active` → `past_due` setelah jatuh tempo + masa tenggang;
   masa tenggang dimulai; **dunning** (pengingat bertahap) + satu susulan H+3;
   penurunan paket terjadwal diterapkan setelah periode berbayar habis.
3. Tanggal 1–3: penyusutan aset, rekap penjualan bulan lalu, backup Google Drive.
4. Harian per tenant dalam satu loop: kurs referensi, jurnal template terjadwal,
   penagihan kontrak berulang, work order pemeliharaan.
5. 1–3 Januari: jurnal penutup tahunan.
6. Pengiriman antrean webhook keluar.

Ada **anggaran wall-clock ~20 detik**; tenant sisa dilanjutkan run berikutnya
karena seluruh tugasnya idempoten.

## Degradasi anggun — aturan yang tidak boleh dilanggar

Binding/kunci yang absen **tidak boleh** membuat fitur gagal keras:

| Absen | Perilaku |
| --- | --- |
| `XENDIT_SECRET_KEY` **atau** `XENDIT_CALLBACK_TOKEN` | `GET /api/billing` → `configured:false`; checkout → 503 berpesan. Butuh **keduanya** — dengan kunci saja, uang bisa masuk tanpa bisa dikonfirmasi |
| `GOOGLE_CLIENT_ID`/`SECRET` | tombol Google disembunyikan; endpoint auth → 503 |
| `PLATFORM_ADMIN_EMAILS` | seluruh `/api/admin` → 403 |
| `RESEND_API_KEY` | `ConsoleMailer` — email dicatat ke log, pemanggil tidak gagal; kegagalan dicatat sebagai audit `email.gagal` |
| binding `AI` | 503 `binding-absent`, kuota tidak terpotong |
| `COMPED_EMAILS` | tidak ada akun kebal paywall (`isComped` → false untuk semua) |

Pola ini **diuji deterministik di smoke** — suite smoke berjalan **tanpa** kunci
apa pun, jadi memasang kunci di sana justru akan mematikan cek-cek itu.

Mode uji vs produksi Xendit dibedakan **prefiks kunci** (`xnd_development_` vs
`xnd_production_`), karena host-nya sama. `billingModeUji()` memantulkannya ke
`GET /billing` → lencana "mode uji pembayaran" di Pengaturan → Langganan.

## Alat di `scripts/`

| Berkas | Fungsi |
| --- | --- |
| `ui-sim.mjs` | 337 cek klik-tembus Chromium nyata terhadap wrangler dev |
| `seed-demo.mjs` | Menyemai demo 6 bulan ke deployment; `SEED_PROBE=1` memeriksa kredensial + status comped **tanpa menulis apa pun** |
| `bersihkan-tenant.mjs` | Mengosongkan DB tenant lalu baris control-plane (urutan itu mencegah slot kotor). `softtin` & `pt-demo-sejahtera` dilindungi; demo hanya bisa dihapus dengan `--izinkan-demo` |

| `sapu-i18n.mjs` | Penyapu teks satu bahasa. **Glob wajib `**`** — pola `pages/*.tsx` tidak turun ke subfolder |
| `export-panduan-md.mjs` | Regenerasi `docs/panduan/` dari sumber panduan aplikasi |
| `ai-probe.mjs` | Uji Workers AI terhadap deployment |
| `audit-routes.mjs` | Memeriksa route terpasang vs yang diuji |
| `make-dev-config.mjs` | Menghasilkan `wrangler.dev.jsonc` untuk D1 lokal |
| `make-icons.mjs`, `brand-alfa.mjs` | Ikon PWA & aset merek |

## Gerbang mutu

```sh
pnpm typecheck && pnpm test && pnpm build && pnpm smoke   # smoke: wrangler dev + D1 lokal
node scripts/ui-sim.mjs                                    # Chromium nyata
pnpm lint
shopt -s globstar && node scripts/sapu-i18n.mjs apps/web/src/pages/**/*.tsx apps/web/src/components/**/*.tsx
```

Angka acuan 14 Agustus 2026: **482 uji unit** (242 shared · 192 api · 48 web) ·
**1.088 smoke** · **337 ui-sim**. **Jumlah cek hanya boleh naik.**

Fitur baru wajib membawa cek smoke (`apps/api/scripts/smoke.mjs`) dan, bila
menyentuh UI, cek ui-sim. Tiap cek baru harus **dibuktikan bisa merah** dengan
sabotase yang mengenai bentuk cacatnya — bukan teks pesannya.

## Workflow GitHub

| Berkas | Pemicu | Isi |
| --- | --- | --- |
| `.github/workflows/ci.yml` | tiap push/PR | dua job: *Typecheck, test, build & smoke* dan *UI simulation*, plus *Lint* |
| `.github/workflows/seed-demo.yml` | push ke `ops/seed-demo-run` | probe kredensial **selalu** jalan; langkah semai dilewati bila judul commit **diawali** `[probe]` |
| `.github/workflows/ai-probe.yml` | manual/ops | uji Workers AI terhadap deployment |

Cloudflare Workers Builds men-deploy **branch PR** ke Worker produksi, bukan
hanya `main` — fakta yang mudah mengejutkan saat membaca riwayat deploy.

## Konvensi & larangan yang sudah diputuskan

- Seluruh isi repo **berbahasa Indonesia**: UI, komentar, dokumen, pesan commit.
- Pekerjaan berjalan dalam **Fase** bernomor, satu commit/PR per sub-fase, dengan
  log `docs/log/YYYY-MM-DD-fase-NX-*.md` berisi "Yang dikerjakan", "Validasi"
  (dengan angka cek), bukti sabotase, dan bagian **"yang TIDAK dikerjakan"**.
- **`apps/web/src/api/client.ts` tidak dipecah** (keputusan Fase 9d: churn tanpa
  nilai).
- **Jangan membangun ulang pembayaran non-tunai POS** — sudah ada sejak Fase 7a
  (`POS_PAYMENT_METHODS`, multi-tender, jurnal ke akun bank).
- Teks yang tampil ke pengguna **selalu** lewat `apps/web/src/i18n/ui.ts`; alat
  penyapu i18n menjaganya.
