# Fase 30d–30f — skala 1000 perusahaan & pemantauan

Tiga pekerjaan dalam satu commit. Rencana memisahkannya menjadi tiga sub-fase,
tetapi ketiganya menyentuh `routes/admin.ts` dan `smoke.mjs` pada bagian yang
bertumpang tindih — memisahkan commit-nya akan menghasilkan tiga commit yang
tak satu pun bisa lulus gerbang sendirian, dan commit yang tidak hijau bukan
titik yang bisa dijadikan acuan.

## 30d — Migrasi tenant berbatch & resumable

`migrateAllTenants` memutari **seluruh** tenant dalam **satu** request. Pada
enam tenant itu tak terasa; pada 1.000 tenant di mode `cloudflare` setiap tenant
berarti belasan panggilan REST ke D1, sehingga batas 10.000 subrequest dan CPU
5 menit **pasti** tertembus. Cara ia gagal adalah yang terburuk: mati di tengah,
sebagian tenant termigrasi dan sebagian tidak, tanpa penanda posisi.

Diganti `migrateTenantBatch(env, batas = 25)`:

- Kueri hanya mengambil yang **tertinggal**, dibatasi `LIMIT`. Versi lama
  menarik semua lalu melewati yang mutakhir di dalam loop — pekerjaan sia-sia
  tepat pada jumlah yang membuatnya mahal.
- Hasil hanya memuat yang **disentuh**. Versi lama mengembalikan satu baris per
  tenant termasuk yang tak diapa-apakan, sehingga respons endpoint admin tumbuh
  linear terhadap jumlah pelanggan.
- Urut `schema_version` menaik: yang paling tertinggal ditangani lebih dulu.
- `sisa` dihitung ulang SESUDAH batch, bukan diperkirakan dari selisih — tenant
  yang gagal tetap terhitung tertinggal, dan `selesai` tetap `false` bila masih
  ada. Kabar baik palsu di sini akan membuat cron berhenti memanggil.

Cron menjalankan satu batch per hari sampai `sisa` nol; migrasi malas per-tenant
di middleware tetap menjadi jaring pengaman.

## 30e — Rate limit lepas dari kuota tulis KV

`rateLimit.ts` menulis satu entri KV pada **setiap** request terjaga. Kuota
tulis KV paket gratis adalah **1.000/hari** — tembok yang datang jauh sebelum
batas 100.000 request/hari yang biasa disangka mengikat.

Backend-nya pindah ke **Durable Object** (`lib/rateLimiter.ts`). DO tersedia di
paket gratis maupun berbayar dan tidak memakan kuota KV sama sekali.

**Kenapa bukan binding `ratelimit` bawaan Cloudflare** (GA sejak September
2025): periodenya hanya menerima 10 atau 60 detik, sedangkan seluruh endpoint
auth di repo ini memakai jendela **300 detik**. Memaksakannya ke 60 detik
mengubah perilaku yang sudah diuji — 5 percobaan per 5 menit tidak sama dengan
5 per menit, dan bedanya justru pada brute-force yang lambat.

Ketepatannya ikut naik. Komentar KV lama mengakui sendiri: *"eventually-
consistent; untuk pembatasan kasar ini cukup"* — artinya dua request bersamaan
bisa sama-sama lolos. Durable Object single-threaded per kunci, jadi hitungannya
tepat. Yang dicabut adalah biayanya, yang didapat adalah kebenarannya.

Bila binding `RATE_LIMITER` absen, pembatasan **dilewati** alih-alih
menggagalkan request — pola degradasi anggun yang sudah baku di repo ini.
Menggagalkan seluruh request karena pembatas tak terpasang akan mengubah fitur
pelindung menjadi titik kegagalan tunggal.

## 30f — Dasbor: hitungan yang benar, metrik bisnis, monitor kuota

**Hitungan tenant tertinggal diperbaiki.** `tenantsBehind` diisi
`behind.results.length` — panjang daftar yang ber-`LIMIT 100`. Pada enam tenant
angkanya kebetulan benar; pada 1.000 tenant tertinggal ia melaporkan "100" dan
**tetap 100** sepanjang cron mencicilnya, sehingga pemilik tidak bisa
membedakan seratus dari seribu dan tidak melihat kemajuan sama sekali.
Jumlahnya kini dihitung terpisah dari contohnya.

**Metrik bisnis** di `/admin/overview`: MRR, pelanggan membayar (dipecah aman /
masa tenggang / comped), churn 30 hari, umur langganan rata-rata. Sampai fase
ini dasbor hanya menghitung badan — berapa user, berapa tenant — sementara angka
yang menentukan apakah usahanya hidup tidak dihitung di mana pun.

