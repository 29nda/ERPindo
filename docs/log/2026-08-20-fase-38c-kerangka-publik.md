# Fase 38c — satu kerangka publik, dan utang warna yang ikut terbayar

## Yang dikerjakan

Fase 31c menyatukan dua header publik yang diduplikasi. Sub-fase ini
menyelesaikan pekerjaan yang sama untuk sisanya: **tiga footer, satu header
keempat, dua daftar tautan, dan satu helper `L()` yang ditulis dua kali.**

Ini dikerjakan **sebelum** enam halaman publik baru di 38d, bukan sesudahnya —
karena enam halaman itu akan menjadi footer keempat sampai kesembilan bila
dikerjakan lebih dulu.

### `PublicFooter` — tiga footer jadi satu

`Footer()` ada di `pages/landing/index.tsx:673`, `pages/fitur.tsx:184`, dan
sekali lagi sebagai HTML di `apps/api/src/routes/blog.ts:90`. Seperti pada
kasus header dulu, perbedaannya seluruhnya tak disengaja:

| | landing | /fitur |
| --- | --- | --- |
| Tagline | ada | **hilang** |
| Tautan Blog | ada | **hilang** |
| Tautan FAQ | ada | **hilang** |
| Tautan Daftar | ada | **hilang** |
| Baris hak cipta | ada | **hilang** |
| Warna | `text-slate-400` | token |

Empat di antaranya cacat nyata. `/fitur` adalah halaman yang justru dibaca
orang yang sedang **menilai** produk — dan dari kaki halamannya ia tidak punya
jalan ke blog, ke FAQ, maupun ke pendaftaran.

Versi SSR di `blog.ts` belum ikut; ia menunggu 38g bersama wordmark teksnya.

### `GuideHeader` dibubarkan

`/panduan` memakai header sendiri di luar `PublicHeader`. Empat cacatnya, dan
tiga bukan soal gaya:

1. Tombol "Masuk" dan "Daftar" ditulis **harfiah dalam bahasa Indonesia**
   (`<Button>Masuk</Button>`), jadi satu-satunya halaman publik yang tidak
   pernah ikut berbahasa Inggris — selama tujuh belas fase, tanpa ada yang
   menyadarinya.
2. Tidak ada pemilih bahasa.
3. Tidak ada satu pun tautan nav.
4. Warnanya literal: `bg-slate-50/80 dark:bg-slate-950/80` dan
   `hover:bg-slate-200/60 dark:hover:bg-slate-800`.

Penggantinya `PublicHeader` dengan prop `sub` baru, yang menuliskan
"/ Panduan" di samping wordmark.

### Dua daftar tautan menjadi satu

`TAUTAN_BERANDA` memakai jangkar telanjang (`#harga`), `TAUTAN_HALAMAN_LAIN`
memakai jangkar berjalur (`/#harga`), dengan alasan yang masuk akal: `#harga`
di `/fitur` akan menunjuk `/fitur#harga`, yang tidak ada.

Tetapi alasan itu hanya menuntut bentuk **berjalur**, bukan dua daftar. Dari
`/`, tautan `/#harga` adalah navigasi fragmen sedokumen — peramban
membandingkan seluruh bagian sebelum `#`, mendapatinya sama, dan menggulir
tanpa memuat ulang. Jadi satu daftar sudah benar di kedua tempat.

"Beranda" ikut dibuang: pada halaman lain wordmark di sebelahnya sudah menjadi
tautan ke `/`, dan pada beranda pengunjung memang sudah di sana.

### `PublicShell` akhirnya dipakai

Komponen ini ada sejak Fase 31c dan **nol pemakai** — landing dan `/fitur`
menuliskan `div` pembungkusnya sendiri, kata per kata. Kini dipakai lima
tempat, dan `fitur.tsx` berhenti menyimpan salinan `L()` miliknya sendiri.

## Utang warna: 83 / 320 → 70 / 288

Karena keempat halaman publik memang sedang disentuh, utangnya dibayar di
sub-fase yang sama — bukan ditunda menjadi pekerjaan tersendiri yang akan
tertunda lagi. `pages/fitur.tsx` kini **nol / nol**.

Tiga token baru yang membuatnya mungkin:

| Token | Kenapa perlu |
| --- | --- |
| `--erp-brand-surface` | `bg-brand-50` telanjang tetap nyaris putih di tema gelap, jadi tiap pemakainya harus mengingat pasangan `dark:`-nya sendiri |
| `--erp-accent-surface` | sama, untuk kotak sorot beraksen |
| `ok`/`awas`/`galat` (38a) | menggantikan pasangan `emerald`/`accent` beserta `dark:`-nya |

Ini menegaskan temuan 38a: selama status dan tona merek hanya bisa disebut
lewat pasangan literal, angka `dark:` tidak mungkin turun ke nol berapa pun
halaman yang dirapikan. Yang menurunkannya bukan kerapian, melainkan
kosakatanya.

## Neraca asersi ui-sim

**4 ditambah · 0 diperbarui · 0 dihapus.**

Ketiganya menguji `/fitur` dan `/panduan`, bukan beranda. Disengaja: beranda
selalu punya kerangka terlengkap justru karena ia yang disalin — yang perlu
dijaga adalah halaman salinannya.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 681 | ✅ 681 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 366 | ✅ **370** (+4) |
| `sapu-warna` | 83 / 320 | ✅ **70 / 288** |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |
