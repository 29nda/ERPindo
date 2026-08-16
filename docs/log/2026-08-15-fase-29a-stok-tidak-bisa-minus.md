# Fase 29a — stok tidak lagi bisa menembus angka minus

Pemilik meminta pemeriksaan menyeluruh sebelum ada pelanggan berbayar:
*"saya tidak ingin saat orang sudah berlangganan malah ada masalah pada
perusahaan mereka — dari semua aspek, bukan keuangannya saja."*

Fase 26 mengaudit **keamanan** (siapa boleh membuka apa). Yang belum pernah
diaudit adalah **kebenaran**: apakah angkanya tetap benar ketika aplikasi dipakai
dua orang sekaligus. Bedanya penting — cacat keamanan dilaporkan orang, cacat
kebenaran diam sampai stok fisik tidak cocok dengan sistem berbulan-bulan
kemudian.

> **Catatan jujur di muka:** fase ini menutup satu cacat yang benar-benar ada dan
> terbukti, tetapi juga menghasilkan **dua klaim saya sendiri yang keliru** —
> keduanya dicatat apa adanya di bawah, bukan dihapus dari riwayat.

## Satu klaim saya sendiri yang terbukti KELIRU lebih dulu

Penelusuran awal memunculkan dugaan *"lima modul memposting jurnal tanpa
memeriksa kunci periode"* — lahir dari mencari simbol yang salah. Dibaca ke
sumbernya, kuncinya justru ditegakkan **di dalam `postJournal` sendiri**
(`lib/accounting.ts:121`), satu titik sempit yang dilewati ke-13 modul.

Dicatat karena dua hal. Pertama, supaya tidak diulang. Kedua, karena kekeliruan
itu memberi peta auditnya: repo ini menaruh penjaga di **titik sempit**, jadi
pertanyaannya bukan "apakah tiap modul memeriksa" melainkan **"apakah penjaga di
titik sempit itu benar-benar tidak bisa dilewati"**.

Jawabannya, untuk stok: bisa.

## Cacat: stok jatuh ke MINUS bila dua orang menjual bersamaan

`stockOut()` memeriksa lalu mengurangi dalam dua langkah terpisah:

```
SELECT qty FROM stock_levels …        → tersedia 1
if (level.qty < input.qty) throw      → lolos
UPDATE stock_levels SET qty = qty - ? → tanpa syarat apa pun
```

Dua permintaan bersamaan atas barang terakhir sama-sama lolos pemeriksaan, lalu
sama-sama mengurangi. Skema pun tidak menahannya: `stock_levels.qty` dideklarasi
`INTEGER NOT NULL DEFAULT 0`, tanpa batas bawah.

**Terbukti, bukan diduga.** Uji balapan dijalankan terhadap kode lama:

| Skenario | Hasil kode lama |
| --- | --- |
| 2 penjualan bersamaan atas **1** unit | stok **−1** — terjual dua kali |
| 5 penjualan bersamaan atas **2** unit | stok **−3** — terjual lima kali |
| Penjualan yang ditolak | tetap meninggalkan **mutasi keluar** di kartu stok |

Bukan skenario langka: kasir yang menjual barang terakhir bersamaan dengan admin
yang membuat faktur sudah cukup. Akibatnya berlipat dan senyap — **nilai
persediaan di neraca ikut salah**, dan HPP dihitung dari rata-rata yang basi
sehingga laba kotor pun meleset. Tidak ada satu pun layar yang menyalak.

## Perbaikan

Syaratnya dipindahkan **ke dalam** `UPDATE`, dan hasilnya diperiksa:

```sql
UPDATE stock_levels SET qty = qty - ?
 WHERE product_id = ? AND warehouse_id = ? AND qty >= ?
```

lalu `meta.changes` harus `1`. Database yang memutuskan siapa menang, bukan
urutan kebetulan dua pembacaan. Pola yang sama dipakai Fase 26c untuk token dan
pembayaran langganan.

`SELECT` di awal tetap ada — bukan lagi sebagai penjaga, melainkan untuk
mengambil `avg_cost` dan memberi pesan yang menyebut angka sebenarnya. Yang kalah
balapan membaca ulang sisanya supaya pesannya menyebut keadaan sekarang, bukan
angka basi yang justru membingungkan.

**Urutannya juga dibalik**: baris `stock_movements` kini ditulis SESUDAH
pengurangan berhasil. Pola lama menulisnya lebih dulu, sehingga penjualan yang
ditolak tetap meninggalkan mutasi keluar — kartu stok memperlihatkan barang
keluar yang tidak pernah terjadi.

## Fixture yang diperbaiki, bukan penjaga yang dilemahkan

