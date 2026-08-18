# Fase 32d — judul halaman serif & 35 gambar produk

Sub-fase penutup perombakan desain. Dua hal terakhir yang belum sesuai keputusan
pemilik.

## 1. Judul halaman aplikasi ikut serif

Keputusan pemilik berbunyi: *"Landing **dan judul halaman** memakai serif;
seluruh tabel, angka, dan label tetap sans + mono."*

Fase 32a baru mengerjakan sisi landing-nya. Judul halaman aplikasi masih sans —
terlihat jelas begitu gambar `hero-dashboard` yang baru dibuka: "Selamat sore,
Dewi" tampil sans di antara halaman yang seluruhnya sudah krem.

Diperbaiki di `PageHeading` (`components/ui.tsx`) plus 12 berkas halaman yang
menulis `<h1 className="text-2xl font-semibold">` sendiri.

`CardHeader` **sengaja tetap sans**. Serif di kepala kartu merembet ke seluruh
layar kerja — dan itu melawan "aplikasi tetap padat" yang dipilih pemilik di
pertanyaan yang sama.

## 2. 35 gambar produk diregenerasi

6 gambar landing + 29 panduan, lewat `scripts/screenshots.mjs`. Seluruhnya masih
memotret palet biru dan sejak 32a justru **bertentangan** dengan halamannya.

**Urutannya disengaja.** Judul serif dipasang **lebih dulu**, baru gambar
diregenerasi. Kebalikannya berarti 35 gambar itu langsung basi lagi begitu judul
berubah, dan harus dikerjakan dua kali.

`sharp` perlu dipasang lebih dulu — ada di store pnpm tetapi tidak tertaut ke
`node_modules` akar.

### Diverifikasi dengan MELIHAT, bukan dengan status skrip

Skrip bisa melaporkan sukses sambil menghasilkan gambar berlatar biru — misalnya
bila `wrangler dev` menyajikan build lama. Tiga gambar dibuka satu per satu:

| Gambar | Yang terbukti |
| --- | --- |
| `landing/hero-dashboard` | latar krem, batang grafik tanah liat, wordmark "ERP*indo*" baru, rail 7 wilayah kerja |
| `landing/showcase-laporan` | judul "Laba Rugi" **serif**, angka rupiah tetap mono berbaris rapi |
| `panduan/pos-1` | krem ikut sampai ke set panduan, tombol utama tanah liat |

## Regresi yang saya buat sendiri — dan sudah diperbaiki

`aria-label="ERPindo"` yang saya pasang pada wordmark di Fase 32a menaikkan
utang **teks tampilan di atribut dari 0 menjadi 1**.

Dan penyapu itu benar. Label tersebut juga salah secara aksesibilitas: sejak
wordmark menjadi teks sungguhan di DOM, `aria-label` **menimpa** isi yang dibaca
pembaca layar — ia mengulang apa yang sudah ada sambil membuang strukturnya.

Diganti `data-wordmark` (penanda yang memang khusus untuk uji, bukan atribut
yang dibaca siapa pun), dan selektor asersi `F1a` ikut disesuaikan. Utang
atribut kembali **0**.

## Koreksi atas laporan saya sendiri

Saya melaporkan utang teks i18n **145** berulang kali sejak Fase 31 — di log,
di badan PR, dan di ringkasan ke pemilik.

Diukur ulang di `main` sebelum Fase 32 (`ca9593f`): angkanya **147**. Ia naik di
suatu titik selama Fase 31 tanpa saya sadari, dan saya terus menyalin angka lama
alih-alih mengukur ulang.

Akibat praktisnya kecil — Fase 32 tidak menaikkannya, dan penyapu i18n memang
hanya keluar dengan kode 1 untuk satu kelas bug tertentu, bukan untuk totalnya.
Tetapi angka yang disalin tanpa diukur ulang adalah persis bentuk kesalahan yang
repo ini sudah beberapa kali catat: laporan yang terlihat presisi justru karena
tidak pernah diperiksa. Ambang yang benar adalah **147**.

## Validasi

| Gerbang | Ambang | Hasil |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | ≥ 611 | ✅ 611 |
| `pnpm smoke` | ≥ 1.132 | ✅ 1.132 |
| `node scripts/ui-sim.mjs` | ≥ 361 | ✅ 361 |
| `sapu-warna` | ≤ 85 / 327 | ✅ 85 / 327 |
| `sapu-i18n` | ≤ 147 layar · 0 atribut | ✅ 147 · 0 |
| `periksa-tautan-dokumen` | hijau | ✅ |

## Batas bukti yang masih berlaku

Situs rujukan (`anthropic.com`) **tidak bisa saya buka** — proxy lingkungan ini
memblokir domainnya. Palet krem diturunkan dari pemahaman atas bahasa desainnya,
bukan dari sampel piksel seperti yang dilakukan pada logo di Fase 31a.

Konsekuensinya sudah dibuat semurah mungkin sejak awal: bila arahnya meleset,
yang perlu diubah hanya satu blok nilai di `styles.css` — bukan 50 halaman,
bukan tata letak, dan bukan 35 gambar (yang tinggal diregenerasi ulang dengan
satu perintah).
