# Akuntansi & Jurnal

Fondasi ERPindo adalah pembukuan double-entry sungguhan: setiap transaksi menjadi jurnal seimbang, buku besar per akun, dan neraca saldo yang dijamin balance.

> Buka di aplikasi: `/app/keuangan/jurnal`

## Bagan akun & jurnal umum

Bagan akun standar Indonesia (kas, bank, piutang, persediaan, PPN, modal, pendapatan, beban) sudah tersedia sejak daftar; Anda bisa menambah akun sendiri atau mengganti namanya (kode & tipe terkunci demi integritas laporan).

Sebagian besar jurnal dibuat otomatis oleh modul lain. Untuk pencatatan manual (mis. bayar listrik, setoran modal), pakai Jurnal Umum — sistem menolak jurnal yang tidak seimbang.

**Bagan akun yang sudah terpasang, bukan yang harus disusun**

Bagan akun standar Indonesia terpasang saat perusahaan dibuat. Ia bisa ditambah, tetapi tidak perlu disusun dari nol — dan tidak ada proyek berbulan-bulan untuk menetapkannya.

1. Bagan akun sudah ada sejak perusahaan dibuat.
2. Akun tambahan bisa dibuat sendiri.
3. Akun ditambahkan.
4. Akun yang sudah terpakai dilindungi dari penghapusan.

## Buku besar & neraca saldo

Buku besar menampilkan mutasi & saldo per akun. Neraca saldo merangkum semua akun — total debit selalu sama dengan total kredit; kalau tidak, sistemlah yang salah, bukan Anda (dan 390+ uji otomatis kami menjaganya).

**Koreksi yang meninggalkan jejak, bukan yang menghapusnya**

Jurnal tidak pernah dihapus atau disunting. Salah posting diperbaiki dengan jurnal pembalik yang bertaut dua arah dengan yang dikoreksinya, sehingga riwayatnya tetap utuh untuk diperiksa.

1. Sebuah jurnal diposting ke akun yang keliru.
2. Kesalahannya ditemukan saat menutup buku.
3. Yang tersedia adalah tombol Balik, bukan tombol Hapus.
4. Jurnal pembalik terbentuk dengan nilai yang sama persis, arah berlawanan.
5. Kedua jurnal saling menunjuk, dan tidak satu pun bisa dihilangkan.

> 💡 Jurnal terposting tidak bisa diedit (prinsip audit). Koreksi dilakukan lewat jurnal pembalik/void.
