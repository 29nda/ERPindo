# Stok & Gudang

Level stok multi-gudang dengan nilai persediaan real-time, kartu stok per produk, transfer antar gudang, opname, dan lot kedaluwarsa FEFO.

> Buka di aplikasi: `/app/stok`

## Memantau & menelusuri stok

Tabel stok menampilkan jumlah, biaya rata-rata, dan nilai per produk per gudang — angkanya selalu sama dengan akun Persediaan di neraca. Klik produk untuk melihat kartu stok (riwayat masuk/keluar + saldo berjalan).

**Stok yang angkanya tidak perlu dihitung ulang**

Beberapa gudang dalam satu daftar, harga pokok memakai biaya rata-rata bergerak, dan peringatan datang sebelum stok habis atau kedaluwarsa — bukan sesudahnya.

1. Tiga gudang dilihat dalam satu daftar, bukan tiga berkas terpisah.
2. Nilai persediaan terhitung dari biaya rata-rata yang berlaku.
3. Peringatan muncul sebelum stok habis, bukan setelah pesanan ditolak.
4. Barang yang mendekati kedaluwarsa ikut ditandai.
5. Urutan keluarnya diatur sistem, jadi tidak bergantung ingatan petugas gudang.

## Transfer, opname, & kedaluwarsa

1. Transfer: pindahkan stok antar gudang — nilai persediaan tidak berubah, tanpa jurnal.
2. Opname: masukkan jumlah fisik hasil hitung — selisihnya otomatis dijurnal sebagai penyesuaian.
3. Lot kedaluwarsa: penjualan otomatis mengambil lot dengan tanggal kedaluwarsa terdekat (FEFO); peringatan muncul untuk lot yang akan kedaluwarsa ≤ 30 hari.
