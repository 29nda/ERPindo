# Fase 30j — alamat produksi diperbaiki & `APP_URL` dipasang

Pemilik memberikan alamat produksi yang sebenarnya:
`https://erpindo.29nurudhuhaalamin.workers.dev`. Subdomainnya
**`29nurudhuhaalamin`**, bukan `nurudhuhaalamin` seperti yang tertulis di repo.

Satu informasi kecil itu membuka empat hal, dan yang terbesar sama sekali bukan
soal alamat.

## 1. Alamat salah di tiga tempat — satu di antaranya memblokir pemilik

`.github/workflows/seed-demo.yml:26`, `.github/workflows/ai-probe.yml:17`, dan
`docs/06-tutorial-peluncuran.md:15`.

Yang paling merugikan adalah **`seed-demo.yml`**. Workflow itu dimulai dengan
`curl -sf "$BASE_URL/api/health"`, jadi langkah nomor satu di
`docs/langkah-pemilik.md` — "semai ulang demo" — akan **mati di baris pertama**
dengan galat jaringan yang tidak menyebutkan sebabnya sama sekali.

Log Fase 30h menyebut `ai-probe.yml` sebagai satu-satunya berkas bermasalah.
Itu keliru: `seed-demo.yml` punya cacat yang sama dan dampaknya jauh lebih
besar, karena ia yang menghalangi langkah yang sedang diminta dikerjakan.

## 2. `APP_URL` tidak pernah dipasang — temuan terbesar fase ini

`APP_URL` dipakai di tujuh berkas tetapi **tidak ada di `wrangler.jsonc`**, jadi
nilainya `undefined` di produksi. Dua akibat, keduanya diam:

**Ketiga email siklus langganan terkirim tanpa tautan.** Pola
`env.APP_URL ? tautan : "Buka menu Pengaturan."` ditulis tiga kali di
`index.ts` — pengingat sebelum berakhir (baris 359), masuk masa tenggang (316),
dan masih baca-saja (407). Ketiganya adalah email yang paling menentukan
pendapatan, dan ketiganya kehilangan satu-satunya tombol yang membuat
pemiliknya bisa membayar.

Tidak ada gerbang yang melihatnya, dan alasannya penting: **emailnya tetap
terkirim dan tetap berbunyi masuk akal.** Yang hilang hanya tautannya.

**Tautan verifikasi email & reset password bergantung header Host.**
`appOrigin(c)` jatuh ke `new URL(c.req.url).origin` — bentuk klasik
*password-reset poisoning*. Di `*.workers.dev` routing mengikat hostname
sehingga sulit dieksploitasi, tetapi domain sendiri sudah ada di roadmap, dan
di sana celahnya menjadi nyata. Memasang `APP_URL` menutupnya sekarang.

### Jebakan yang harus ditutup bersamaan

`scripts/make-dev-config.mjs` menurunkan config dev dari `wrangler.jsonc` dan
hanya membuang binding `ai`. Tanpa perubahan, `APP_URL` produksi ikut terbawa ke
`wrangler dev` — lalu `setSessionCookie` menyetel
`secure: appUrl.startsWith("https://")`, sehingga cookie sesi ditandai Secure di
atas `http://127.0.0.1`. Peramban membuangnya diam-diam, tidak ada sesi yang
terbentuk, dan **seluruh smoke + ui-sim runtuh di langkah login** — dengan
ratusan cek tak berhubungan yang memerah, jauh dari sebabnya.

Karena itu `make-dev-config.mjs` kini membuangnya, **beserta koma pendahulu dan
blok komentarnya**: menyisakan komanya menghasilkan koma menggantung sebelum
`}`. JSONC memang memaafkannya, tetapi bergantung pada toleransi parser untuk
berkas yang menyalakan produksi adalah taruhan yang tak perlu.

## 3. Ternary yang disalin tiga kali → satu fungsi teruji

`tautanPengaturan(appUrl, cadangan)` di `lib/dunning.ts`. Sebagai ternary yang
disalin tiga kali, perilakunya hanya bisa diperiksa dengan membaca — dan membaca
sudah melewatkannya selama berbulan-bulan. Sebagai fungsi, ia bisa dikunci uji.

Enam uji baru, termasuk dua keadaan salah-pasang yang paling mudah terjadi:
`APP_URL` bernilai **string kosong** (menghasilkan tautan relatif
`/app/pengaturan` yang tidak bisa diklik di dalam email) dan `APP_URL`
berakhiran garis miring (menghasilkan `//app/pengaturan`).

## 4. Koreksi atas klaim saya sendiri — dan kali ini klaimnya benar

Fase 30h menyatakan "egress ke `*.workers.dev` diblokir proxy". Buktinya lemah:
dua URL yang dicoba adalah subdomain yang salah dan hostname yang bukan alamat
worker sama sekali — jadi HTTP 000-nya bisa saja kegagalan DNS.

Diuji ulang dengan hostname yang benar. **Klaimnya ternyata benar**, dan kini
ada buktinya: status proxy mencatat
`connect_rejected — erpindo.29nurudhuhaalamin.workers.dev:443` pada 07:53.
DNS-nya resolve; yang menolak adalah gateway, dengan `403` pada CONNECT.

Konsekuensinya jujur: **produksi tidak bisa saya buktikan hidup dari sini.**
Skema control-plane karena itu masih kosong — ia terbentuk pada request pertama
yang masuk (`ensureMigrated`, middleware global). Membuka alamatnya sekali kini
menjadi **langkah 0** di daftar pemilik, dengan alasan dan cara
memverifikasinya. Paling lambat cron harian 01:17 UTC melakukannya sendiri.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 597 | ✅ **603** (shared 282 · web 71 · api 250) |
| `pnpm smoke` | 1.129 | ✅ **1.130** |
| `node scripts/ui-sim.mjs` | 356 | ✅ 356 |
| `sapu-i18n` utang teks | 145 | ✅ 145 |

**Total 2.089 pemeriksaan.**

### Penjaga barunya dibuktikan bisa gagal

Cek smoke "var produksi tidak bocor ke konfigurasi dev" **disabotase dengan
sengaja** — penghapusan `APP_URL` dimatikan — lalu smoke dijalankan ulang:

```
✗ Var produksi bocor ke wrangler.dev.jsonc: APP_URL
```

Merah seperti seharusnya, lalu dipulihkan. Ini mengikuti disiplin yang sudah
tercatat di repo sejak Fase 26c: uji yang tidak bisa gagal tidak menjaga apa
pun. Ceknya juga sengaja dibuat **berpola daftar**, bukan satu kondisi — var
produksi apa pun yang ditambahkan kelak dan lupa dibuang akan tertangkap
mekanisme yang sama.

Ia juga diletakkan **sebelum server dinyalakan**, supaya kegagalannya menyebut
sebabnya alih-alih memaksa penyelidik menelusuri ratusan cek merah.
