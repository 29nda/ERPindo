# Pelanggan & Pemasok

Satu daftar untuk pelanggan dan pemasok, lengkap dengan NPWP (untuk e-Faktur), alamat, dan riwayat transaksinya.

> Buka di aplikasi: `/app/master/kontak`

## Menambah kontak

1. Pilih tipe: Pelanggan, Pemasok, atau Keduanya.
2. Isi NPWP untuk pelanggan ber-PPN — dipakai otomatis di ekspor e-Faktur & XML Coretax.

**Satu kontak untuk pelanggan sekaligus pemasok**

Kontak menyimpan NPWP, syarat pembayaran, dan batas kredit. Faktur mengambil datanya, umur piutang mengelompokkannya, dan ekspor pajak memakai NPWP yang sama.

1. Nama kontak diisi.
2. NPWP diisi sekali di sini, bukan di tiap faktur.
3. Kontak disimpan.
4. Syarat pembayaran dan batas kreditnya langsung berlaku pada faktur berikutnya.

> 💡 Kontak juga bisa diimpor massal dari CSV, sama seperti produk.
