# Fase 31e — admin master, riwayat padat, sisa mati

## 1. Akun master pemilik

Dua var dipasang di `wrangler.jsonc`:

```jsonc
"PLATFORM_ADMIN_EMAILS": "29nurudhuhaalamin@gmail.com",
"COMPED_EMAILS": "29nurudhuhaalamin@gmail.com"
```

`PLATFORM_ADMIN_EMAILS` membuka menu & rute `/app/admin` — pemantauan pendaftar,
langganan, MRR/churn, blog, dan masukan (`middleware/auth.ts:60`).
`COMPED_EMAILS` membuat tenant-nya `active` tanpa `subscription_ends_at`,
sehingga akun ini tidak pernah terkena paywall (`routes/auth.ts:159`).

Keduanya sudah ada, teruji, dan dipakai smoke sejak Fase 4a — tidak ada kode
baru yang perlu ditulis untuk permintaan ini.

### Kata sandi tidak masuk repo, dan itu bukan kelalaian

Pemilik meminta sandi `@Dhuha2901+` "tertanam sebagai master". Yang ditanam
adalah **alamat emailnya saja**. Repo ini ada di GitHub: sandi yang ter-commit
ikut ter-clone oleh siapa pun yang mengambil repo, dan tetap tinggal di riwayat
git meski dihapus pada commit berikutnya — menghapusnya menuntut menulis ulang
seluruh riwayat.

Alurnya: pemilik mendaftar sekali lewat `/daftar` seperti pengguna biasa dengan
sandi pilihannya sendiri, dan akun itu **langsung** menjadi master karena
emailnya cocok. Karena sandi tadi sudah terkirim lewat percakapan, sebaiknya
dipakai sandi lain.

### Diperiksa, bukan diasumsikan

Kedua var ikut terbawa ke konfigurasi dev. Itu diperiksa dan aman: smoke
menimpa `COMPED_EMAILS` lewat `--var` pada baris perintah `wrangler dev`, dan
`PLATFORM_ADMIN_EMAILS` tidak berpengaruh karena tak satu pun uji mendaftarkan
email itu. Konfigurasi dev hasil generasi juga diverifikasi tetap JSONC yang
sah setelah `APP_URL` dibuang dari tengah blok, bukan lagi dari ujungnya.

## 2. Penjaga kebocoran var diperbaiki — komentarnya berbohong

Cek Fase 30j berbunyi *"Polanya sengaja umum: var produksi apa pun yang
ditambahkan kelak dan lupa dibuang akan tertangkap oleh cek yang sama."*
Kodenya `["APP_URL"].filter(...)` — **daftar harfiah berisi satu nama**. Var
`https://` berikutnya akan lolos diam-diam, persis kebalikan dari yang
dijanjikan komentarnya.

Kini yang diperiksa adalah **kelas bahayanya**: nilai apa pun berawalan
`https://` di konfigurasi dev, karena awalan itulah yang membuat
`setSessionCookie` menyetel `secure: true` di atas `http://127.0.0.1`.

## 3. 258 log fase → satu `docs/riwayat.md`

| | Sebelum | Sesudah |
| --- | --- | --- |
| Berkas di `docs/log/` | 258 | **3** (program berjalan saja) |
| Baris | 18.972 | **370** |

`docs/riwayat.md` (±150 baris) menyimpan **keputusan yang masih mengikat beserta
alasannya**, bukan catatan pekerjaan: arsitektur yang tidak boleh dibalik,
larangan yang sudah diputuskan, disiplin mutu berikut kapan tiap gerbang
dijadikan wajib, dan — bagian yang paling terbukti berguna — **bentuk cacat yang
sudah berulang** di repo ini.

Ekstraksi otomatis dicoba lebih dulu dan **dibuang**: penanda tekstual
("JANGAN", "tidak boleh", "keputusan") menghasilkan 40 berkas yang isinya
detail implementasi, bukan keputusan. Riwayat yang berguna harus dikurasi.

`CLAUDE.md` diperbarui: `docs/log/` kini hanya untuk program yang sedang
berjalan; log program yang selesai dipadatkan ke `docs/riwayat.md`.

## 4. Penjaga baru: tautan dokumen

Penghapusan itu meninggalkan **21 rujukan menggantung**, dua di antaranya di
`docs/STATUS.md` dan `docs/05-runbook-go-live.md` — dokumen yang justru dibaca
pemilik saat meluncurkan. Markdown tidak dikompilasi, jadi tautan mati tidak
pernah memunculkan galat sampai ada yang mengekliknya.

`scripts/periksa-tautan-dokumen.mjs` menutupnya, dipasang di CI.

### Skrip itu sendiri sempat salah, dan salahnya instruktif

Versi pertama melaporkan **30** tautan putus, sembilan di antaranya palsu. Ia
menyamakan dua bentuk yang titik acuannya berbeda:

| Bentuk | Acuan |
| --- | --- |
| `[teks](path)` | relatif terhadap berkas yang memuatnya (aturan Markdown) |
| sebutan jalur dalam backtick | dari **akar repo**, bukan tautan Markdown |

Menyamakannya membuat `docs/STATUS.md` yang disebut dari dalam `docs/` dicari
sebagai jalur berlipat `docs/` dua kali. Pola contoh ber-`YYYY-MM-DD` juga ikut
terhitung sebagai tautan. Keduanya diperbaiki; angkanya turun ke 21 yang
seluruhnya nyata, lalu ke 0 setelah diperbaiki.

Dibuktikan bisa gagal: satu tautan ke log yang sudah dihapus ditambahkan ke
`docs/STATUS.md` → skrip keluar dengan kode 1 dan menyebut berkasnya.

## 5. Sisa mati

`scripts/ui-sim.mjs` masih mendatangi `/daftar?paket=business`. `PLANS` menjadi
`["lengkap"]` sejak Fase A, jadi parameter itu tidak menunjuk apa pun sejak
berbulan-bulan lalu. Dibuang.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 610 | ✅ 610 |
| `pnpm smoke` | 1.130 | ✅ 1.130 |
| `node scripts/ui-sim.mjs` | 360 | ✅ 360 |
| `sapu-warna` | 88 / 335 | ✅ 88 / 335 |
| `periksa-tautan-dokumen` | — | ✅ **baru**, 60 tautan |

## Yang menunggu pemilik untuk butir 1

Verifikasi akun master **hanya bisa dilakukan di produksi**, bukan di dev:
daftar di <https://erpindo.29nurudhuhaalamin.workers.dev/daftar> dengan
`29nurudhuhaalamin@gmail.com`, lalu buka **Admin** di menu Kelola. Halaman itu
menolak (403) semua email lain — terbukanya halaman itulah buktinya var terbaca.
