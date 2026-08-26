# Fase 40a — naskah beranda berhenti berbentuk Inggris

## Temuan pemilik

> "Basisnya kan bahasa Indonesia. Sepertinya kamu pakai konsep English first
> lalu translate ke Indonesia, jadi terdengar aneh."

Diperiksa, dan benar. Cacatnya **struktural**, bukan pilihan kata: kalimatnya
berbentuk Inggris meski setiap katanya Indonesia.

| Naskah lama | Bentuk Inggris yang membayanginya |
| --- | --- |
| "ERP untuk perusahaan, tanpa proyek implementasi" | "Enterprise ERP, without the implementation project" |
| "ERPindo tidak punya proyek" | "ERPindo has no project" |
| "Kasir **yang** langsung masuk pembukuan" | "A till **that** posts straight to your books" |
| "Stok **yang** angkanya bisa dipercaya" | "Stock figures you can trust" |
| "Tanpa kunci vendor" | "No vendor lock-in" |
| "Kepatuhan bawaan" | "Compliance built in" |
| "tagihannya tidak bergerak" | "the bill does not move" |

Tiga pola yang berulang:

1. **Judul berupa frasa benda.** Iklan Inggris memakainya; ERP Indonesia
   memakai kalimat berpredikat ("Buat faktur…", "Hitung gaji…").
2. **Tanda pisah sebagai kurung.** Tujuh dari sembilan jawaban FAQ memakainya
   persis seperti *em dash* Inggris. Ditambah satu titik koma, yang praktis
   tidak dipakai naskah jualan Indonesia.
3. **Membuka dengan statistik kegagalan industri.** Kebiasaan B2B Inggris.
   Pembaca Indonesia menunggu produknya disebut lebih dulu.

## Yang TIDAK benar dari keluhan itu

Naskahnya tidak merata buruk. Seksi hasil Fase 32e/35/38 sudah berbentuk
Indonesia dan tidak disentuh: "Masih pakai buku & Excel?", "Jangan percaya.
Periksa angkanya.", "Internet mati pun tetap bisa berjualan." Yang dirombak
adalah **lapisan lama** yang tertinggal — terutama hero, yang justru paling
dilihat.

## Yang dikerjakan

- **Hero ditulis ulang.** Klaim produk lebih dulu, buktinya menyusul. Angka
  kegagalan ERP tetap ada — pembeli yang menyetujui anggaran memakainya — tetapi
  turun menjadi pembanding di bawah, bukan kalimat pertama yang menyambut.
- **Empat label kepercayaan** berhenti menjadi alih-kata: "Kepatuhan bawaan" →
  "Pajak terhitung otomatis", "Multi-entitas" → "Banyak badan usaha, satu akun",
  "Tanpa kunci vendor" → "Data tetap milik Anda".
- **Lima judul showcase** menjadi kalimat berpredikat.
- **Seluruh tanda pisah ala Inggris dibuang** dari FAQ, seksi, dan beranda.
- **Judul dipendekkan** setelah tangkapan layar memperlihatkan "berbulan-bulan"
  patah menjadi "berbulan-" / "bulan." di ujung baris. Detailnya pindah ke
  kalimat penjelas, tempat ia justru menerangkan sesuatu.

## Dua cacat yang ikut ditemukan

1. **Seksi kepemilikan data melanggar glosarium §8b** ("tidak menggurui"):
   "Anda juga **harus** bisa berhenti kapan saja". Juga "termasuk setelah Anda
   pergi", yang dalam bahasa Indonesia berbunyi seperti kematian.
2. **FAQ menyuruh "jadwalkan demo"** padahal formulir itu dihapus pada Fase 27b,
   dan asersi F48 ui-sim justru **menjamin** ia tidak ada di beranda. Ini
   kejadian ketiga dari pola yang sama dalam dua fase terakhir: halaman
   menjanjikan sesuatu yang gerbang lain pastikan tidak ada. Diarahkan ke
   halo@erpindo.id, jalur yang benar-benar tersedia.

## Validasi

Dua asersi ui-sim mengunci bunyi hero lama. Keduanya **diperbarui menyebut bunyi
barunya**, bukan dilonggarkan — mengikuti konvensi yang sudah tertulis di
sekitarnya.

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — lulus
- `pnpm test` — 923 lulus · `pnpm smoke` — 1.173 cek
- `node scripts/ui-sim.mjs` — 431/431
- Lima penyapu naskah hijau, termasuk `sapu-istilah` (ragam baku) dan
  `sapu-gaya` (klaim tanpa bukti) yang keduanya menyapu berkas ini.
