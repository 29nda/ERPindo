# Fase 54d — audit persediaan & HPP

Bagian 5 dari sepuluh bagian audit.

## Metodenya sama seperti 54a, karena metode itu yang bekerja

Menebak cacat satu per satu sudah terbukti buruk di Fase 54a — tiga hipotesis
pertama meleset semua. Jadi bagian ini dimulai dari pertanyaan yang berbeda:
**apa yang seharusnya selalu benar tentang persediaan, dan siapa yang
memeriksanya?**

Jawabannya tiga invarian, dan tak satu pun punya penjaga:

1. Saldo stok (`stock_levels.qty`) adalah kartu stoknya yang dijumlahkan
   (`SUM(stock_movements.qty)`) — tidak lebih, tidak kurang.
2. Saldo stok tidak pernah minus.
3. Buku lot tidak pernah mengaku menyimpan lebih banyak daripada saldonya.

Ketiganya **tidak terlihat neraca saldo**, dan itu yang membuatnya berbahaya.
Nilai persediaan di buku besar bisa persis benar sementara kuantitasnya sudah
tidak masuk akal — karena jurnalnya memang tidak pernah membaca kuantitas.

## Yang diperiksa dan ternyata sudah benar

Beberapa dugaan awal saya salah, dan penting mencatat mana:

- **Pembalikan pembelian berlot** sudah ditolak sejak lama dengan pesan yang
  menyuruh pakai Retur Pembelian. Saya menduga jalur itu bisa meninggalkan lot
  hantu; penjaganya sudah ada.
- **Konsumsi bahan produksi** memvalidasi seluruh komponen lebih dulu, lalu
  mengembalikan bahan yang sempat keluar bila gagal di tengah — pada biaya yang
  sama persis saat keluar.
- **Pengambilan multi-gudang** menjumlahkan permintaan per gudang sebelum
  memeriksanya, sehingga dua permintaan ke gudang yang sama tidak bisa
  sama-sama lolos.
- Seluruh penulisan ke `stock_levels`/`stock_movements` bermuara di
  `stockIn`/`stockOut`, dengan satu jalur manual yang menulis kedua sisinya.

## Temuan 1 — pemindahan antar gudang MENGHAPUS tanggal kedaluwarsa

Ada dua jalur pemindahan antar gudang, dan keduanya ditulis dengan pola yang
sama: `stockOut` di gudang asal, lalu `stockIn` di gudang tujuan.

- Transfer gudang (`POST /stock-transfers`)
- Karantina hasil QC produksi

Pola itu kehilangan lot. `stockOut` mengonsumsi lot secara FEFO di gudang asal,
sementara `stockIn` di tujuan dipanggil **tanpa keterangan lot sama sekali**.

Kuantitasnya sampai. Nilainya benar. Jurnalnya nol — nilai perusahaan memang
tidak berubah, jadi tidak ada jurnal yang bisa salah. Yang hilang hanya
tanggalnya.

Pelacakan lot dinyalakan oleh satu jenis pelanggan saja: yang menjual barang
yang bisa kedaluwarsa — apotek, distributor makanan, bahan kimia. Untuk mereka
tanggal kedaluwarsa bukan keterangan tambahan, melainkan satu-satunya alasan
modul stoknya dipakai. Dan memindahkan barang dari gudang pusat ke gudang
cabang sudah cukup untuk menghapusnya: halaman Kedaluwarsa cabang kosong, dan
barang yang paling dekat kedaluwarsa justru terjual paling akhir.

Diperbaiki dengan satu fungsi bersama, `pindahStokAntarGudang()`, yang membangun
kembali lot yang benar-benar dikonsumsi di gudang asal — satu per satu, dengan
nomor dan tanggalnya. Dua jalur di atas memakainya. Menaruhnya di satu tempat
disengaja: jalur pemindahan ketiga yang ditulis besok akan memakai fungsi yang
sudah benar, bukan mengulangi pola yang salah.

## Temuan 2 — barang retur masuk saldo tanpa masuk buku lot

Retur penjualan, refund POS, dan pembatalan faktur mengembalikan barang ke
gudang tanpa menyebut lot mana yang kembali. Memang tidak ada yang bisa
menyebutnya: struk pelanggan tidak menyimpannya, dan tidak ada layar yang
menanyakannya.

