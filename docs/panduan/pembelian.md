# Pembelian

Faktur pembelian mengisi stok dengan biaya rata-rata otomatis, mendukung lot kedaluwarsa, diskon per baris, PPN Masukan, dan utang usaha.

> Buka di aplikasi: `/app/pembelian`

## Mencatat pembelian

1. Pilih pemasok, gudang tujuan, tarif PPN, dan baris produk.
2. Untuk produk berpelacakan kedaluwarsa, isi nomor lot & tanggal exp per baris.
3. Posting: Persediaan & PPN Masukan terjurnal, stok masuk pada biaya setelah diskon, utang tercatat sampai dibayar.

**Barang masuk, utang tercatat, PPN masukan siap dikreditkan**

Satu penerimaan barang menambah stok, membentuk utang usaha, dan mencatat PPN masukan sekaligus — sehingga tidak ada tagihan pemasok yang baru ditemukan saat ditagih.

1. Barang yang benar-benar diterima dicatat, bukan yang dipesan.
2. PPN masukan dihitung sendiri.
3. Penerimaan diposting.
4. Persediaan dan utang usaha terbentuk dalam satu jurnal yang seimbang.
5. Biaya rata-rata dihitung ulang, jadi laba penjualan berikutnya memakai modal yang benar.
6. Jatuh tempo dan PPN masukannya terdaftar tanpa langkah tambahan.

> 💡 Pembelian oleh Admin di atas ambang tertentu bisa diwajibkan menunggu persetujuan Owner — lihat modul Persetujuan.