`stockOutMulti.test.ts` langsung merah setelah perbaikan: DB tiruannya membalas
`{}` polos untuk setiap `UPDATE`, jadi penjaga baru membaca "0 baris berubah" dan
menolak pengambilan yang sah. Yang diperbaiki **fixture-nya** — ia kini menirukan
syarat `qty >= ?` dan mengembalikan `meta.changes` seperti database sungguhan.

Melemahkan penjaga agar uji lama hijau adalah cara paling rapi untuk membatalkan
seluruh fase ini.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **582** (dari 578) |
| `pnpm smoke` | 0 | **1.115** (tetap) |
| `node scripts/ui-sim.mjs` | 0 | **343/343** (tetap) |

**Dibuktikan bisa gagal** — uji balapan ditulis dan dijalankan **sebelum**
perbaikannya dipasang, dan ia merah dengan angka yang menyebut cacatnya sendiri:

| Cek | Merah terhadap kode lama |
| --- | --- |
| dua penjualan atas satu unit | *"stok menembus angka minus — barang terjual dua kali: expected −1 to be +0"* |
| lima penjualan atas dua unit | *"expected −3 to be +0"* |
| mutasi untuk penjualan ditolak | *"expected 2 to be 1"* |

Uji ini memakai `wrapSqliteLambat()` (Fase 26c). Tanpa penundaan itu `node:sqlite`
berjalan sinkron, dua permintaan "bersamaan" tetap berurutan, dan uji balapan
akan **lulus untuk kode yang rusak** — pelajaran yang sudah dibayar sekali.

## Klaim KEDUA saya yang terbukti keliru — dan ini sampai menanyai pemilik

Membaca `lib/commercePosting.ts:751`, jalur pembatalan (void) pembelian menulis
stok secara **absolut**: baca saldo, hitung sendiri, tulis `qty = ?`. Saya
menyimpulkan itu kelas cacat yang sama, lalu menanyakan ke pemilik apa yang
seharusnya terjadi bila pembelian dibatalkan padahal barangnya sudah terjual.
Pemilik menjawab: **tolak pembatalannya, arahkan ke retur pembelian.**

Lalu bagian di ATAS penulisan itu dibaca — yang seharusnya dibaca lebih dulu.
`commercePosting.ts:669-692` sudah menolak void pembelian bila:

- ada **mutasi stok lebih baru** pada produk+gudang yang sama (`rowid >` mutasi
  pembelian ini) → *"Stok dari pembelian ini sudah bergerak — gunakan Retur
  Pembelian untuk koreksi."*;
- produknya berpelacakan lot/kedaluwarsa;
- dokumennya sudah dibayar atau sudah punya retur.

Penjualan menghasilkan mutasi ber-`rowid` lebih tinggi pada produk+gudang yang
sama, jadi **kasus "barangnya sudah terjual" sudah tertolak hari ini** — persis
kebijakan yang baru saja dipilih pemilik. Penulisan absolut di baris 751 aman
justru karena dijaga invarian itu: ia hanya berjalan ketika stoknya terbukti
belum tersentuh sejak pembelian.

**Tidak ada yang perlu diubah, dan pertanyaan ke pemilik itu seharusnya tidak
perlu ditanyakan.** Dua kekeliruan dalam satu fase, keduanya berpola sama:
menyimpulkan dari satu baris tulis tanpa membaca penjaga yang mendahuluinya.
Pelajarannya bukan "kurang teliti" melainkan: di repo ini penjaga hampir selalu
berada di titik sempit **sebelum** operasinya, jadi membaca operasi tulis saja
selalu memberi kesan lebih buruk daripada keadaan sebenarnya.

Yang tersisa nyata: `CHECK (qty >= 0)` / trigger tingkat database belum dipasang.
Bukan lagi karena menunggu keputusan, melainkan karena belum semua jalur tulis
stok disisir (retur, POS, manufaktur) — memasang benteng yang bisa menolak jalur
sah adalah cara membuat kerusakan baru. Itu pekerjaan sub-fase berikutnya.

## Yang TIDAK dikerjakan

- **`stockOutMulti` tidak diubah.** Ia memanggil `stockOut` untuk tiap gudang,
  jadi ikut terlindungi; pemeriksaan awalnya tetap berguna untuk menolak lebih
  dulu sebelum ada gudang yang tersentuh.
- **`avg_cost` basi saat `stockIn` bersamaan tidak dikejar.** Biaya rata-rata
  berjalan memang bergantung urutan; menguncinya menuntut penguncian lintas
  dokumen yang jauh lebih besar dari cacat yang ditutup di sini. Dinyatakan,
  bukan didiamkan.
- **Kunci periode tidak disentuh** — dugaan awal saya terbukti keliru.
