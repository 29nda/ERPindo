# Fase 42b — Penjaga klaim-vs-produk

## Yang dikerjakan

Peragaan formulir sekarang wajib menyebut **dari mana angkanya berasal**, dan
uji baru membuktikan sumber itu benar-benar ada di basis data.

- `apps/web/src/peragaan/tipe.ts` — medan panel `formulir` mendapat properti
  `sumber: string` yang **wajib**, berisi `"tabel.kolom"` atau `"hitung"` untuk
  nilai yang memang tidak disimpan di kolom mana pun (kembalian kasir,
  penyusutan bulanan, pertanyaan ke asisten).
- 31 medan di tiga naskah (`beranda.ts`, `fitur.ts`, `panduan.ts`) diikat ke
  kolomnya masing-masing.
- `apps/web/test/peragaan-klaim.test.ts` — enam uji yang mengurai
  `packages/db/src/migrations.ts` (`CREATE TABLE` **dan**
  `ALTER TABLE ... ADD COLUMN`) lalu memastikan tiap `sumber` menunjuk tabel dan
  kolom yang sungguh ada.

## Kenapa

Empat kali berturut-turut halaman publik menjanjikan sesuatu yang tidak ada:
`noscript` mengirim potongan JavaScript alih-alih harga (39b), `/panduan`
menjanjikan tangkapan layar yang gerbangnya sendiri jamin tidak ada, FAQ
menyuruh pembaca menjadwalkan demo yang tidak pernah dibuka, dan peragaan
kontak memperagakan batas kredit serta termin pembayaran padahal `contacts`
tidak punya kolomnya (41a, ditutup 42a).

Yang keempat paling sunyi: **255 uji peragaan lolos sepanjang waktu itu.**
Semuanya memeriksa konsistensi ke dalam — `sasaran` menunjuk panel yang ada,
tiap `Dual` terisi dua bahasa, jalurnya terdaftar di `main.tsx`. Tidak satu pun
menanyakan hal yang sebenarnya menentukan: apakah yang diperagakan ini ada di
produknya. Gerbang yang hanya memeriksa dirinya sendiri akan selalu lolos.

Skemanya dibaca dari migrasi, bukan dari daftar tabel yang ditulis tangan di
berkas ujinya. Daftar tulis tangan akan basi persis seperti `screenshots.mjs`
dulu basi, dan penjaga yang basi lebih buruk daripada tidak ada penjaga.

## Catatan kejujuran

**Penjaganya menangkap kesalahan penulisnya sendiri pada percobaan pertama.**
Ikatan yang saya tulis untuk peragaan kasir berbunyi `pos_payments.amount`.
Tabel bernama `pos_payments` tidak ada — yang ada `pos_sale_payments`, dan
medan "Tunai diterima" sebetulnya kolom `tendered`, bukan `amount`. Saya
menuliskannya dari ingatan tanpa membuka migrasi. Itu persis kelas cacat yang
fase ini dibuat untuk menutup, terjadi di dalam commit yang menutupnya.

Dua hal lain yang perlu dicatat apa adanya:

- Sisipan `sumber` tahap pertama saya kerjakan dengan regex, dan regex itu
  merusak format sembilan baris (`id: "harga",          label:` menempel jadi
  satu baris). `tsc` dan eslint tidak melihatnya karena hasilnya tetap sah.
  Diperbaiki manual, bukan dengan regex susulan.
- Uji ini memuat dua asersi yang menjaga **penjaganya sendiri**: satu memastikan
  skema berhasil diurai (peta kosong akan meloloskan segalanya secara palsu),
  satu lagi membatasi rasio `"hitung"` di bawah 0,35 — karena menandai semua
  medan `"hitung"` akan melucuti penjaga ini tanpa memecahkan satu pun uji.
  Kegagalannya sudah diverifikasi sungguhan: satu ikatan sengaja dirusak jadi
  `contacts.batas_kredit`, ujinya gagal dan menyebut
  `kontak-induk/kontak.kredit → contacts.batas_kredit`, lalu dipulihkan.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **949 lulus** (299 shared + 366 web + 284 api; naik dari 943)
- `pnpm build` — lulus
- `pnpm smoke` — **1.178 cek** (tetap; fase ini tidak menyentuh API)
- `node scripts/ui-sim.mjs` — **434/434** (tetap)
- `pnpm lint` — bersih
- `sapu-i18n` 101 utang teks layar (tetap), `sapu-warna` 0, `sapu-istilah`
  bersih, `sapu-gaya` bersih, `periksa-tautan-dokumen` 79 tautan di 66 berkas
