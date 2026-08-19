# Fase 37 — halaman depan berhenti menjual ke UMKM

Arahan pemilik, dan ia menyetel ulang seluruhnya:

> 1. jangan berpatokan dengan yang sudah ada
> 2. targetnya adalah **perusahaan atau bisnis (bukan UMKM)**
> 3. pelajari copywriting dan marketing, jadi landing page yang benar-benar menjual
> 4. boleh cari referensi dari ERP populer

## Yang dipelajari lebih dulu

Tidak ada skill copywriting yang terpasang, jadi bahannya dicari sendiri. Tiga
temuan yang mengubah seluruh strategi:

**1. Untuk pembeli perusahaan, harga bukan keberatan pertama.**
68% proyek ERP gagal memenuhi tujuan awalnya; biaya rata-rata membengkak **189%**
dari anggaran (Panorama Consulting Solutions, ERP Report 2025). Hampir setiap
calon pembeli pernah mengalaminya atau mendengarnya langsung.

**2. Ada DUA pembeli, dan keduanya membaca halaman yang sama.**
Yang menilai (Manajer Keuangan/IT) ingin melihat produknya bekerja; yang
menyetujui (Direktur/CFO) ingin angka, sumber, dan jalan keluar. Halaman yang
hanya melayani salah satunya berhenti di tangan yang lain.

**3. Angka pembanding kategori.**
ERP perusahaan di Indonesia: HashMicro mulai Rp 150 juta/tahun; Ukirama mulai
Rp 2 juta/bulan. ERPindo: **Rp 5.988.000/tahun**, seluruh modul, pengguna tak
terbatas.

## Sudut yang dipilih

> **"ERP untuk perusahaan, tanpa proyek implementasi."**

Sudut ini belum dipakai siapa pun di pasar ini, dan ERPindo **berhak**
memakainya: bagan akun standar Indonesia, tarif PPN, PPh 21 metode TER, dan
BPJS sudah terpasang saat perusahaan dibuat. Tidak ada konsultan, tidak ada
tahap konfigurasi berbulan-bulan.

Layar pertama karena itu melayani keduanya sekaligus: angka + sumber untuk yang
menyetujui, peragaan hidup di bawahnya untuk yang menilai.

## Seksi baru: "Yang membuat proyek ERP gagal"

Menjawab keberatan nomor satu secara langsung, dengan persentase bersumber dan
jawaban yang **bisa ditunjuk barisnya di produk**:

| Penyebab | Jawaban |
| --- | --- |
| Migrasi data berantakan (34%) | impor CSV dengan pratinjau & laporan per baris; saldo awal jadi satu jurnal pembuka yang otomatis seimbang |
| Ruang lingkup melar (35%) | seluruh modul terbuka sejak hari pertama |
| Tim implementasi kurang orang (38%) | tidak ada tim implementasi yang perlu disiapkan |
| Tim menolak memakainya | demo publik berisi data setahun penuh, bisa ditelusuri sebelum satu rupiah dikeluarkan |

Bentuknya sengaja **bukan** grid kartu: dua kolom bersebelahan, sebab di kiri
dan jawabannya di kanan, supaya pasangannya terbaca sebagai pasangan.

## Bilah bukti diarahkan ulang

| Sebelum (pemilik toko) | Sesudah (perusahaan) |
| --- | --- |
| Satu harga | **Pengguna tak terbatas** — tambah 10 atau 200 orang, tagihannya tidak bergerak |
| Pajak Indonesia | **Kepatuhan bawaan** — PPh 21 TER, BPJS, XML Coretax |
| Kasir tetap berjalan | **Multi-entitas** — basis data per badan usaha + konsolidasi & eliminasi |
| Data milik Anda | **Tanpa kunci vendor** — seluruh tabel diunduh CSV kapan saja |

## Nama pesaing sengaja TIDAK disebut

Harga vendor berubah tanpa pemberitahuan, dan klaim yang basi tentang harga
pihak lain merugikan yang menuliskannya — bukan yang disebut. Yang dipakai di
naskah adalah kalkulator yang menghitung dari angka yang dimasukkan pengunjung
sendiri. Angka pembandingnya dicatat di `docs/posisi-produk.md` sebagai bahan
keputusan, bukan sebagai naskah.

## "UMKM" berhenti menjadi posisi produk

19 sebutan diubah: tagline footer, kop tiga dokumen cetak, meta & OG, judul
blog, prompt Asisten AI, halaman masuk.

**Tetap dipakai** pada nama resmi yang memang berbunyi begitu — "PPh Final UMKM
0,5% (PP 55/2022)" — dan hanya di situ.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 623 | ✅ 623 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 362 | ✅ 362 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |

Tiga asersi ui-sim membaca judul hero dan tagline halaman masuk apa adanya, dan
ikut diperbarui ke bunyi barunya.

## Yang belum dikerjakan

FAQ masih ditulis untuk pemilik toko ("Saya sudah punya data di Excel"),
sementara pembeli perusahaan bertanya hal lain: SLA, migrasi dari sistem
berjalan, hak akses per cabang, audit. Menyusul.
