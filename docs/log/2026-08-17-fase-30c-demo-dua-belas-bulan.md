# Fase 30c — demo publik setahun penuh

Tanpa masa coba gratis, demo publik adalah **satu-satunya** cara calon pelanggan
menilai produk. Riwayat 6 bulan membuat separuh laporan menjawab "belum ada
data" justru kepada orang yang sedang memutuskan membeli: perbandingan
tahun-ke-tahun, tren 12 bulan, dan anggaran setahun semuanya butuh kedua sisi
terisi.

## Yang dikerjakan

**Tidak satu baris kode aplikasi disentuh.** Ini pelajaran Fase 28 yang sudah
tertulis di repo: menambal produk demi memperbaiki demo justru menyembunyikan
masalahnya. Seluruh perubahan ada di skrip penyemaian.

- `bulanRiwayat(6)` → `bulanRiwayat(12)`. Blok gaji dan penyusutan menyusuri
  daftar yang **sama**, jadi keduanya otomatis ikut menjadi 12 periode — bukan
  2 seperti sebelum Fase 28.
- **Tanjakan volume diturunkan dari daftarnya sendiri**, bukan konstanta yang
  basi saat kedalaman berubah: `1 + (i × 0,075) / (RIWAYAT.length − 1)`.
  Titik AKHIR-nya dipertahankan **persis di 1,075** — nilai yang sudah
  dibuktikan aman Fase 28 — sehingga bulan riwayat terakhir tetap di bawah bulan
  berjalan. Yang berubah hanya jumlah anak tangganya.

### `scripts/verifikasi-demo.mjs` (baru)

Alat yang membuktikan demo masuk akal dengan **mengueri**, bukan membaca kode.
Ia menjalankan `wrangler dev` + D1 lokal, menyemai, lalu menarik laba-rugi dan
neraca **per bulan** dan menolak menyatakannya sehat bila ada bulan rugi, kas
negatif, hutang melampaui kas, bulan kosong, atau puncak omzet yang tertinggal
di masa lalu.

Berkas ini ada karena Fase 28 menemukan demo produksi menampilkan **rugi
Rp 20,7 juta** pada bulan lalu — dan **tidak satu pun gerbang mutu bisa
melihatnya**. Typecheck, unit, smoke, dan ui-sim semuanya menguji KODE,
sedangkan cacatnya ada di DATA yang dihasilkan kode itu. Ketahuan hanya karena
seseorang mengueri database produksi dengan tangan. Kini pemeriksaan itu
otomatis dan bisa diulang, termasuk terhadap produksi (`--tanpa-semai`).

## Validasi — angka DIUKUR dari demo yang benar-benar disemai

```
  Periode  | Pendapatan      | Beban           | Laba            | Kas+Bank        | Hutang Usaha
  ---------|-----------------|-----------------|-----------------|-----------------|----------------
  2025-08  |   Rp 80.400.000 |   Rp 75.784.040 |    Rp 4.615.960 |  Rp 402.303.150 |            Rp 0
  2025-09  |   Rp 78.600.000 |   Rp 75.575.664 |    Rp 3.024.336 |  Rp 410.715.650 |            Rp 0
  2025-10  |   Rp 78.850.000 |   Rp 75.630.195 |    Rp 3.219.805 |  Rp 413.119.550 |            Rp 0
  2025-11  |   Rp 81.000.000 |   Rp 76.924.211 |    Rp 4.075.789 |  Rp 423.080.550 |            Rp 0
  2025-12  |   Rp 81.000.000 |   Rp 76.875.930 |    Rp 4.124.070 |  Rp 426.679.000 |            Rp 0
  2026-01  |   Rp 81.250.000 |   Rp 76.966.419 |    Rp 4.283.581 |  Rp 322.215.000 |            Rp 0
  2026-02  |   Rp 81.250.000 |   Rp 76.924.673 |    Rp 4.325.327 |  Rp 325.464.050 |            Rp 0
  2026-03  |   Rp 82.350.000 |   Rp 77.560.247 |    Rp 4.789.753 |  Rp 335.248.550 |            Rp 0
  2026-04  |   Rp 82.800.000 |   Rp 77.793.011 |    Rp 5.006.989 |  Rp 339.691.550 |            Rp 0
  2026-05  |   Rp 83.650.000 |   Rp 78.297.844 |    Rp 5.352.156 |  Rp 350.236.050 |            Rp 0
  2026-06  |   Rp 83.900.000 |   Rp 78.399.630 |    Rp 5.500.370 |  Rp 330.379.800 |   Rp 11.072.800
  2026-07  |   Rp 90.075.000 |   Rp 82.592.417 |    Rp 7.482.583 |  Rp 317.199.860 |   Rp 15.072.800
  2026-08  |   Rp 96.736.750 |   Rp 87.565.152 |    Rp 9.171.598 |  Rp 335.173.339 |   Rp 76.376.672
```

