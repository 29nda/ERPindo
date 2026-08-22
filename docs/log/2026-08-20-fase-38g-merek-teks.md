# Fase 38g — merek murni teks, dan 2,7 MB yang tidak pernah diminta siapa pun

## Yang dikerjakan

Wordmark ERPindo sudah teks sejak Fase 32a, tetapi keputusan itu berhenti di
tepi aplikasi. Sub-fase ini menyelesaikannya di tiga tempat yang tertinggal:
halaman yang disajikan Worker, ikon sistem, dan berkas sumbernya.

## Tiga kerangka HTML Worker menjadi satu

`/blog`, `/blog/:slug`, dan `/api-docs` masing-masing menulis `<head>`, CSS,
header, dan footernya sendiri. Ketiganya berwarna biru `#2563eb` di atas
`#f8fafc` dengan `system-ui` — **palet yang sudah tidak ada di produk ini sejak
Fase 32a**, enam fase sebelumnya.

Akibatnya bukan sekadar tidak seragam: pengunjung yang membuka artikel dari
hasil pencarian mendarat di halaman yang tampak milik perusahaan lain, lalu
mengeklik "Daftar" dan tiba di produk yang tampak berbeda lagi.

Penggantinya `apps/api/src/lib/kerangkaPublik.ts` — satu kerangka, palet krem
yang sama, tipografi yang sama (dua berkas font stabil 104 KB di `public/font/`,
karena nama berkas Vite ber-hash dan tidak bisa dirujuk dari Worker), dan tema
gelap lewat `prefers-color-scheme`.

**Batasan yang dicatat terbuka:** SPA menyimpan pilihan tema di `localStorage`;
Worker tidak bisa membacanya, jadi halaman SSR mengikuti setelan sistem.
Alternatifnya mengirim tema lewat cookie, dan cookie tema pada halaman yang
di-cache 5 menit akan menyajikan tema orang lain.

### Uji yang mencegahnya berpisah lagi

Nilai warna di kerangka Worker adalah **salinan** dari `styles.css`, dan salinan
berpisah diam-diam — persis seperti yang baru saja terjadi selama enam fase.
`apps/api/test/token-publik.test.ts` mengurai `styles.css` dan menuntut tiap
nilainya identik, terang dan gelap. Pola yang sama dengan `FAQ_LANDING`.

## Dua rujukan berkas mati ditemukan

| Berkas | Rujukan | Sejak |
| --- | --- | --- |
| `blog.ts:86` | `/brand/logo-erpindo.png` | satu-satunya logo raster yang masih tayang setelah Fase 32a |
| `apiDocs.ts:74` | `/logo.svg` | **berkas yang tidak pernah ada di repo ini**, disembunyikan `onerror` |

Yang kedua lebih buruk daripada gambar rusak: `onerror` menyembunyikannya, jadi
tidak ada yang bisa menyadarinya dengan melihat halamannya.

## Temuan: `/api-docs` menjual paket yang sudah dibubarkan

Meta description dan badan halaman menyatakan API publik "tersedia pada paket
**Enterprise**". Paket bertingkat dibubarkan pada **Fase 30**, dan halaman
`/harga` yang baru terbit di 38d menyatakan seluruh modul terbuka.

Dua halaman publik yang saling bertentangan adalah kelas kegagalan yang lebih
mahal daripada satu halaman yang salah — pembaca yang menemukan keduanya tidak
tahu mana yang berlaku. Diperbaiki, dan ditutup dengan cek smoke.

Satu temuan serupa **dicatat tetapi belum dikerjakan**: `settings/data.tsx` dan
`settings/integrations.tsx` masih merender ajakan "Tingkatkan ke Enterprise"
pada jalur galat 403. Ia menunggu sub-fase wilayah Kelola.

## Ikon sistem dirender dari teks

`make-icons.mjs` ditulis ulang. Yang lama memotong dan menyusun ulang dua PNG
sumber seberat 2 MB; yang baru **merender SVG teks** dan tidak membaca satu
berkas gambar pun. Warnanya dibaca langsung dari `styles.css`, bukan diketik
ulang — salinan ketiga yang bisa berpisah.

Ikon kecil memakai "ERP" berserif, bukan "ERPindo": pada 64 px, sembilan huruf
menjadi noda. Pita tanah liat di kakinya yang mengikatnya ke wordmark utuh dan
ke gambar pratinjau — tanpa itu ia hanya tiga huruf gelap di atas krem, benar
tetapi tidak dikenali sebagai merek yang sama.

| Berkas | Sebelum | Sesudah |
| --- | --- | --- |
| `favicon.png` | 12 KB | **1,4 KB** |
| `pwa-192.png` | 48 KB | **3,9 KB** |
| `pwa-512.png` | 292 KB | **11,8 KB** |
| `og-image.png` | 260 KB | **40 KB** |

## Yang dihapus

- `apps/web/public/brand/` — **2,7 MB**, lima PNG. Empat di antaranya berkas
  sumber generator yang tidak pernah diminta satu permintaan pun, tetapi tetap
  disalin ke `dist/` dan disajikan pada setiap deploy.
- `scripts/brand-alfa.mjs` — keluarannya mati sejak wordmark menjadi teks.
- `includeAssets: ["brand/logo-erpindo.png"]` di `vite.config.ts` — ia memaksa
  205 KB masuk precache service worker untuk **setiap** pengguna.
- Ramp `spark-*` di `styles.css` — diturunkan dari "segitiga cyan di logo", dan
  logo itu sudah tidak ada. **Nol pemakai** di seluruh `apps/web/src`. Kosakata
  warna yang tidak dipakai bukan sekadar bobot mati: ia tawaran yang akan
  diambil orang berikutnya tanpa tahu asalnya sudah dicabut.
- Dua blok komentar usang di `ui.tsx` yang masih menerangkan wordmark raster.
- Nama manifest PWA "ERP untuk UMKM Indonesia" → "untuk perusahaan Indonesia".

## Ukuran — dan inilah angka yang dijanjikan sejak 38a

| | Awal program | Sesudah 38g |
| --- | --- | --- |
| `apps/web/public` | 7,1 MB | **172 KB** |
| `apps/web/dist` | 9,7 MB | **3,4 MB** |
| Precache PWA | 5.837 KiB | **2.719 KiB** |

Precache turun lebih dari separuh. Hipotesis "JS lebih ringan daripada gambar"
dari 38a terbukti — tetapi perlu dikoreksi arahnya: yang paling menentukan
bukan penghapusan `.webp` (yang ternyata tidak pernah masuk precache), melainkan
penghapusan **PNG merek**, yang masuk.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 892 | ✅ **913** (+21) |
| `pnpm smoke` | 1.152 | ✅ **1.157** (+5) |
| `node scripts/ui-sim.mjs` | 387 | ✅ 387 |
| `sapu-warna` · `sapu-istilah` · `sapu-gaya` | tetap | ✅ tetap |
