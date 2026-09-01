# Fase 52c — kelas yang muncul enam kali, akhirnya dijadikan gerbang

`db_ref = ''` (`TANPA_DB`) adalah keadaan **sah**: perusahaan sudah mendaftar,
belum membayar, jadi databasenya memang belum dibuat. Ia juga bisa terjadi pada
tenant ber-status `active` — "sudah membayar, provisioning tertunda", keadaan
yang dicatat sendiri oleh webhook billing.

`getTenantDb(env, "")` melempar. Jadi setiap kueri yang mengambil `db_ref` lalu
menyerahkannya ke `getTenantDb` harus menyaring keadaan itu, atau memeriksanya
sendiri.

## Enam kemunculan

| Fase | Tempat | Akibatnya |
| --- | --- | --- |
| 50e | cron migrasi skema | tercatat GAGAL tiap jalannya, selamanya |
| 50e | kartu kapasitas Admin | dihitung "tertinggal" tanpa bisa disusul |
| 52b | konsolidasi (3 endpoint) | 500 pada SELURUH laporan |
| **52c** | **formulir lead publik** | **500 yang dilihat PENGUNJUNG** |
| **52c** | **link pembayaran** | 500 alih-alih penjelasan |
| **52c** | **tiga cron harian/bulanan + backup Drive** | galat tercatat tiap jalannya |

`middleware/auth.ts` sudah lebih dulu memetik pelajarannya — komentarnya
berbunyi *"Penjaganya sengaja menguji `db_ref`, BUKAN status"* — tetapi
pelajaran yang hanya hidup di satu berkas akan dilanggar di berkas lain. Enam
kemunculan adalah buktinya.

Yang paling perlu diperbaiki dari ketiganya: **formulir lead publik**. Ia
menyaring `status IN ('active','past_due')` lalu langsung memanggil
`getTenantDb`. Tenant yang sudah membayar tetapi provisioningnya tertunda lolos
saringan itu, dan yang melihat 500-nya adalah pengunjung — bukan pemiliknya,
yang bahkan tidak akan tahu.

## Gerbangnya

`apps/api/test/tenantTanpaDb.test.ts`: setiap kueri di `apps/api/src` yang
menyebut `db_ref` harus menyaring `db_ref <> ''`, atau terdaftar di
`DIKECUALIKAN` beserta alasannya. Pengecualiannya nyata dan perlu — menghitung
sisa slot pool justru **wajib** melihat semua baris, termasuk yang kosong.

Kuncinya cuplikan kuerinya sendiri, bukan nomor baris: nomor baris bergeser tiap
kali berkasnya disunting, dan pengecualian yang menunjuk baris salah adalah
pengecualian yang diam-diam melindungi kueri yang keliru. Ada asersi tersendiri
yang menolak pengecualian yang tidak lagi cocok dengan kueri mana pun.

### Pemindainya sendiri sempat punya titik buta

Versi pertama mencocokkan pasangan backtick, dan karena itu **melewatkan kueri
di `routes/billing.ts`**: ada 37 backtick sebelum kueri itu — ganjil — sehingga
pasangannya bergeser dan blok yang dibaca bukan blok yang benar.

Dicatat karena bentuk kegagalannya persis yang sedang dijaga berkas ini: gerbang
yang diam-diam memeriksa lebih sedikit daripada yang ia klaim. Diganti ke
pencocokan kurung pada `prepare(`, yang tidak bergantung pada jumlah backtick.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` | lulus | ✅ lulus |
| `pnpm test` (unit) | 1.144 | ✅ **1.147** (+3) |
| `pnpm build` | lulus | ✅ lulus |
| `pnpm smoke` | 1.310 | ✅ 1.310 |
| `node scripts/ui-sim.mjs` | 480 | ✅ 480 |
| `pnpm lint` | bersih | ✅ bersih |
| `sapu-warna` · `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |
| `periksa-tautan-dokumen` | lulus | ✅ lulus |

Total pemeriksaan: **2.937**.

Uji negatif: melepas saringan di konsolidasi membuat gerbangnya memerah dan
menyebut kuerinya persis.
