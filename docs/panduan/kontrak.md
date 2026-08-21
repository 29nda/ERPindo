# Kontrak & Tagihan Berulang

Langganan bulanan pelanggan (jasa maintenance, sewa, pasokan rutin) ditagih otomatis: sistem menerbitkan faktur setiap periode tanpa Anda ingat-ingat.

> Buka di aplikasi: `/app/kontrak`

## Membuat kontrak berulang

1. Buat kontrak: pelanggan, frekuensi (bulanan), tanggal mulai, dan baris item + harga.
2. Setiap jatuh tempo, faktur terbit otomatis (lewat cron harian) — muncul di menu Penjualan seperti faktur biasa.

**Tagihan berulang yang terbit tanpa diingatkan**

Kontrak berlangganan ditulis sekali beserta periodenya. Fakturnya terbit sendiri pada tanggalnya, sudah berjurnal, dan kontrak yang mendekati berakhir ditandai sebelum terlewat.

1. Kontrak ditulis sekali, beserta siklus penagihannya.
2. Fakturnya terbit pada tanggalnya tanpa ada yang perlu mengingat.
3. Pendapatan berulangnya terbaca sebagai satu angka.
