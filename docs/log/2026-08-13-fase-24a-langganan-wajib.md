# Fase 24a — trial dihapus; database dibuat saat membayar, bukan saat mendaftar

Keputusan pemilik menjelang peluncuran: **tidak ada lagi masa coba gratis 30
hari.** Alasannya bukan harga melainkan resource — trial berarti setiap
pendaftar mendapat database, entah ia akhirnya membayar atau tidak.

Pendaftaran **tetap terbuka**. Yang berubah: akun baru tidak bisa mencatat
transaksi apa pun sampai berlangganan, dan calon pelanggan menilai produk lewat
demo publik.

## Premis yang perlu dikoreksi lebih dulu

Menghapus trial saja **tidak menghemat apa pun**. `provisionTenantDb()` dipanggil
di dalam `POST /auth/register`, jadi pendaftar yang batal bayar tetap membakar
satu binding `TENANT_DB_*` permanen — persis seperti trial. Dengan sisa 4 slot
(setelah pembersihan Fase 23c) dan pendaftaran terbuka, pool akan penuh lagi
setelah **empat** pendaftar.

Karena itu fase ini memindahkan provisioning ke titik pembayaran. Barulah
tujuannya tercapai.

## Yang dikerjakan

**Model data.** `PLANS` kini tiga paket berbayar (`trial` Rp0 dihapus — ia bukan
paket melainkan keadaan). `TENANT_STATUSES` memakai `provisioning` yang **sudah
ada sejak awal tetapi tidak pernah dipakai**; desainnya memang mengantisipasi
tenant tanpa database. `TRIAL_DAYS`, `TRIAL_DAYS_OVERRIDE`, dan `trialEndsAt`
di API hilang seluruhnya.

**Registrasi.** Tidak lagi memanggil `provisionTenantDb()`. Tenant lahir
`provisioning` dengan `db_ref` kosong. Akun comped (`COMPED_EMAILS`) dikecualikan
— ia tidak pernah melewati checkout.

**`pastikanTenantTerprovisi()`** — satu helper idempoten, dipanggil dari **tiga**
tempat: webhook Midtrans (jalur normal), `GET /billing` (pemulihan-diri), dan
aktivasi manual admin (pelanggan transfer bank).

**Penjaga akses** di `requireTenantRole` menguji **`db_ref`, bukan status**.
Status bisa sudah `active` sementara databasenya belum sempat dibuat, dan justru
keadaan itu yang paling berbahaya: blok auto-migrasi di bawahnya akan meledak
pada `db_ref` kosong sehingga pelanggan melihat 500 alih-alih penjelasan.
Penjaganya menolak **semua** method termasuk GET — tidak ada data untuk dibaca.

**Cron** kehilangan seluruh jalur trial. Dunning kini hanya menyentuh pelanggan
berbayar. Masa tenggang 3 hari tetap berlaku, kini digantung ke
`subscription_ends_at`.

## Tiga hal yang hampir lolos

**1. Aktivasi manual admin tidak memprovisi.** Endpoint `admin/tenants/:id/plan`
adalah jalur pelanggan yang membayar lewat transfer bank. Tanpa perubahan, ia
menghasilkan akun "aktif" yang tetap tidak bisa dibuka — pemilik menyangka sudah
selesai, pelanggannya masih tertahan. Ketahuan karena smoke butuh jalur itu.

**2. `/auth/companies` melewati paywall.** Endpoint perusahaan tambahan
memprovisi seketika dan hanya dijaga `requireAuth`. Pagar lamanya berbunyi "satu
perusahaan trial per akun"; begitu trial hilang, pagar itu tidak menjaga apa pun
dan seorang pendaftar yang belum bayar bisa memanen slot tanpa batas lewat sana.
Diterjemahkan jadi "akun dengan perusahaan belum berlangganan tidak boleh
menambah perusahaan".

**3. Uji idempotensi saya hijau atas alasan yang salah.** Uji bernama "webhook
KEDUA tidak membuat database kedua" **tetap hijau ketika penjaga `db_ref`
dilumpuhkan** — webhook kedua tidak pernah sampai ke sana karena invoice-nya
sudah lunas. Yang dijaganya adalah penjaga invoice, bukan yang namanya diklaim.

Ini pengulangan pelajaran Fase 23b dengan wajah baru: **cek yang benar-benar
hijau tetap bisa memberi rasa aman palsu bila sasarannya bukan yang tertulis di
namanya.** Uji itu diberi nama yang jujur, dan idempotensi `db_ref` diuji di
tempat penjaganya benar-benar tinggal (`test/tenantDb.test.ts`).

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **470** (dari 464) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1085** (dari 1079) |
| `node scripts/ui-sim.mjs` | 0 | **336/336** |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Cek smoke inti fase ini: **"24 INVARIAN: mendaftar TIDAK memakan slot pool"** —
membandingkan `kapasitas.terpakai` sebelum & sesudah registrasi. Kalau ia merah,
seluruh alasan menghapus trial ikut batal.

**Dibuktikan bisa gagal:** penjaga `db_ref` dilumpuhkan → uji webhook merah.
Sabotase itu pula yang membongkar temuan ke-3 di atas.

## Catatan tentang pool dev

Pool dev diperbesar ke 10 binding (produksi tetap 6). Suite smoke menjelajahi
lebih banyak perusahaan daripada produksi, dan begitu "aktivasi manual
membuatkan database" ikut diuji, slotnya habis — yang merah justru uji yang tak
berhubungan. `LOCAL_POOL` kini mengenali 1–10; kapasitas nyata tetap dihitung
dari binding yang benar-benar terpasang, jadi produksi tak berubah.

## Yang TIDAK dikerjakan

- **Checkout tetap 503 tanpa kunci Midtrans.** Orang bisa mendaftar tetapi belum
  bisa menjadi pelanggan sampai `MIDTRANS_SERVER_KEY` terpasang. Tidak ada kode
  yang bisa menghilangkan konsekuensi itu.
- **Demo 6 bulan (24b) dan landing lengkap (24c) belum dikerjakan** — dinyatakan
  apa adanya, bukan diklaim selesai.
- Kolom `trial_ends_at` dibiarkan ada di skema control-plane tetapi tidak pernah
  diisi lagi; menghapus kolom di SQLite butuh membangun ulang tabel dan tidak
  sepadan menjelang peluncuran.
