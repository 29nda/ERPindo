# CLAUDE.md — Panduan agen untuk repo ERPindo

ERP SaaS multi-tenant untuk UKM Indonesia. **Seluruh isi repo berbahasa Indonesia**:
UI, komentar kode, dokumen, log, dan pesan commit.

## Tata letak monorepo (pnpm workspaces, Node >= 22)

- `apps/api` — Hono di Cloudflare Workers + Drizzle ORM + D1. Entry `src/index.ts`
  (memasang ~40 modul route dari `src/routes/` + handler cron `scheduled`).
  Worker juga menyajikan SPA web lewat binding ASSETS.
- `apps/web` — React 19 + Vite + TanStack Router/Query + Tailwind 4 + PWA.
  Halaman di `src/pages/`, klien API tunggal di `src/api/client.ts`.
- `packages/shared` — skema zod + tipe API + fungsi murni, dipakai api & web
  (impor sebagai `@erpindo/shared`).
- `packages/db` — migrasi tenant (`migrations.ts`) + skema control-plane.
- `scripts/` — ops: `ui-sim.mjs` (simulasi UI Playwright), `seed-demo.mjs`,
  `ai-probe.mjs`, `make-dev-config.mjs` (menghasilkan `wrangler.dev.jsonc`).

## Gerbang validasi (jalankan sebelum commit)

```sh
pnpm typecheck && pnpm test && pnpm build && pnpm smoke   # smoke: wrangler dev + D1 lokal
node scripts/ui-sim.mjs                                    # klik-tembus Chromium nyata
pnpm lint                                                  # wajib di CI sejak Fase 12a
# Penyapu i18n — glob WAJIB `**` (Fase 20m): pola `pages/*.tsx` tidak turun ke
# subfolder, dan karena itu `pages/settings/` lolos tanpa terlihat selama
# seluruh program dwibahasa Fase 19.
shopt -s globstar && node scripts/sapu-i18n.mjs apps/web/src/pages/**/*.tsx apps/web/src/components/**/*.tsx
# Penyapu warna (Fase 31a) — kelas literal `slate-*`/`dark:` hanya boleh TURUN.
# Ada karena perombakan desain 17a & 18a hanya mengganti NILAI warna di satu
# berkas, sementara 50 halaman menulis warna sendiri — jadi kerangkanya tidak
# pernah berubah. Pakai token semantik: bg-surface, text-ink-muted, border-line.
node scripts/sapu-warna.mjs
# Penjaga tautan dokumen (Fase 31e) — Markdown tidak dikompilasi, jadi tautan
# mati tidak pernah memunculkan galat sampai pemilik mengekliknya.
node scripts/periksa-tautan-dokumen.mjs
# Penyapu istilah (Fase 33k) — memaksa keputusan di `docs/glosarium.md`:
# ejaan "utang", merek "ERPindo", "Rp 499.000" berspasi, "karyawan" bukan
# "pegawai". Ada karena keputusan yang hanya hidup di dokumen akan dilanggar
# oleh orang yang tidak membaca dokumen itu — dan tsc/eslint/smoke tidak bisa
# melihatnya, karena string apa pun tetap sah.
node scripts/sapu-istilah.mjs
# Penyapu gaya (Fase 33k) — BENTUK kalimat, bukan pilihan katanya. Berambang
# seperti sapu-warna: terjemahan Inggris dalam kurung, empty state buntu,
# placeholder angka tanpa pemisah ribuan.
node scripts/sapu-gaya.mjs
```

Jumlah cek hanya boleh **naik**, tidak boleh turun. Fitur baru wajib diberi cek
smoke (`apps/api/scripts/smoke.mjs`) dan, bila menyentuh UI, cek ui-sim.

## Konvensi kerja "Fase"

- Pekerjaan berjalan dalam Fase bernomor (12a, 12b, …), satu commit/PR per sub-fase.
- Tiap sub-fase menulis log `docs/log/YYYY-MM-DD-fase-NX-ringkas.md`: bagian
  "Yang dikerjakan", "Validasi" (dengan angka cek), dan catatan koreksi/kejujuran
  bila temuan eksplorasi tidak terbukti.
- **`docs/log/` hanya memuat program yang sedang berjalan.** Saat sebuah program
  besar selesai, log-nya dipadatkan ke `docs/riwayat.md` — yang disimpan hanya
  keputusan yang masih mengikat beserta alasannya, bukan catatan pekerjaan.
  258 log (18.972 baris) dipadatkan begitu pada Fase 31e.
- Akhir fase besar: laporan akhir untuk pemilik + perbarui `docs/STATUS.md`
  (non-teknis, ditujukan ke pemilik) dan centang item di `docs/03-roadmap-lanjutan.md`.

## Fakta arsitektur penting

- **Satu database D1 per tenant.** Control-plane di binding `DB`; DB tenant dari pool
  `TENANT_DB_1..6` (mode via `TENANT_DB_MODE`: `local`/`cloudflare`). Resolusi di
  `apps/api/src/lib/tenantDb.ts`.
- **Binding Env opsional terdegradasi anggun** — jangan membuat fitur gagal keras:
  Workers AI absen → 503 `binding-absent`; kunci Resend/Xendit/Google absen →
  fitur nonaktif dengan pesan jelas. Pola ini diuji deterministik di smoke.
- Kuota AI per tenant disimpan di KV `RATE_KV`; panggilan model lewat `runModel()`
  (`apps/api/src/routes/ai.ts`) dengan fallback model.
- Jurnal double-entry adalah pusat data: modul (penjualan, POS, gaji, aset, dll.)
  memposting jurnal; laporan membaca dari jurnal berstatus `posted`.

## Larangan yang sudah diputuskan (jangan diulang)

- `apps/web/src/api/client.ts` TIDAK dipecah (keputusan Fase 9d: churn tanpa nilai).
- Jangan membangun ulang pembayaran non-tunai POS — sudah ada sejak Fase 7a
  (`POS_PAYMENT_METHODS`, multi-tender, jurnal ke akun bank).
- Jangan menulis warna literal (`bg-white`, `text-slate-500`, `dark:*`) di
  halaman — pakai token semantik. Ini yang membuat dua perombakan desain
  sebelumnya tidak pernah terasa; rinciannya di `docs/riwayat.md` §6.
- Jangan menaruh tombol/tautan baru di dalam `aside nav` shell aplikasi tanpa
  memeriksa ui-sim: sebelas asersi menghitung `aside nav a:visible`.
- Naskah yang dilihat pengguna tunduk pada `docs/glosarium.md`, dan itu
  **dipaksa** oleh `scripts/sapu-istilah.mjs`. Pengecualiannya (kunci kamus,
  nilai enum kontrak API, kunci `localStorage`, nama berkas unduhan) sudah
  terdaftar di sana — tambahkan ke daftar itu, jangan longgarkan polanya.
- Toast TIDAK boleh dirakit dari potongan kamus
  (`` `${u("prefix")} ${nilai} ${u("suffix")}` ``). Potongan mengunci urutan
  kata Indonesia ke dalam kode, dan bahasa lain tidak punya cara mengubahnya —
  padahal tiap potongnya terlihat sudah diterjemahkan. Pakai kalimat utuh
  berlubang `{0}` + `isi()` dari `apps/web/src/i18n`. Dijaga tiga uji di
  `apps/web/test/i18n.test.ts`.
