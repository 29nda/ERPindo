# Posisi produk — ERPindo untuk perusahaan

> Keputusan pemilik (Fase 37): target halaman depan adalah **perusahaan dan
> bisnis**, bukan UMKM. Dokumen ini menetapkan siapa pembelinya, apa yang
> ditakutkannya, dan bukti mana yang menjawabnya. Naskah halaman depan tunduk
> pada dokumen ini.

> **Revisi pemilik (Fase 40c) — sudut pandang halaman depan.**
>
> Dokumen ini sempat membuat halaman depan berbicara sebagai **orang dalam
> industri ERP**: judulnya berporos pada "tanpa proyek implementasi", dan satu
> seksi penuh memajang tingkat kegagalan proyek ERP (68%, 189%, 34/35/38%).
>
> Keputusan pemilik: **berhenti**. Pembaca halaman depan menjalankan
> perusahaannya sendiri dan tidak mengikuti industri perangkat lunak. Ia tidak
> tahu — dan tidak perlu tahu — bahwa ERP biasanya datang bersama proyek
> pemasangan. Halaman yang membuka dengan statistik kegagalan kategorinya
> sendiri sedang menjelaskan bisnis ERP, bukan menjelaskan produknya.
>
> Yang berlaku sekarang:
>
> - **Halaman depan menjelaskan produk**, memakai pekerjaan yang dikenali
>   pembaca dari kantornya sendiri: penjualan, stok, gaji, pajak.
> - **Keunggulan "siap dipakai" dinyatakan sebagai manfaat** ("dapat mulai
>   dipakai hari ini juga"), bukan sebagai bantahan terhadap cara vendor lain
>   bekerja.
> - **Angka kegagalan ERP tidak dihapus dari situs.** Ia pindah ke `/tentang`,
>   halaman yang memang menjelaskan kenapa produk ini dibangun, lengkap dengan
>   sumbernya. Pembeli yang mencarinya tetap menemukannya.
> - **Seksi keberatan sebelum tombol daftar tetap ada**, tetapi keberatannya
>   ditulis sebagai pertanyaan yang benar-benar diajukan pelanggan ("Data yang
>   sudah ada bagaimana?"), bukan sebagai kegagalan yang dialami vendor lain.
>
> Tabel §2 dan §3 di bawah **tetap berlaku sebagai daftar ketakutan pembeli** —
> yang berubah hanya cara halaman depan menyebutkannya.

## 1. Dua pembeli, satu halaman

Pada pembelian perangkat lunak perusahaan, **yang menilai dan yang menyetujui
adalah orang berbeda**, dan keduanya membaca halaman yang sama.

| | **Evaluator** | **Approver** |
|---|---|---|
| Siapa | Manajer Keuangan, Manajer IT, Controller | Direktur, CFO, pemilik |
| Pertanyaannya | "Apakah ini benar-benar bekerja?" | "Berapa totalnya, dan apa risikonya?" |
| Yang meyakinkannya | melihat produknya jalan | angka, sumber, jalan keluar |
| Di halaman ini | **peragaan hidup** di layar pertama | **biaya 3 tahun** + risiko proyek |

Halaman yang hanya melayani salah satunya akan berhenti di tangan yang lain.
Karena itu layar pertama memuat keduanya sekaligus.

## 2. Ketakutan yang sebenarnya — berurutan

Untuk pembeli perusahaan, harga **bukan** keberatan pertama.

1. **"Proyeknya akan gagal seperti yang dulu."**
   68% proyek ERP gagal memenuhi tujuan awalnya; biaya rata-rata membengkak
   **189%** dari anggaran (Panorama Consulting Solutions, ERP Report 2025).
   Hampir setiap calon pembeli pernah mengalaminya atau mendengarnya langsung.
2. **"Biayanya akan terus naik."** Lisensi per pengguna menghukum pertumbuhan:
   makin banyak orang yang dilatih memakainya, makin mahal.
3. **"Kami akan terkunci."** Data tidak bisa dikeluarkan, vendor tidak bisa
   ditinggalkan.
4. **"Kepatuhannya tidak ikut."** Coretax, e-Faktur, PPh 21 TER, PP 55/2022.
5. **"Struktur kami tidak muat."** Beberapa badan usaha, konsolidasi, eliminasi
   antar-perusahaan.

## 3. Jawaban yang boleh dipakai — dan semuanya harus benar

| Ketakutan | Jawaban ERPindo | Buktinya di produk |
|---|---|---|
| proyek gagal | **tidak ada proyek implementasi** | bagan akun standar Indonesia, tarif pajak, dan seluruh modul sudah terpasang saat perusahaan dibuat |
| biaya membengkak | **harga tetap per perusahaan** | Rp 499.000/bulan, pengguna tak terbatas, seluruh modul terbuka |
| terkunci | **data bisa dibawa pergi** | ekspor ZIP berisi CSV per tabel, kapan saja, termasuk setelah berhenti |
| kepatuhan | **pajak Indonesia bawaan** | XML Coretax, PPh 21 TER, BPJS, PP 55/2022, PMK 131/2024 |
| struktur | **multi-entitas bawaan** | basis data terpisah per badan usaha + konsolidasi & eliminasi |

**Aturan keras:** tidak ada klaim di halaman depan yang tidak bisa ditunjuk
barisnya di produk. Demo publik berisi data setahun penuh justru ada untuk itu.

## 4. Angka pembanding — dan cara menyebutnya

Biaya ERP untuk perusahaan di Indonesia, dari sumber publik:

| | Biaya |
|---|---|
| HashMicro | mulai Rp 150 juta/tahun |
| Ukirama | mulai Rp 2 juta/bulan (≈ Rp 24 juta/tahun) |
| **ERPindo** | **Rp 5.988.000/tahun**, pengguna tak terbatas |

**Nama pesaing TIDAK disebut di halaman.** Harga vendor berubah tanpa
pemberitahuan, dan klaim yang basi tentang harga pihak lain merugikan yang
menuliskannya, bukan yang disebut. Yang dipakai di naskah adalah **rentang
kategori beserta sumbernya**, dan kalkulator yang menghitung dari angka yang
dimasukkan pengunjung sendiri.

## 5. Nada

Percaya diri, berpendapat, dan **tidak menggurui**. Pembacanya seorang
profesional yang sudah menjalankan perusahaan — ia tidak perlu diberi tahu
bahwa cara kerjanya salah.

Pelajaran Fase 36a masih berlaku dan berlaku dua kali lipat di sini: kalimat
yang terdengar pintar dalam bahasa Inggris sering tidak berbunyi dalam bahasa
Indonesia. Naskah dibaca keras-keras sebelum dipasang.

## 6. Istilah

"UMKM" **tidak lagi dipakai sebagai posisi produk**. Ia tetap dipakai pada
**nama resmi** yang memang berbunyi begitu — "PPh Final UMKM 0,5% (PP 55/2022)"
— dan hanya di situ.

Pengganti: **perusahaan**, **badan usaha**, **bisnis yang sedang tumbuh**.
