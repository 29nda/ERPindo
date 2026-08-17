# Fase 31c — kerangka publik tunggal & FAQ satu sumber

## Koreksi terhadap premis saya sendiri

Pemilik menyebut *"teksnya juga mayoritas masih duplikat"*. Rencana Fase 31
menerjemahkannya sebagai duplikasi **internal** dan menjadwalkan pembangunan
`packages/shared/src/modul.ts` untuk menyatukan deskripsi modul yang katanya
ditulis ulang di 3–7 sumber.

Sebelum membangunnya, klaim itu diukur: seluruh frasa ≥12 karakter dari
`landing/sections.ts`, `landing/fiturDetail.ts`, dan `pages/panduan/content/*`
dinormalkan lalu dibandingkan.

| | Jumlah |
| --- | --- |
| Frasa unik diperiksa | 488 |
| Frasa **identik** di lebih dari satu sumber | **8** |

Kedelapannya adalah nama modul pendek ("Laporan Keuangan", "Manufaktur & QC"),
bukan prosa. Deskripsinya memang berbeda per sumber, dan itu benar: landing
adalah pitch singkat, `/fitur` berpola masalah→cara→hasil, panduan berisi
langkah. **Membangun `modul.ts` berarti membuat abstraksi untuk masalah yang
tidak ada**, jadi rencananya dibatalkan.

Yang lebih mungkin dimaksud pemilik — dan cocok dengan kalimat sebelumnya
tentang aplikasi lama — adalah teks yang **masih sama dengan aplikasi di ZIP**,
bukan teks yang berulang di dalam repo. Itu dijawab dengan menulis ulang naskah,
bukan dengan abstraksi.

Namun pengukuran yang sama membuka dua duplikasi nyata yang tidak ada di
rencana, dan salah satunya cacat sungguhan.

## 1. FAQ ditulis dua kali, dan keduanya sudah berpisah

| Tempat | Isi |
| --- | --- |
| `apps/api/src/routes/landingSeo.ts` | 5 tanya-jawab, Indonesia saja → JSON-LD `FAQPage` + `<noscript>` |
| `apps/web/src/pages/landing/sections.ts` | 11 tanya-jawab dwibahasa → yang dilihat manusia |

Komentar di sisi server berbunyi *"selaras dengan FAQ di landing"*.
**Tidak satu pun pertanyaannya sama.**

Ini bukan soal kerapian. Panduan data terstruktur Google menuntut isi `FAQPage`
benar-benar tampak di halaman yang sama; markup yang menjanjikan jawaban yang
tidak ada di halaman bisa membuat rich result dicabut. Jadi selama ini Google
menerima lima tanya-jawab yang tidak bisa ditemukan di halamannya.

Tidak ada gerbang yang bisa melihatnya, dan sebabnya penting: **tidak ada satu
berkas pun yang memuat kedua daftar**, jadi tidak ada tempat untuk
membandingkannya.

**Perbaikan.** `packages/shared/src/landing.ts` menjadi satu-satunya sumber.
`FAQ_RICH_RESULT` diturunkan dari `FAQ_LANDING.slice(0, 5)` — diambil, bukan
disalin, sehingga secara konstruksi mustahil berpisah. Karena
`@erpindo/shared` diimpor `apps/api` maupun `apps/web`, kedua sisi kini membaca
daftar yang sama.

Naskahnya ditulis ulang seluruhnya (9 tanya-jawab): yang lama masih menyebut
"pilihan paket" yang sudah tidak ada sejak harga tunggal diberlakukan.

**Tujuh uji baru** di `packages/shared/test/landing.test.ts`, termasuk dua yang
menjaga kegagalan paling mudah terjadi: sisi Inggris disalin mentah dari
Indonesia, dan janji "masa coba gratis" yang produknya tidak punya.

Dibuktikan bisa gagal: `FAQ_RICH_RESULT` dikembalikan menjadi daftar terpisah
(persis pola lama) → **3 uji merah**, lalu dipulihkan.

## 2. `Header()` ditulis dua kali — dan tiga perbedaannya adalah cacat

`pages/landing/index.tsx:40` dan `pages/fitur.tsx:30`, hampir identik:

| | landing | `/fitur` |
| --- | --- | --- |
| Daftar tautan | `NAV_LINKS` | array literal di dalam fungsi |
| Tombol "Masuk" | ada | **hilang** |
| Pemilih bahasa di drawer | ada | **hilang** |
| Sasaran sentuh tombol menu | `p-1.5` (±32px) | `size-11` (44px) |
| Padding tombol tema | `p-1.5` | `p-2` |

Tiga baris pertama bukan beda gaya melainkan cacat: pengunjung `/fitur` tidak
punya jalan ke halaman masuk dari bilah atas dan tidak bisa mengganti bahasa
dari drawer, sementara tombol menu di landing berada **di bawah ambang sentuh
44px** yang sudah ditetapkan repo sejak Fase 18c — padahal itu satu-satunya
jalan ke menu di layar kecil.

`components/publik.tsx` menyatukannya menjadi `PublicHeader` + `PublicShell`.
Ketiga cacat tertutup sekaligus, dan kelasnya ikut tertutup: halaman publik
berikutnya tidak akan menyalin bilah keempat.

Lint menjadi buktinya. Setelah kedua `Header` dibuang, ESLint menemukan **14
impor mati** yang tertinggal — bukti bahwa yang dihapus memang benar-benar
dipakai hanya oleh salinan itu.

**−159 baris, +8 baris.**

## Yang BELUM dikerjakan di sub-fase ini

Susunan 12 bagian landing (hero → trust bar → showcase → grid fitur →
perbandingan → kalkulator → perbandingan kategori → harga → keamanan → FAQ →
CTA → footer) **belum diringkas**. Itu bagian terbesar dari keluhan "mirip
aplikasi lama" untuk halaman depan, dan dikerjakan terpisah — sub-fase ini
menyiapkan fondasinya (kerangka publik tunggal + sumber naskah tunggal) supaya
penulisan ulangnya tidak perlu menyentuh dua tempat.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 603 | ✅ **610** (shared 289 · web 71 · api 250) |
| `pnpm smoke` | 1.130 | ✅ 1.130 |
| `node scripts/ui-sim.mjs` | 360 | ✅ 360 |
| `sapu-warna` slate-* / `dark:` | 106 / 344 | ✅ **88 / 335** |
| CSS hasil build | 83.698 B | ✅ **83.402 B** |

Ambang `sapu-warna` diturunkan ke 88/335 supaya tidak bisa naik lagi.
