# Fase 39c — dwibahasa sampai ke dokumen yang meninggalkan aplikasi

## Yang dikerjakan

Permintaan pemilik: bagian yang belum dwibahasa diselesaikan.

Prioritasnya jatuh ke naskah yang **keluar dari aplikasi**, karena itu yang
paling dilihat orang di luar perusahaan pemakainya:

### 1. Empat halaman cetak (`apps/web/src/pages/print.tsx`) — 35 → 0

Faktur, penawaran, slip gaji, dan rekap 1721-A1. Sampai fase ini keempatnya
berbahasa Indonesia harfiah, sehingga pengguna yang sudah memilih Inggris tetap
**mengirimkan faktur berbahasa Indonesia** ke pelanggannya.

Nama bulan ikut diperbaiki. Sebelumnya hanya ada `MONTH_NAMES_ID`, jadi slip
gaji berbahasa Inggris tetap menulis "Januari 2026" — kebocoran yang tidak
terlihat gerbang mana pun, karena nama bulan bukan literal yang dicari penyapu
i18n dan bukan pula kunci kamus yang hilang.

### 2. Surat jalan (`apps/web/src/pages/salesorders.tsx`)

Dirakit sebagai string HTML ke jendela cetak baru, bukan sebagai JSX — sehingga
ia luput dari seluruh program dwibahasa Fase 19, meski merupakan dokumen yang
**diserahkan kepada pelanggan dan ditandatangani penerimanya**.

### 3. Halaman `/panduan` — sekaligus satu klaim yang sudah tidak benar

Naskahnya menjanjikan "dengan tangkapan layar asli dari aplikasi". Sejak Fase 38
mengganti gambar dengan peragaan, janji itu keliru — dan dua gerbang saling
bertentangan tanpa ada yang menyadarinya: asersi F49d ui-sim **menjamin** panduan
tidak memuat satu pun tangkapan layar, sementara halamannya mengiklankannya.

Naskahnya kini menyebut peragaan, dan kelima teksnya menjadi dwibahasa.

## Angka

Utang teks layar: **146 → 101**.

Sisanya sebagian besar positif palsu penyapu (potongan kode, slug rute, contoh
data CSV) — `AREAS` di `app.tsx`, misalnya, terbaca sebagai utang padahal sudah
diterjemahkan lewat `SECTION_EN` saat render. Sisa yang benar-benar naskah
pengguna terkonsentrasi di halaman internal (Admin, Migrasi), bukan di jalur
yang dilihat pelanggan.

## Validasi

- `pnpm test` — **923 lulus** (289 shared + 360 web + 274 api; naik dari 917:
  enam uji baru milik halaman `/tampilan` di Fase 39d)
- Penyapu gaya: kunci baru `prBelumAdaPenggajian` sempat menaikkan
  `empty-state-buntu` menjadi 10. **Ambangnya tidak dinaikkan** — naskahnya yang
  diberi langkah berikutnya, sesuai maksud aturannya.
