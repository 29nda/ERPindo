# Fase 24d — sisa janji "gratis 30 hari" yang tidak ikut terhapus

Pemilik bertanya "sudah siap launching belum?". Pemeriksaan tidak berhenti di
dokumen: gerbang mutu, riwayat CI, **dan produksi sungguhan** (control-plane D1,
bundle Worker yang benar-benar ter-deploy) dibaca satu per satu.

Sisi kode nyaris siap — dan justru karena itu satu-satunya temuan kode di
bawah ini penting: **ia sudah tayang.**

## Temuan

Fase 24a menghapus trial 30 hari. Fase 24c menutup tiga janji trial yang masih
tertinggal (JSON-LD, FAQ terstruktur, `guideKnowledge`) — pencariannya berhenti
di berkas landing, dan `routes/blog.ts` **punya kerangka HTML-nya sendiri**.
Terverifikasi di bundle produksi, bukan dari kode lokal:

```
apps/api/src/routes/blog.ts:87  <a class="cta" href="/daftar">Coba Gratis</a>
apps/api/src/routes/blog.ts:90  <a href="/daftar">Coba gratis 30 hari</a>
```

Keduanya dirender server, publik, dan `/blog` terdaftar di `sitemap.xml` — jadi
yang terindeks mesin pencari adalah janji yang aplikasinya sendiri tidak bisa
tepati. Pengunjung yang mengekliknya mendaftar, lalu menabrak paywall yang tak
pernah disebut.

Empat sisanya di SPA: tombol bilah atas "Coba Gratis / Try Free" di landing,
`/fitur`, dan `/panduan` — **ajakan pertama yang dilihat setiap pengunjung** —
ditambah dua kalimat CTA ("Coba daftar gratis saja", "Coba alur ini gratis →").

## Yang dikerjakan

**Blog.** Nav → `Daftar`; footer → ajakan demo ("Lihat demo berisi 6 bulan data
nyata — tanpa mendaftar"), mengikuti urutan yang diputuskan 24a/24c: demo lebih
dulu. Komentar penunjuk dipasang di `page()` bahwa berkas ini, `landingSeo.ts`,
dan teks landing wajib dirawat bersama — itulah persis yang gagal terjadi.

> Koreksi rencana: rencana menulis footer menuju `/demo`. **Rute itu tidak
> ada** — demo dimulai lewat tombol di landing yang memanggil
> `POST /api/auth/demo`, dan `/demo` hanya jatuh ke fallback SPA. Tautannya
> diarahkan ke `/`.

**SPA.** Tiga tombol → `Daftar` / `Sign up`; dua kalimat CTA dibersihkan dari
kata "gratis".

**Status `trial` yang mati di Admin.** `trial` sudah tidak ada di
`TENANT_STATUSES` sejak 24a, jadi kartu "Trial berjalan" selamanya `0` dan kolom
"Trial berakhir" selamanya `—`. Keduanya dihapus. Yang menggantikannya bukan
kosong: **`provisioning` justru belum pernah punya label sama sekali** sehingga
tampil sebagai kode mentah di lencana — padahal sejak trial dihapus, itulah
keadaan setiap pendaftar baru sampai ia membayar. Kini "Menunggu pembayaran" /
"Belum berlangganan". Kolom `trial_ends_at` tetap dibiarkan di skema (keputusan
24a).

## Penjaga

- **Smoke blok `24d`** — HTML `/blog` **dan** `/blog/:slug` diperiksa tidak
  memuat "gratis 30 hari" maupun "Coba Gratis". Dua-duanya, karena keduanya
  memakai kerangka yang sama dan hanya satu yang biasa diperiksa mata.
- **ui-sim `F46`** — dibaca dari teks landing yang benar-benar terender, bukan
  dari berkas sumber.

Yang dikunci adalah **frasa janjinya**, bukan kalimat pemasarannya — alasan yang
sama yang membuat 24c menolak menambah cek atas teks jualan.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **470** (tetap) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1087** (dari 1085) |
| `node scripts/ui-sim.mjs` | 0 | **337/337** (dari 336) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Uji unit tidak bertambah: yang berubah adalah teks dan tempat teks itu
dirender, dan keduanya hanya bisa dibuktikan dari HTML yang benar-benar keluar.

**Dibuktikan bisa gagal** (sabotase mengenai bentuk cacat aslinya — teks lama
dikembalikan, bukan pesan ceknya diubah); keduanya dipulihkan sesudahnya:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| footer `blog.ts` dikembalikan ke "Coba gratis 30 hari" | `24d indeks /blog…` **dan** `24d artikel /blog/:slug…` |
| tombol bilah atas landing dikembalikan ke "Coba Gratis" | `F46 landing tidak menjanjikan 'Coba Gratis'` |

## Keadaan produksi saat fase ini ditulis (terverifikasi, bukan klaim dokumen)

| Yang diperiksa | Hasil |
| --- | --- |
| CI `main` @ `25e66ac` | hijau |
| Kode Fase 23c + 24 ter-deploy | **ya** — bundle memuat `pastikanTenantTerprovisi`, `poolMasihKosong`, 22 entri `MODUL_RINGKAS` |
| Kapasitas pool tenant | **2/6 terpakai** (`softtin`, `pt-demo-sejahtera`), 4 bebas, tanpa slot kotor |
| Faktur demo publik | Mei 4 · Jun 16 · Jul 12 · **Agu 0** |
| `subscription_invoices` | **0 baris** |

## Yang TIDAK dikerjakan — dan inilah sisa penghalang peluncuran sebenarnya

Semuanya menunggu pemilik, tidak ada kode yang bisa menggantikannya (runbook §4):

- **Kunci belum terpasang:** `PLATFORM_ADMIN_EMAILS` → Resend (didahulukan,
  menunggu DNS) → Google OAuth (butuh domain final) → Midtrans sandbox → uji
  runbook §3 → Midtrans produksi. `subscription_invoices` yang masih **0 baris**
  berarti jalur pembayaran belum pernah sekali pun terbukti jalan di produksi —
  dan sejak trial dihapus, tidak ada cara lain untuk menjadi pelanggan.
- **Demo produksi belum disemai ulang** (runbook §7). Faktur berhenti di Juli dan
  **nol di Agustus**: landing menjanjikan "6 bulan data nyata", sementara bulan
  berjalan yang kosong membuat dasbor terlihat mati justru di depan calon
  pelanggan yang sedang menilai. Butuh secret `SEED_EMAIL`/`SEED_PASSWORD`.
- **Batas 6 perusahaan masih berlaku** — 4 slot bebas cukup untuk pilot, tidak
  untuk pendaftaran terbuka. D1 dinamis (runbook §6) perlu dinyalakan lebih dulu
  bila menargetkan lebih dari itu.
- **Domain masih `erpindo.nurudhuhaalamin.workers.dev`** — keputusan pemilik, dan
  redirect URI Google bergantung padanya.
