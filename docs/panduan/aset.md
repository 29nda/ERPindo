# Aset Tetap

Register kendaraan, mesin, dan peralatan — penyusutan garis lurus dijurnal otomatis tiap bulan, pelepasan aset menghitung laba/rugi sendiri.

> Buka di aplikasi: `/app/keuangan/aset`

## Mendaftarkan & menyusutkan aset

1. Daftarkan aset: nama, kategori, tanggal & harga perolehan, umur manfaat (bulan), nilai residu, akun pembayar.
2. Penyusutan bulanan berjalan otomatis (Cron) — akumulasi & nilai buku ikut terbarui, bebannya terjurnal.
3. Melepas/menjual aset: isi tanggal & harga jual — laba/rugi pelepasan dihitung dan dijurnal otomatis.

**Penyusutan yang berjalan sendiri tiap bulan**

Aset dicatat sekali beserta masa manfaatnya. Beban penyusutan dijurnal tiap bulan tanpa diminta, dan nilai bukunya selalu bisa dilihat pada tanggal berapa pun.

1. Aset dicatat sekali saat dibeli.
2. Penyusutan bulanannya terhitung dari masa manfaat.
3. Jurnalnya terbentuk tiap awal bulan tanpa diminta.
4. Nilai bukunya mengikuti jurnal, bukan dihitung terpisah di berkas kerja.
