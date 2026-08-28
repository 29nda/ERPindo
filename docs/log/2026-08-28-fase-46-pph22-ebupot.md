# Fase 46 — PPh 22 & bahan pengisian e-Bupot

## Yang dikerjakan

PPh 23, PPh Final, dan SPT Masa PPN sudah ada sejak Fase 7d–20d. Dua hal belum:
PPh Pasal 22 tidak ada sama sekali, dan rekap PPh unifikasi hanya bisa dilihat
di layar — tidak bisa dibawa keluar.

- `packages/shared/src/accounting.ts` — `PPH22_OBJECTS`, `pph22Schema`,
  `nilaiPungutan()`, `csvEBupot()`, `KOLOM_EBUPOT`.
- Migrasi `0054_pph22` — `tax_pph22`.
- `apps/api/src/routes/tax.ts` — catat & daftar bukti pungut, plus unduhan
  `GET /tax/e-bupot?period=`.
- `apps/web/src/pages/pajak.tsx` — tab PPh 22 + tombol unduh bahan e-Bupot.

## Keputusan dan alasannya

**PPh 22 masuk akun ASET, bukan beban.** Pungutan yang diambil dari kita adalah
kredit pajak yang mengurangi PPh badan akhir tahun. Mencatatnya sebagai beban
membuat perusahaan membayar pajaknya **dua kali**: sekali saat dipungut, sekali
lagi saat menghitung PPh badan tanpa mengurangkannya. Ini cek smoke yang paling
menentukan di fase ini.

**Tidak ada alur "setor" untuk PPh 22**, dan itu bukan kelupaan. PPh 23 adalah
pajak yang kita potong dari rekanan lalu wajib kita setorkan — punya utang,
punya status setor. PPh 22 di sini dipungut **dari** kita; yang menyetorkannya
pemungutnya. Yang kita punya hanya bukti pungutnya.

**Tarif tetap persen, bukan basis poin bilangan bulat seperti komisi.** Tarif
PPh 22 memang pecahan (0,25%, 0,1%, 0,45%), dan memaksanya ke basis poin akan
menjauhkan angka di layar dari angka di PMK. Yang dibaca orang harus sama
dengan yang tertulis di peraturannya.

**Tarif berubah mengikuti objek, tetapi tetap bisa disunting.** Sebagian tarif
bergantung status lawan transaksi (tanpa NPWP dikenai 100% lebih tinggi), dan
aturannya berubah dari waktu ke waktu.

**Berkas e-Bupot disebut "bahan pengisian", BUKAN berkas impor resmi DJP.**
Format impor e-Bupot berubah mengikuti aturan dan tidak bisa dijamin cocok dari
sini. Yang dijanjikan berkas ini hanya: seluruh angka yang diminta e-Bupot
sudah terkumpul di satu tempat beserta NPWP lawan transaksinya. Menjanjikan
lebih akan menjadi janji yang tidak bisa ditunjuk buktinya — persis kelas cacat
yang ditutup Fase 42b.

**NPWP kosong ditulis kosong**, bukan diisi `00.000.000.0-000.000`. Nomor palsu
membuat berkasnya tampak lengkap padahal datanya belum ada, dan yang
memeriksanya baru tahu setelah ditolak DJP.

**Masa tanpa data tetap menghasilkan baris judul.** Berkas benar-benar kosong
terbaca sebagai berkas rusak, bukan sebagai "tidak ada data".

## Perbaikan sampingan

`request()` di berkas smoke sekarang mengembalikan `headers`. Berkas unduhan
hanya bisa diperiksa benar lewat `content-type` dan `content-disposition`-nya;
memeriksa isinya saja akan meloloskan berkas yang terkirim dengan tipe salah,
dan peramban lalu menampilkannya alih-alih mengunduhnya.

## Catatan kejujuran

**Cek ui-sim saya menavigasi ke rute yang tidak ada.** Saya menulis
`/app/pajak`; rutenya `/app/keuangan/pajak`. Playwright menunggu 15 detik lalu
menghentikan seluruh ui-sim — 347 cek, bukan 462. Kegagalan yang terlihat
seperti fitur rusak padahal saya salah alamat.

**`ui-kunci-mati` menangkap `descBahanEbupot`** — naskah kehati-hatian yang
saya tulis tetapi tidak pernah tampilkan. Justru naskah itu yang paling perlu
terbaca: ia yang menjaga berkasnya tidak disalahpahami sebagai berkas impor
resmi. Sekarang tampil di atas tombol unduhnya. **Ini kedua kalinya** gerbang
kunci-mati menangkap saya, setelah Fase 45.

**`sapu-gaya` menolak judul keadaan kosong saya**, lagi, dengan kelas yang sama
seperti Fase 44b. Ditulis ulang deskriptif; kaidahnya tidak dilonggarkan.

**Dua kunci kamus saya ternyata sudah ada** (`objekPajak`, `akunSumber`) sejak
modul PPh 23. Dipakai ulang, bukan digandakan — TypeScript yang menangkapnya.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.071 lulus** (389 shared + 366 web + 316 api; naik dari 1.057)
- `pnpm build` — lulus
- `pnpm smoke` — **1.273 cek** (naik dari 1.259; 14 cek pajak)
- `node scripts/ui-sim.mjs` — **462/462** (naik dari 458; 4 cek)
- `pnpm lint` — bersih
- `sapu-i18n` 53 (tetap), `sapu-warna` 0, `sapu-istilah` bersih,
  `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
