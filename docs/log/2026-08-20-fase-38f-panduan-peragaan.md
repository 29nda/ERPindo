# Fase 38f — panduan berhenti memotret, dan satu janji basi ditemukan

## Yang dikerjakan

Dua puluh enam slot tangkapan layar di panduan diganti peragaan. Setelah itu
seluruh gambar produk dihapus: `public/panduan/` (3,3 MB, 29 berkas) dan
`scripts/screenshots.mjs` (420 baris) yang satu-satunya alasan keberadaannya
adalah menghasilkan gambar-gambar itu.

**Enam naskah baru saja.** Dua puluh dari dua puluh enam slot memakai ulang
naskah yang sudah ditulis untuk beranda dan `/fitur`, dan itu bukan penghematan
melainkan yang benar: panduan modul Kasir menerangkan alur yang sama persis
dengan yang diperagakan `kasir-shift`. Dua peragaan berbeda untuk satu alur akan
menjadi dua sumber yang bisa berpisah.

Enam yang baru menutup seksi tanpa padanan di `/fitur`: `produk-induk`,
`kontak-induk`, `bagan-akun`, `neraca-seimbang`, `kurs-selisih`, dan
`penawaran-cetak`.

## Temuan: panduan menjanjikan masa coba yang sudah dihapus empat belas fase lalu

`content/dasar.ts:18` berbunyi:

> "Uji coba 30 hari mencakup SEMUA fitur, tanpa kartu kredit."

Masa coba **dihapus pada Fase 24a**. Sejak itu cek smoke menjaga beranda, blok
SEO, kerangka SPA, dan blog agar tidak menjanjikannya — ada enam cek untuk itu.
Panduan tidak pernah masuk sapuan mana pun, jadi janji itu bertahan.

Yang membuatnya mahal bukan lamanya, melainkan tempatnya: panduan dibaca orang
yang **sudah** serius memakai produknya, dan janji yang meleset di sana
ditemukan tepat saat kepercayaan sedang dibangun.

Kelasnya ditutup, bukan hanya kejadiannya: `test/panduan-janji.test.ts` memindai
seluruh naskah panduan terhadap tiga hal yang sudah dibatalkan — masa coba,
nama paket bertingkat, dan frasa "tanpa kartu kredit". Uji itu langsung
membuktikan tidak ada janji basi lain yang tersisa.

## Dua perlakuan yang membedakan peragaan panduan

Ini peredam yang dijanjikan saat pemilik memilih mengganti gambar panduan, dan
keduanya kini diuji:

1. **`sekaliJalan`** — berhenti di keadaan akhir dan menawarkan tombol "Putar
   ulang". Pembaca panduan sedang mencocokkan layarnya sendiri dengan yang di
   dokumen, dan gerak yang terus berulang mengganggu pekerjaan itu.
2. **`langkahTampak`** — daftar langkah bernomor terlihat di layar, bukan
   tersembunyi bagi mata seperti di halaman jualan. Di panduan, langkah itu
   memang instruksinya.

`sekaliJalan` dibuat sebagai **opsi pemutar**, bukan hanya sifat naskah. Naskah
yang sama dipakai di dua tempat dengan kebutuhan berlawanan; menaruhnya di
naskah akan memaksa dua salinan yang bisa berpisah.

### F49e dipersempit, dan alasannya ditulis

Tombol "Putar ulang" adalah kontrol **sungguhan** — satu-satunya di seluruh
kerangka peragaan. Asersi F49e melarang elemen yang bisa difokus di dalam
peragaan; ia dipersempit dari `[data-peragaan]` menjadi `[data-bingkai]`, yaitu
permukaan peraganya saja.

Yang dilarang asersi itu sejak awal adalah kontrol **palsu**: tombol yang
terlihat seperti tombol sungguhan, bisa ditekan Tab, dan tidak melakukan apa
pun. Melarang tombol yang benar-benar bekerja berarti memakai asersi itu untuk
hal yang bukan maksudnya.

## Registri dipisah dari komponennya

`peragaan/index.ts` menjadi fasad; datanya pindah ke `peragaan/daftar.ts`.
Dituntut oleh `scripts/export-panduan-md.mjs`, yang kini membaca narasi tiap
peragaan untuk dipancarkan ke Markdown — bila registrinya juga mengekspor
komponen React, esbuild ikut menarik React ke bundel skrip Node.

## Markdown panduan justru menguat

Pengekspor lama memancarkan tautan gambar
`../../apps/web/public/panduan/*.webp` — jalur yang benar **hanya** bila
dokumennya dibaca dari dalam repo, dan rusak di mana pun Markdown-nya
ditayangkan. Penggantinya adalah judul, ringkasan, dan daftar langkah bernomor
tiap peragaan. Teks selalu terbaca.

## Ukuran

| | Sebelum 38e | Sesudah 38f |
| --- | --- | --- |
| `apps/web/public` | 7,1 MB | **3,3 MB** |
| `apps/web/dist` | 9,7 MB | **6,4 MB** |

Sisa 3,3 MB di `public/` hampir seluruhnya **PNG merek (2,7 MB)** — pekerjaan
38g. Nol berkas `.webp` tersisa di repo.

## Neraca asersi ui-sim

**5 ditambah · 1 dipersempit · 0 dihapus.**

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 834 | ✅ **892** (+58) |
| `pnpm smoke` | 1.152 | ✅ 1.152 |
| `node scripts/ui-sim.mjs` | 382 | ✅ **387** (+5) |
| `sapu-warna` · `sapu-istilah` · `sapu-gaya` | tetap | ✅ tetap |

## Catatan kejujuran

Kekhawatiran yang saya sampaikan saat menanyakan keputusan ini masih berlaku
dan tidak dihapus oleh dua peredam di atas: tangkapan layar menjawab
"apakah ini layar saya?", peragaan menjawab "apa yang harus saya lakukan?".
Keduanya bukan pekerjaan yang sama.

Yang berubah setelah mengerjakannya: peragaan panduan ternyata **tersinkron
dengan langkah bernomor seksinya**, sehingga ia terbaca sebagai langkah yang
divisualkan alih-alih penggantinya. Bila setelah dipakai panduan terasa lebih
sulit, jalan mundurnya bukan mengembalikan tangkapan layar — melainkan
menyematkan demo tenant baca-saja yang sungguhan, yang menjawab kedua
pertanyaan sekaligus.
