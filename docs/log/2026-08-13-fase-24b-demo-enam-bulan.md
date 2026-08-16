# Fase 24b — demo 6 bulan, dan regresi yang dibuat Fase 24a sendiri

Trial dihapus pada Fase 24a, jadi **demo publik kini satu-satunya cara calon
pelanggan menilai produk.** Riwayat ±60 hari membuat separuh aplikasi terlihat
kosong: grafik tren, perbandingan periode, umur piutang, dan rasio keuangan
semuanya butuh kedalaman waktu untuk berarti.

## Regresi yang ditemukan — Fase 24a mematahkan penyemai demonya sendiri

Paywall yang dipasang Fase 24a memblokir **skrip seed demo itu sendiri**.

`scripts/seed-demo.mjs` bekerja dengan cara mendaftarkan akun seeder lalu
membuat "PT Demo Sejahtera" sebagai perusahaan **tambahan**. Sejak 24a,
pendaftar biasa lahir berstatus `provisioning` dan **dilarang menambah
perusahaan** — pagar yang sengaja dipasang untuk mencegah pemanenan slot.
Akibatnya:

```
✗ buat perusahaan PT Demo Sejahtera → HTTP 402 {"detail":"belum-berlangganan"}
```

Artinya `.github/workflows/seed-demo.yml` — jalur yang dipakai menyemai demo
produksi — **rusak sejak 24a digabungkan**, dan tidak ada gerbang yang
melihatnya karena workflow itu dipicu manual.

Ketahuan hanya karena seed dijalankan **sungguhan** untuk menguji Fase 24c.
Membaca kodenya tidak akan menunjukkannya: kedua bagian benar sendiri-sendiri,
yang rusak adalah pertemuannya.

**Perbaikannya:** perusahaan demo tidak pernah membayar, jadi ia harus disemai
dari akun yang terdaftar di `COMPED_EMAILS`. Skrip kini memeriksa status tenant
di awal dan berhenti dengan penjelasan yang bisa ditindaklanjuti, bukan gagal
402 tanpa konteks di tengah jalan. Workflow beralih ke `SEED_EMAIL`/
`SEED_PASSWORD` milik akun comped pemilik; mode `SEED_REGISTER` (akun acak)
tidak lagi bisa bekerja dan itu dinyatakan terang-terangan di komentarnya.

## Riwayat setengah tahun

Blok baru menambah bulan ke-6 sampai ke-2: satu pembelian stok + empat faktur
per bulan, pelanggan & produk berganti agar laporan "pelanggan terbesar" dan
"produk terlaris" punya sebaran.

**Urutan panggilan penting:** pembelian tiap bulan dikirim sebelum penjualannya,
karena stok dihitung dari pergerakan yang sudah terposting — menjual lebih dulu
ditolak "stok tidak cukup" walau tanggalnya lebih belakangan.

## Skala yang salah pada percobaan pertama

Versi pertama blok ini menjual **±550 ribu per bulan** pada perusahaan yang
menggaji **28 juta sebulan**. Angka itu mustahil, dan akibatnya terukur: laba
rugi 6 bulan menjadi **MINUS 13,4 juta** — padahal justru laporan itulah yang
kini dilihat calon pelanggan sebagai pengganti masa coba.

Pemeriksaan per periode menunjukkan sumbernya bukan blok baru itu sendiri
(Feb–Jun untung tipis), melainkan **Juli yang sudah rugi 22,7 juta sejak
sebelum fase ini** — sebulan penuh gaji dengan sedikit penjualan. Cacat lama
yang tak pernah terlihat karena tak ada yang pernah membuka jendela 6 bulan.

Volume dinaikkan ke skala yang sepadan. Hasil akhir:

| Periode | Pendapatan | Beban | Laba |
| --- | --- | --- | --- |
| **6 bulan** (yang dilihat calon pelanggan) | 205.561.750 | 179.530.664 | **+26.031.086** |
| Bulan ini | 96.088.750 | 87.426.528 | **+8.662.222** |

Invarian Fase 19b — demo tidak boleh menampilkan rugi — kini berlaku di **kedua**
jendela, bukan hanya bulan berjalan.

## Validasi

Seed tidak tercakup gerbang otomatis mana pun selain `node --check`, jadi
dijalankan sungguhan terhadap wrangler dev lokal:

| Yang diperiksa | Hasil |
| --- | --- |
| Seed lengkap | **286 langkah**, exit 0 |
| Neraca saldo | **seimbang** |
| Sebaran faktur | Feb 3 · Mar 4 · Apr 4 · Mei 4 · Jun 5 · Jul 18 · Agu 20 |
| Laba 6 bulan | **positif** |
| Penjaga akun non-comped | berhenti di awal dengan penjelasan (diuji langsung) |

Gerbang aplikasi: `pnpm lint` 0, `node --check` 0. **`ui-sim` ikut terpengaruh**
— ia memanggil `seed-demo.mjs` (`scripts/ui-sim.mjs:125`) — jadi dijalankan
penuh; akun seed-nya memang comped (`ui-sim.mjs:87`), sehingga penjaga baru
lolos. Tidak ada kode aplikasi yang berubah di fase ini.

## Catatan kejujuran — apa yang "6 bulan" itu sebenarnya

Yang menjadi 6 bulan adalah **penjualan, pembelian, pembayaran, dan piutang yang
menua**. **Penggajian, penyusutan aset, dan tugas bulanan lain masih ±2 periode**
— memperpanjangnya butuh menjalankan cron berulang kali dengan tanggal mundur,
yang di luar cakupan menjelang peluncuran.

Konsekuensinya jujur disebut di sini supaya tidak diklaim lebih: laporan Laba
Rugi, Neraca, arus kas, tren penjualan, umur piutang, dan perbandingan periode
punya isi 6 bulan; riwayat slip gaji dan jadwal penyusutan belum.

## Yang TIDAK dikerjakan

- **Landing page (24c)** — halaman `/fitur` masih memuat 9 modul dari ±23.
- **Demo produksi belum disemai ulang.** Sampai itu dilakukan, `/demo` di
  produksi masih berisi ±2 bulan. Butuh `SEED_EMAIL`/`SEED_PASSWORD` akun comped
  dipasang sebagai secret repo lebih dulu.
