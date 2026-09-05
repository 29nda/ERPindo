# Fase 54a — audit alur uang & integritas jurnal

Bagian 1 dan 2 dari sepuluh bagian audit yang disepakati bersama pemilik.

## Metodenya, dan kenapa berubah di tengah jalan

Tiga hipotesis pertama saya **salah**, dan itu layak dicatat karena caranya
salah lebih berguna daripada temuannya:

1. *"`postJournal` memeriksa keseimbangan lalu menyisipkan tanpa batch, jadi
   jurnal manual dengan akun tak dikenal akan meninggalkan entri timpang."*
   Endpoint jurnal manual ternyata **sudah** memvalidasi seluruh `accountId`
   ada dan tidak diarsipkan — di baris tepat di atas potongan yang saya baca.
   Saya menyimpulkan dari pembacaan yang belum lengkap.
2. *"Potongan kasbon bisa membuat gaji bersih negatif."* Sudah dibatasi
   `Math.min(cicilan, saldo, sisaNetto)`.
3. *"Penyesuaian gaji ad-hoc tidak masuk ke jurnal, jadi slip dan jurnal
   berbeda angka."* `adjTotal` sudah dilipat ke `allowances` sebelum
   `calculatePayslip`, dan ada penjaga eksplisit yang menolak bila potongan
   melebihi gaji.

Menebak satu per satu ternyata cara yang buruk untuk mengaudit kode yang
memang ditulis hati-hati. Metodenya diganti menjadi **uji invarian**: bukan
"apakah baris ini benar", melainkan "properti apa yang harus selalu berlaku,
dan apakah ada yang bisa melanggarnya".

## Invarian yang ternyata tidak dijaga siapa pun

Komentar di `postForexRevaluation` sudah menyatakan intinya sejak Fase 21f:

> keseimbangan itu invarian yang murah, arah yang mahal

Neraca saldo yang seimbang **tidak** membuktikan pembukuan benar. Sebuah jurnal
bisa seimbang sempurna sambil memasukkan angka ke akun yang salah, dan tidak
ada satu pun gerbang di repo ini yang bisa melihatnya.

Yang menangkapnya adalah rekonsiliasi akun kontrol — dan itu tidak ada.

## Yang dibangun

**`GET /reports/rekonsiliasi`** membandingkan tiga akun kontrol dengan buku
pembantunya: Piutang Usaha vs sisa faktur, Utang Usaha vs sisa tagihan
pemasok, Persediaan vs nilai stok. Ditambah dua pemeriksaan yang tidak bisa
dilihat neraca saldo: jurnal yang **tidak seimbang sendiri** (neraca saldo
menjumlahkan semuanya, jadi dua entri rusak berlawanan arah saling menutupi)
dan jurnal **tanpa satu baris pun** (nol baris menyumbang nol, jadi tidak
pernah memerahkan apa pun).

Halaman **Rekonsiliasi** di menu Laporan menampilkannya. Ini laporan yang
diminta akuntan tiap penutupan buku, jadi ia fitur pelanggan, bukan alat
internal.

**Penyisipan baris jurnal dibuat atomik.** Sebelumnya tiap baris punya
`prepare().run()` sendiri; `SqlExecutor` tidak menyediakan `batch()`, jadi
tidak ada transaksi yang membungkusnya. Kegagalan di tengah loop — FK ke
`accounts`, atau CHECK `debit >= 0` — meninggalkan jurnal berstatus `posted`
yang debitnya tidak sama dengan kreditnya, permanen dan senyap.

Diperbaiki dengan satu pernyataan `INSERT ... VALUES (...), (...)`, yang
atomik menurut definisi SQLite dan bekerja identik di D1 binding lokal maupun
`HttpD1Executor` lewat REST — tanpa menambah metode baru ke antarmuka. Sisa
risikonya, entri tanpa baris sama sekali, dijaring `entriKosong`.

## Cacat yang ditemukan — dan pemiliknya laporan ini sendiri

Jalan pertama rekonsiliasi memerah di dua tempat. Keduanya saya telusuri
sampai sebabnya, bukan sampai gejalanya:

**Piutang selisih Rp 166.500.** Ternyata **rumus laporan saya yang salah**,
bukan pembukuannya. `INV-00003` lunas penuh lalu diretur penuh dengan
pengembalian tunai; buku besar benar (piutang naik lalu turun oleh pelunasan,
retur mengkredit kas), tetapi rumus `total − paid − returned` menghasilkan
−166.500 — "piutang negatif" yang tidak pernah ada. Diperbaiki dengan lantai
nol per dokumen. Saya nyaris melaporkan cacat palsu.

**Persediaan selisih Rp 8.** Buku pembantunya `qty × avg_cost`; harga
rata-rata bergerak selalu menyisakan pembulatan, sementara buku besar membawa
bilangan bulat yang benar-benar diposting. Itu sifat metode rata-rata, bukan
cacat. Diberi toleransi **relatif** (satu per sepuluh ribu saldo), bukan angka
rupiah tetap — ambang tetap harus disetel ulang tiap kali skala pembukuan
berubah, dan ambang yang menuntut perhatian saat tidak ada yang salah adalah
ambang yang lama-lama diabaikan. Pelajaran yang sama baru diambil di Fase 53a
untuk margin demo.

## Uji-negatif yang membuktikan tesisnya

Retur penjualan disuntik cacat **arah**: mengkredit Kas alih-alih Piutang,
dengan jurnal yang tetap seimbang sempurna. Hasilnya:

| Gerbang | Hasil |
|---|---|
| `neraca saldo SEIMBANG` | ✓ **tetap hijau** |
| `54a Piutang Usaha: buku besar cocok` | ✗ **menangkapnya** |

Itulah seluruh alasan bagian ini ada, terbukti dalam satu jalan.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | 1.171 |
| smoke | **1.330** (dari 1.321) |
| ui-sim | **491/491** (dari 487) |
| sapu-warna · istilah · gaya · i18n | 0 pelanggaran |
| tautan dokumen | lulus |

Total **2.992 pemeriksaan**.

Dua gerbang repo ini menangkap kelalaian saya sendiri saat mengerjakannya:
`ui-kunci-mati` menjaring dua kunci kamus yang saya tambahkan tanpa pernah
dipakai, dan ui-sim memerah karena blok cek baru saya sisipkan di tengah alur
uji dasbor sehingga asersi berikutnya berjalan di halaman yang salah.

## Yang belum, dari bagian 1–2

Rekonsiliasi baru menjaga tiga akun kontrol. Yang belum punya buku pembantu
untuk dibandingkan: Hutang Gaji, PPN Masukan/Keluaran, dan Piutang Karyawan.
Ketiganya layak menyusul, tetapi masing-masing menuntut definisi buku
pembantunya sendiri lebih dulu — dan mendefinisikannya asal-asalan akan
mengulang persis cacat rumus yang baru saja saya buat sendiri di piutang.