Ketujuh pemeriksaan lulus: **tidak ada bulan rugi**, kas tidak pernah negatif,
setiap bulan berjualan, hutang tidak melampaui kas, tren tumbuh (Rp 80,4 jt →
Rp 90,1 jt), puncak omzet ada di bulan riwayat terakhir, dan kedalamannya cukup
untuk pembanding tahun-ke-tahun. Laba tumbuh Rp 4,6 jt → Rp 7,5 jt sepanjang
tahun. Angka di atas **disalin dari keluaran alatnya**, bukan diperkirakan.

Gerbang lain tidak berubah: test 597 · smoke 1.129 · ui-sim 356.

## Catatan kejujuran

**Satu asersi saya pertama kali ditulis terlalu longgar.** Cek "puncak omzet
bukan di masa lalu" semula membandingkan bulan riwayat terakhir dengan bulan
berjalan memakai toleransi `× 2` — sebuah angka sembarang yang praktis tidak
bisa gagal. Diperketat menjadi: **puncak harus berada di bulan riwayat terakhir**,
dibandingkan antar bulan riwayat saja.

Perbandingan terhadap bulan berjalan sengaja **dihindari**, dan itu bukan
kelonggaran: bulan berjalan selalu separuh jalan, jadi cek semacam itu akan
merah setiap kali dijalankan pada awal bulan — merah karena tanggal kalender,
bukan karena datanya buruk. Cek yang merah karena alasan yang salah akan
dimatikan orang, bukan diperbaiki.

**Alat verifikasinya sendiri punya cacat yang baru terlihat saat dipakai.**
Pembersihannya memanggil `anak.kill()` pada proses `pnpm` — yang hanya
pembungkus dan **tidak meneruskan sinyal** ke `wrangler`. Akibatnya bukan
sekadar proses yatim: pemanggilan verifikasi BERIKUTNYA menyambung ke server
lama beserta data lamanya, lalu berhenti dengan "perusahaan demo sudah ada" —
kegagalan yang menuduh datanya, padahal penyebabnya pembersihan yang bocor.
Diperbaiki dengan `detached: true` + `process.kill(-pid)` (seluruh grup proses).

Ditambah satu penjaga lagi: bila `wrangler` mati saat boot, skrip kini
**berhenti berisik** alih-alih menunggu server yang tidak akan pernah datang.
Versi pertama menggantung tanpa satu baris pun keluaran, dan menggantung tanpa
pesan jauh lebih mahal daripada gagal berisik.

**Bulan pertama (2025-08) sedikit lebih tinggi daripada bulan kedua** (Rp 80,4 jt
vs Rp 78,6 jt) meski tanjakannya menaik. Penyebabnya bukan cacat: bulan itu juga
menampung faktur pembanding "tahun lalu" yang disemai terpisah. Selisihnya 2%
dan justru membuat trennya terlihat wajar — bisnis nyata tidak naik mulus setiap
bulan. Dibiarkan apa adanya, dicatat supaya tidak dikira anomali oleh pembaca
berikutnya.

## Yang menunggu pemilik

Kode penyemainya sudah 12 bulan, tetapi **data demo produksi tidak ikut berubah
sampai workflow `seed-demo` dijalankan**. Halaman depan sengaja tidak menyebut
angka bulan sama sekali (Fase 30b), jadi tidak ada janji yang meleset selama
jeda itu. Langkahnya: `docs/langkah-pemilik.md` §1.
