# Fase 45 — Kontrak: eskalasi harga, perpanjangan, adendum

## Yang dikerjakan

Kontrak berulang sudah ada sejak lama, tetapi berhenti di penagihan berulang.
Tiga hal yang dibutuhkan kontrak jangka panjang belum ada sama sekali.

- `packages/shared/src/projects.ts` — `tahunBerjalan()`, `hargaTereskalasi()`,
  `rencanaPerpanjangan()`, `JENIS_ADENDUM`.
- Migrasi `0053_kontrak_eskalasi` — `contracts.start_date`, `escalation_bp`,
  `auto_renew`, `renew_months`; tabel `contract_amendments`.
- `apps/api/src/routes/contracts.ts` — eskalasi & perpanjangan otomatis di
  dalam `runBilling`, plus rute adendum dan perpanjangan manual.
- `apps/web/src/pages/contracts.tsx` — medan kenaikan tahunan & perpanjangan
  otomatis, lencana "segera berakhir", jejak adendum yang bisa dibuka.

## Keputusan dan alasannya

**Eskalasi berbunga MAJEMUK, bukan sederhana.** Klausul "naik 5% per tahun"
yang lazim ditulis di kontrak Indonesia berarti 5% dari harga tahun sebelumnya.
Selisihnya kecil di tahun kedua dan besar di tahun kelima — dan yang membayar
selisih itu selalu salah satu pihak.

**Jangkarnya ulang tahun kontrak, bukan tahun kalender.** Kontrak yang dimulai
1 Juli naik tiap 1 Juli. Menghitungnya per tahun kalender akan menaikkan harga
enam bulan setelah kontrak diteken.

**`start_date` adalah kolom baru, bukan `next_invoice_date`.** Kolom yang sudah
ada bergerak maju tiap kali menagih, sehingga "sudah berapa tahun berjalan"
akan selalu nol. Kontrak lama dijangkarkan ke tanggal tagihan pertama yang
tercatat — perkiraan terbaik yang tersedia, dan lebih baik daripada mengarang
tanggal.

**Harga dasar di kontrak TIDAK pernah ditimpa.** Eskalasi dihitung ulang dari
harga dasar setiap kali menagih. Karena itu harga yang disepakati awal tetap
terbaca selamanya, dan pelanggan bisa memeriksa sendiri kenaikannya. Diuji
eksplisit di dua lapisan.

**Perpanjangan otomatis MENINGGALKAN adendum.** Perpanjangan senyap sama
buruknya dengan penghentian senyap: keduanya mengubah kewajiban perusahaan
tanpa seorang pun memutuskannya.

**Kontrak tanpa tanggal berakhir menolak diperpanjang.** Ia memang berjalan
terus; diam-diam memberinya tanggal berakhir justru MEMBATASI kontrak yang
tadinya tak terbatas.

**Adendum menyimpan `sebelum`/`sesudah` sebagai teks.** Yang berubah bisa
harga, masa berlaku, atau lingkup; memaksakan satu bentuk kolom untuk ketiganya
akan membuat dua di antaranya kosong selamanya.

## Catatan kejujuran

**Tiga gerbang menangkap saya, dua di antaranya gerbang yang saya pasang
sendiri.**

1. `ui-kunci-mati` menemukan tiga kunci kamus yang saya tambahkan tetapi tidak
   pernah dipakai. Dua di antaranya naskah penjelas yang memang berguna, jadi
   dipasang di layarnya (dan layarnya jadi lebih baik); satu lagi untuk medan
   yang akhirnya tidak dibangun, jadi dihapus.
2. `sapu-gaya` menolak naskah eskalasi saya karena memakai tanda pisah gaya
   Inggris — kaidah yang saya tambahkan sendiri di Fase 42b. Ini kedua kalinya
   saya melanggar kaidah tulisan yang saya buat sendiri, setelah titik koma di
   Fase 43b.
3. Cek smoke saya menyaring faktur dengan `d.invoiceDate`, padahal bentuk
   API-nya `d.date`. Ceknya gagal, dan sesaat terlihat seperti eskalasinya yang
   salah — padahal fiturnya benar dan uji unitnya sudah membuktikannya. Yang
   salah asersinya.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.057 lulus** (375 shared + 366 web + 316 api; naik dari 1.035)
- `pnpm build` — lulus
- `pnpm smoke` — **1.259 cek** (naik dari 1.244; 15 cek kontrak)
- `node scripts/ui-sim.mjs` — **458/458** (naik dari 454; 4 cek)
- `pnpm lint` — bersih
- `sapu-i18n` 53 (tetap), `sapu-warna` 0, `sapu-istilah` bersih,
  `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