Sebelumnya barang itu masuk `stock_levels` saja. Buku lot berhenti menjelaskan
saldo yang ada — apotek yang menerima retur 10 boks melihat stoknya kembali 10,
sementara halaman Kedaluwarsa tidak menyebut satu pun dari kesepuluhnya.
Barangnya ada di rak, tanggalnya lenyap, dan tidak ada satu layar pun yang
mengatakan begitu.

Ini **tidak bisa** diperbaiki dengan menebak lotnya. Yang bisa dilakukan adalah
berhenti menyembunyikannya: barang tanpa keterangan kini tetap masuk buku lot
sebagai **lot tanpa tanggal**, dan Rekonsiliasi Persediaan mendaftarnya sebagai
"lot belum didata" beserta produk, gudang, dan jumlahnya — pekerjaan gudang
yang jelas, bukan selisih yang menuduh.

Lot tanpa tanggal dikonsumsi paling akhir (sesudah semua yang bertanggal),
sesuai urutan FEFO yang sudah ada.

## Temuan 3 — penjaga lot yang bisa dilewati dengan mematikan satu tanda

Pembalikan pembelian menolak produk berlot karena pembalikannya menghitung
`stock_levels` manual dan tidak menyentuh `stock_lots`. Penjaganya menanyakan
tanda `track_expiry` pada produknya.

Tanda itu bisa dimatikan kapan saja lewat layar Produk — dan begitu dimatikan,
pembelian lama yang terlanjur membentuk lot lolos dari penjaga. Baris lotnya
tidak ikut hilang hanya karena tandanya dicabut.

Penjaganya kini menanyakan **keberadaan baris lotnya**, bukan tanda pada
produknya.

## Gerbangnya: Rekonsiliasi Persediaan

Laporan Rekonsiliasi (Fase 54a) sebelumnya membandingkan **nilai**. Kini ia
juga membandingkan **kuantitas**, dan itu pertanyaan yang berbeda.

Empat daftar, masing-masing menyebut SKU, produk, dan gudangnya:

| Daftar | Artinya |
|---|---|
| Saldo ≠ kartu stok | ada jalur yang menulis salah satu sisinya saja |
| Saldo minus | mustahil secara fisik |
| Lot melebihi saldo | lot hantu — menjanjikan barang yang sudah tidak ada |
| Lot belum didata | data belum lengkap, bukan kerusakan (tidak memerahkan laporan) |

Pembedaan terakhir itu disengaja. Menyamakan "rusak" dengan "belum lengkap"
membuat laporan ini menyalak tiap hari untuk keadaan yang normal — dan laporan
yang menyalak saat tidak ada yang salah adalah laporan yang lama-lama
diabaikan.

## Uji-negatif

Ketiganya dibuktikan memerah, bukan dianggap bekerja:

- Pembawaan lot dicabut → dua uji transfer memerah, lima lainnya tetap hijau.
- Pembentukan lot tanpa tanggal dicabut → dua uji retur memerah.
- **Pencatatan kartu stok pada barang keluar dilumpuhkan** lalu smoke
  dijalankan penuh: ke-36 cek "neraca saldo TETAP seimbang" **tetap hijau**,
  sementara gerbang baru memerah sambil menyebut 19 baris produk+gudang
  beserta selisihnya. Persis tesis Fase 54a, kini untuk
  kuantitas: keseimbangan itu invarian yang murah.

## Catatan untuk pemilik

Barang yang kembali lewat retur **tidak lagi hilang dari buku lot**, tetapi
tanggal kedaluwarsanya tetap tidak diketahui sistem — tidak ada yang bisa
mengetahuinya kecuali orang yang memegang barangnya. Halaman Rekonsiliasi
menyebut persis produk, gudang, dan jumlah yang perlu didata ulang lewat Stok ›
Penyesuaian.

Kalau nanti ada pelanggan apotek atau distributor makanan yang serius memakai
FEFO, langkah berikutnya adalah menanyakan tanggal kedaluwarsa pada layar Retur
— bukan menebaknya. Itu perubahan layar, bukan perbaikan cacat, jadi tidak
dikerjakan di fase audit ini.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.244** (dari 1.237) |
| smoke | **1.340** (dari 1.331) |
| ui-sim | 494/494 |
| sapu-warna · istilah · gaya · i18n | 0 pelanggaran |
| tautan dokumen | lulus |

Total **3.078** pemeriksaan.
