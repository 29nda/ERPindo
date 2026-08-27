# Fase 40d — sisir seluruh naskah, lalu pasang gerbangnya

## Yang dikerjakan

Fase 40a–40c memperbaiki beranda. Fase ini menyisir sisanya, dan **memasang
penjaga** supaya polanya tidak masuk lagi diam-diam.

### Halaman publik lain

- `/harga` — judulnya "Satu harga, dan tidak ada baris kedua", alih-kata dari
  "no second line item". Pengantarnya menyindir cara vendor lain berjualan
  ("baru diketahui setelah tiga kali rapat") — masalah sudut pandang yang sama
  dengan Fase 40c, hanya di halaman lain. Keduanya diganti.
- `/keamanan` — "Keamanan yang bisa diperiksa, bukan dijanjikan" (frasa benda
  ber-"yang", alih-kata) → "Bagaimana data perusahaan Anda dijaga". Isi
  halamannya sendiri sudah konkret dan tidak diubah.
- `/fitur` — tanda pisah berpasangan sebagai kurung, dan "(double-entry)"
  sebagai terjemahan Inggris dalam kurung.
- `/tentang` **sengaja tidak disentuh.** Argumen kegagalan ERP memang rumahnya
  di sana; itu halaman yang menjelaskan kenapa produk ini dibangun.

### Kamus aplikasi

Penjaga baru menemukan 48 pelanggaran di dalam aplikasi, bukan hanya di halaman
publik — layar yang dilihat pelanggan tiap hari. Setelah positif palsu
disingkirkan, 23 diperbaiki dengan tangan.

## Dua kelas penjaga baru di `scripts/sapu-gaya.mjs`

Naskah yang sudah dirapikan akan kotor lagi dalam tiga fase kalau tidak ada yang
menjaganya. Karena itu polanya dijadikan gerbang, ambang **nol**:

1. **`tanda-pisah-inggris`** — tanda pisah sebelum konjungsi ("— sehingga",
   "— jadi", "— bukan") dan tanda pisah berpasangan sebagai kurung.
2. **`titik-koma`** — praktis tidak dipakai naskah jualan Indonesia.

### Dua pengecualian, dan alasannya

Gerbang yang memerah karena hal yang benar akan dimatikan orang, bukan
diperbaiki. Karena itu dua bentuk sah dikecualikan secara eksplisit:

- **Placeholder daftar pilihan** yang seluruh isinya dibungkus tanda pisah —
  "— pilih akun —", "— belum ditugaskan —". Ada 20 di kamus, semuanya benar.
  Di situ tanda pisah berfungsi sebagai kurung visual, dan itu idiomatis di
  antarmuka berbahasa Indonesia.
- **Titik koma sebagai pemisah kolom berkas** — "tanggal;keterangan;jumlah".
  Itu bagian dari format datanya; menggantinya justru membuat petunjuknya salah.
  Dikenali dari titik koma yang mengapit kata tanpa spasi, karena prosa selalu
  memberi spasi sesudahnya.

## Validasi

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — lulus
- `pnpm test` — 923 lulus · `pnpm smoke` — 1.173 cek
- `node scripts/ui-sim.mjs` — 431/431
- `sapu-gaya` — tujuh kelas, dua di antaranya baru, semuanya nol kecuali
  `empty-state-buntu` yang ambangnya tidak berubah
