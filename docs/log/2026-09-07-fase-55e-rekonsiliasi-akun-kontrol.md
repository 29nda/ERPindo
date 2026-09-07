# Fase 55e — empat akun kontrol yang tersisa

## Yang ditutup

Fase 54a membangun rekonsiliasi buku besar vs buku pembantu untuk tiga akun —
Piutang Usaha, Utang Usaha, Persediaan — dan menutup lognya dengan catatan
jujur:

> Yang belum punya buku pembantu untuk dibandingkan: Hutang Gaji, PPN
> Masukan/Keluaran, dan Piutang Karyawan. Ketiganya layak menyusul, tetapi
> masing-masing menuntut definisi buku pembantunya sendiri lebih dulu — dan
> mendefinisikannya asal-asalan akan mengulang persis cacat rumus yang baru saja
> saya buat sendiri di piutang.

Fase ini mendefinisikannya, dan syaratnya satu: **buku pembantunya harus datang
dari tabel yang BUKAN buku besar.** Buku pembantu yang ternyata jurnal yang sama
ditulis ulang hanya membuktikan penjumlahan, bukan pembukuan.

| Akun | Buku pembantunya |
|---|---|
| **Utang Gaji** (2-1200) | jumlah potongan PPh 21 & BPJS seluruh `payroll_runs` + PPh 21 seluruh `thr_runs`, yang belum dibatalkan |
| **Piutang Karyawan** (1-1210) | `SUM(employee_loans.balance)` kasbon aktif |
| **PPN Keluaran** (2-1100) | pajak seluruh faktur penjualan − pajak retur penjualan |
| **PPN Masukan** (1-1400) | pajak seluruh faktur pembelian − pajak retur pembelian |

Tidak ada jalur penyetoran PPh 21 maupun PPN ke kas negara di aplikasi ini,
jadi kedua saldo itu memang menumpuk — dan buku pembantunya adalah akumulasinya,
bukan sisa setelah setoran. Kasir memakai tabel `invoices` yang sama, jadi
penjualan POS ikut tercakup tanpa sumber keempat.

Keempatnya bertoleransi **nol**: seluruhnya jumlah bilangan bulat tanpa satu pun
pembagian, jadi selisih serupiah pun berarti ada posting yang salah arah. Itu
berbeda dari Persediaan, yang toleransinya relatif karena harga rata-rata
bergerak memang menyisakan pembulatan.

## Kode akun yang dieja dua kali

`2-1200` dan `1-1210` sudah dipakai `routes/payroll.ts` sejak Fase 2o, tetapi
sebagai konstanta lokal di berkas itu. Rekonsiliasi perlu menyebut kode yang
SAMA, dan dua tempat yang mengeja kode akun sendiri-sendiri adalah bentuk cacat
yang berulang di sepuluh bagian audit: begitu salah satunya berubah, yang lain
merekonsiliasi akun yang keliru dan melaporkan "cocok" tentang sesuatu yang
tidak diperiksanya.

Keduanya pindah ke `SYS_ACCOUNTS`, dan penggajian membacanya dari sana.

## Ketujuhnya cocok pada jalan pertama — dan itu yang harus dicurigai

Buku pembantu yang selalu cocok bisa berarti dua hal: pembukuannya benar, atau
ia mengukur dirinya sendiri. Fase 54a menemukan yang kedua pada dirinya sendiri
(rumus piutang yang salah menuduh pembukuan yang benar), jadi "hijau" saja bukan
bukti.

Buktinya uji-negatif: potongan penggajian disuntik agar dikredit ke **Utang
Usaha**, bukan Utang Gaji.

| Gerbang | Hasil |
|---|---|
| Seluruh cek `neraca saldo SEIMBANG` | ✓ **tetap hijau** |
| `54a Utang Usaha: buku besar cocok` | ✗ BB 30.751.000 vs BP 28.862.000 |
| `54a Utang Gaji: buku besar cocok` | ✗ BB 0 vs BP 1.889.000 |

Jurnalnya seimbang sempurna; hanya arahnya yang salah. Neraca saldo tidak bisa
melihatnya, dan rekonsiliasi menangkapnya di **dua** tempat sekaligus — sekali
karena akun tujuannya kelebihan, sekali karena akun yang benar kosong.

Itulah seluruh alasan laporan ini ada, terbukti untuk kedua kalinya.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.310** (tidak berubah) |
| smoke | **1.371** (dari 1.367) |
| ui-sim | **507/507** (dari 506) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| tautan dokumen | lulus |