Dua keputusan yang disengaja: **comped tidak masuk MRR** (pendapatan yang tak
pernah ditagih bukan pendapatan, dan MRR yang digelembungkan olehnya adalah cara
paling mudah menipu diri sendiri), dan **masa tenggang tetap dihitung** (mereka
belum pergi, hanya terlambat). Seluruhnya dari control-plane, bukan dari Xendit —
pelanggan yang diaktifkan lewat transfer manual sama nyatanya.

**Monitor kuota** (`/admin/kuota`): pemakaian 24 jam terhadap batas paket
gratis, dengan peringatan di **70%**. Tanpa ini, cara pemilik mengetahui
kuotanya habis adalah pelanggan menelepon karena aplikasinya mati — titik ketika
menaikkan paket sudah terlambat.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 592 | ✅ **597** (shared 282 · web 71 · api 244) |
| `pnpm smoke` | 1.118 | ✅ **1.129** |
| `node scripts/ui-sim.mjs` | 350 | ✅ **356** |
| `sapu-i18n` utang teks | 145 | ✅ 145 |

**Total 2.082 pemeriksaan** (dari 2.060).

Bukti yang paling menentukan bukan angka itu, melainkan **`pnpm smoke` lulus
utuh dengan konfigurasi Durable Object yang baru**. Smoke menjalankan `wrangler
dev` memakai `wrangler.jsonc` nyata, jadi blok `durable_objects` + `migrations`
yang salah akan menggagalkan gerbang **sebelum** merge — bukan menggagalkan
deploy produksi. Dan cek lama *"batas laju form publik menutup penyiraman
berulang → 429"* tetap hijau: pembatasnya benar-benar bekerja lewat Durable
Object di runtime Worker sungguhan, bukan hanya di tiruan unit.

Uji baru:

- **50 tenant tiruan** membuktikan migrasi berhenti di batas batch, **melanjutkan
  dari posisi terakhir** (tak satu pun tenant batch pertama muncul lagi), dan
  panggilan sesudah selesai tidak mengerjakan apa pun.
- Tiruan control-plane di uji **kini menghormati `WHERE` dan `LIMIT`**. Tiruan
  yang mengabaikan klausa penyaring akan meluluskan migrasi "berbatch" yang
  sebenarnya tidak berbatch — persis cacat yang uji itu ada untuk mencegahnya.
- Request yang **ditolak** rate limiter tidak menulis status apa pun. Versi KV
  menulis juga saat menolak, sehingga penyerang yang membanjiri endpoint login
  justru mempercepat habisnya kuota tulis — pembatas yang seharusnya melindungi
  menjadi jalur menjatuhkan.
- Penegak pencabutan: middleware tidak boleh menyentuh `RATE_KV` sama sekali.

## Catatan kejujuran

**Rencana salah menebak cacat `/admin/infra`.** Rencana menyebut endpoint itu
berat karena `SELECT db_ref FROM tenants` menyentuh tiap slot. Membacanya ulang
menunjukkan kueri itu hanya berjalan di mode pool lokal — yang menurut definisi
maksimal sepuluh baris. Jadi bukan itu masalahnya. Masalah sebenarnya adalah
hitungan `tenantsBehind` yang terkunci di 100, dan itu justru **tidak** ada di
rencana. Pekerjaan yang direncanakan (paginasi) tidak dikerjakan karena tidak
diperlukan; yang dikerjakan adalah cacat yang benar-benar ada.

**Kueri GraphQL monitor kuota BELUM diverifikasi terhadap akun Cloudflare
sungguhan.** Tokennya milik pemilik dan tidak tersedia di lingkungan
pengembangan. Karena itu seluruh pembacaan memakai optional chaining dan
dibungkus try/catch: bila bentuk responsnya ternyata berbeda, hasilnya kartu
"tidak bisa membaca kuota" yang menjelaskan dirinya — bukan dasbor yang meledak.
Jalur terdegradasinya **diuji deterministik** di smoke (tanpa token →
`configured:false` + pesan yang menyebut secret yang harus dipasang). Verifikasi
terhadap akun nyata masuk daftar langkah pemilik.

**Dasbor admin dulu tanpa cakupan peramban sama sekali.** Satu-satunya keadaan
halaman ini yang pernah dilihat ui-sim adalah layar penolakan, karena akun
simulasinya bukan admin platform. Kini akun itu dijadikan admin platform
sehingga isinya benar-benar dirender — dan penjaga yang hilang karenanya
(*"menu Admin tersembunyi untuk pengguna biasa"*) dipindahkan ke **sesi demo**,
yaitu pengguna biasa yang paling realistis, ditambah asersi baru bahwa rute
`/app/admin` benar-benar **menolak**, bukan sekadar menyembunyikan menunya.
Cakupannya bertambah, tidak ada yang ditukar.

## Berikutnya

Fase 30c — demo 12 bulan, diverifikasi dengan kueri nyata.
