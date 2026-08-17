# Fase 31b — kerangka aplikasi: rail wilayah kerja

Sub-fase kedua perombakan. 31a mengganti **bahasa visual**; sub-fase ini
mengganti **bentuk kerangkanya**.

## Yang paling dikenali dari aplikasi lama

Sidebar 45 item dalam 8 seksi bergulir sepanjang layar. Nama seksinya mengikuti
modul teknis, bukan pekerjaan:

| Seksi lama | Isi yang membingungkan |
| --- | --- |
| Transaksi | POS, Penjualan, Pembelian, Stok, Manufaktur — jual & beli dicampur |
| Master Data | Produk, **Kontak**, Gudang, Grup Harga |
| Lainnya | Proyek, Kontrak, Persetujuan, **Pemeliharaan**, Alat, Migrasi, Admin |

Pemakai harus tahu lebih dulu modul mana yang memuat pekerjaannya. "Kontak" ada
di Master Data; "Pemeliharaan" di Lainnya — keduanya tempat yang tidak akan
ditebak orang yang sedang mencari.

## Taksonomi baru: per pekerjaan

| Wilayah | Isi |
| --- | --- |
| **Jual** | Kasir, Penjualan, Pesanan, Marketplace, Pipeline, Penawaran, Helpdesk |
| **Beli & Stok** | Pembelian, Pengadaan, Stok, Produk, Kontak, Gudang, Grup Harga |
| **Uang** | Catat, Kas & Bank, Bagan Akun, Jurnal, Buku Besar, Anggaran, Dimensi, Mata Uang, Konsolidasi |
| **Laporan** | Neraca Saldo, Laba Rugi, Neraca, Arus Kas, Umur Tagihan, Laporan Penjualan |
| **Aset & Pajak** | Aset Tetap, Pemeliharaan, Pajak, e-Faktur |
| **Orang & Proyek** | Manufaktur, Penggajian, Absensi, Proyek, Kontrak, Persetujuan |
| **Kelola** | Alat Bantu, Dukungan, Migrasi, Admin, Pengaturan |

Rute, label, izin, dan ikon per item **tidak berubah** — hanya pengelompokan dan
urutannya. Itu batasan yang disengaja: ui-sim mendatangi 46 rute lewat URL
langsung, jadi navigasi boleh dirombak total selama URL-nya tetap.

## Rail ikon — dan kenapa ia BUKAN penyaring

Kolom ikon selebar 56px di kiri panel, satu ikon per wilayah, wilayah rute aktif
tersorot.

Rencana semula membuat panel hanya menampilkan wilayah aktif — pola "rail +
panel konteks" yang biasa. Setelah membaca asersi ui-sim, rencana itu diubah,
dan alasan produknya lebih penting daripada alasan ujinya:

- **Alasan produk.** Menyembunyikan 38 dari 45 tautan membuat pencarian menu
  lintas-wilayah mustahil, dan membuat 45 halaman terasa lebih **jauh** daripada
  sebelumnya. Aplikasi ini justru sedang berusaha membuatnya lebih dekat.
- **Alasan uji.** Lima asersi menghitung `aside nav a:visible` atau mencari
  tautan lintas-wilayah ("Kontak", "Pemeliharaan"). Menyaring panel memecah
  kelimanya sekaligus.

Jadi rail adalah **lompatan**: mengekliknya menggulirkan panel ke judul wilayah,
dan **membuka lipatannya lebih dulu** bila sedang terlipat — menggulir ke judul
yang terlipat hanya memindahkan pandangan ke tempat kosong.

Rail sengaja diletakkan **di luar `<nav>`**, mengikuti keputusan yang sudah
tercatat sejak Fase 17c untuk pemicu palet perintah: sebelas asersi menghitung
`aside nav a:visible` dan `aside nav button:visible`. Ada asersi khusus yang
menjaganya (`F14b rail berada DI LUAR <nav>`), supaya bila kelak seseorang
memindahkannya, kegagalannya menyebut sendiri sebabnya.

## Satu asersi lama disesuaikan — dan itu harus dikatakan terus terang

`F14` melipat seksi **"Master Data"** dan menuntut tepat 4 tautan hilang. Seksi
itu tidak ada lagi. Asersinya diubah menjadi melipat **"Beli & Stok"** dengan 7
tautan.

Yang **diuji** tidak berubah: melipat sebuah seksi menyembunyikan tepat sejumlah
tautan miliknya, lipatannya bertahan setelah muat ulang, dan membukanya
memulihkan seluruhnya. Yang berubah hanya taksonominya. Dua nama seksi lain yang
diuji `F14` — "Laporan" dan "Aset & Pajak" — bertahan apa adanya, jadi asersinya
tidak disentuh.

**Satu jalur uji sempat hilang tanpa saya sadari.** Penulisan ulang menghapus
cek "membuka lipatan memulihkan menu" dan menggantinya dengan pembukaan lewat
rail — sehingga jalur tombol judul tidak teruji sama sekali. Dikembalikan
sebagai asersi terpisah; kini kedua jalur diuji.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 603 | ✅ 603 |
| `pnpm smoke` | 1.130 | ✅ 1.130 |
| `node scripts/ui-sim.mjs` | 356 | ✅ **360** |
| `sapu-i18n` utang teks | 145 | ✅ 145 |
| `sapu-warna` | 106 / 344 | ✅ 106 / 344 |

Lima asersi baru: empat untuk rail (jumlah tombol, letaknya di luar `<nav>`,
membuka wilayah terlipat, sorotan rute aktif) dan satu pemulihan jalur tombol
judul. Satu asersi lama diubah nama seksinya, tidak dihapus.

### Asersi baru dibuktikan bisa gagal

`aria-current` pada tombol rail dimatikan dengan sengaja, lalu ui-sim
dijalankan ulang:

```
✗ F14b rute aktif menyorot wilayahnya di rail
UI-SIM: 359/360 checks passed — 1 GAGAL
```

Tepat satu asersi memerah — bukan longsoran yang menyamarkan sebabnya — lalu
dipulihkan ke 360/360.
