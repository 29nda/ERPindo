# Laporan Keuangan

Laba Rugi, Neraca, Arus Kas, dan Umur Piutang/Utang — semuanya dihitung real-time dari jurnal, bisa diekspor CSV dan dicetak.

> Buka di aplikasi: `/app/keuangan/laba-rugi`

## Laba Rugi & Neraca

Pilih periode → laporan tampil seketika. Neraca menyertakan laba berjalan sehingga selalu seimbang. Karena satu sumber (jurnal), angka antar laporan tidak mungkin saling bertentangan.

**Laporan yang bisa ditelusuri sampai ke jurnalnya**

Laba rugi, neraca, dan arus kas disusun dari jurnal berstatus posted. Tiap angka bisa diklik sampai ke transaksi pembentuknya, jadi tidak ada baris yang tidak diketahui asalnya.

1. Laba kotor tersusun dari pendapatan dikurangi harga pokok.
2. Angkanya dibuka untuk ditelusuri.
3. Yang muncul adalah jurnal pembentuknya, bukan penjelasan.
4. Periode yang belum ditutup ditandai, supaya tidak dikira final.
5. Tren kuartalan memakai angka yang sama, bukan salinan terpisah.
6. Neraca dan arus kas disusun dari sumber yang sama.

## Arus Kas & Umur Tagihan

Arus Kas menampilkan uang masuk/keluar per keterangan jurnal — memudahkan melihat ke mana kas mengalir. Umur Piutang/Utang mengelompokkan tagihan per usia (lancar, 1–30, 31–60, 61–90, >90 hari) agar penagihan terprioritas.

**Neraca yang seimbang karena disusun, bukan karena dicocokkan**

Aset selalu sama dengan kewajiban ditambah ekuitas, karena keduanya dibaca dari jurnal yang sama dan tiap jurnal wajib seimbang saat disimpan.

1. Sisi aset dijumlahkan.
2. Sisi kewajiban dan ekuitas berjumlah sama persis.
3. Keseimbangannya bukan hasil penyesuaian, melainkan akibat jurnal yang tidak bisa disimpan bila timpang.

## Anggaran vs realisasi

Tetapkan target pendapatan & beban per akun per bulan di halaman Anggaran — realisasi terisi otomatis dari jurnal, selisihnya diberi warna.
