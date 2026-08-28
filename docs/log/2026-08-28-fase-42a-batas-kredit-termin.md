# Fase 42a — batas kredit & termin pembayaran

Fase pertama dari rencana pengembangan yang diminta pemilik. Dipilih lebih dulu
bukan karena paling besar nilainya, melainkan karena **fiturnya sudah terlanjur
dijanjikan**: peragaan `/panduan` dan `/fitur` menyebutkan batas kredit dan
syarat pembayaran selama beberapa fase padahal kolomnya tidak pernah ada.
Klaimnya dicabut pada Fase 41a; fase ini membuat janji itu benar.

## Yang dikerjakan

- Migrasi `0048_batas_kredit_termin`: dua kolom nullable di `contacts`.
- `contactSchema` + dua fungsi murni di `@erpindo/shared`:
  `melampauiBatasKredit` dan `jatuhTempoDariTermin`.
- Validasi batas kredit di `executeInvoice`, **sebelum stok bergerak dan jurnal
  terbentuk** — kalau ditaruh lebih ke bawah, faktur yang ditolak tetap
  meninggalkan mutasi stok yang harus dibatalkan.
- Jatuh tempo diturunkan dari termin, tetapi **yang diketik pengguna menang**.
  Termin adalah nilai baku, bukan aturan yang memaksa.
- `POST /invoices` kini mengembalikan `dueDate`, karena tanggalnya diturunkan
  di server dan kliennya perlu menampilkannya.
- Dua medan di formulir kontak, mengikuti konvensi berkas itu (alamat dan NPWP
  pun hanya muncul saat menyunting).
- Klaim peragaan yang dicabut Fase 41a dikembalikan.

## Keputusan: kosong BUKAN nol

Keduanya nullable, dan itu menentukan di empat tempat sekaligus:

| Nilai | Batas kredit | Termin |
| --- | --- | --- |
| kosong (NULL) | tanpa batas | jatuh tempo diisi manual |
| 0 | tidak boleh berutang sama sekali | jatuh tempo hari itu juga |

Karena itu `toRow` memakai `?? null`, bukan `|| null`; penangan submit memakai
`angkaOpsional`, bukan `Number(x) || 0`; dan kolomnya nullable alih-alih
`DEFAULT 0`. Default nol akan diam-diam **memblokir penjualan ke seluruh
pelanggan lama** yang belum pernah disetel.

## Dua kesalahan saat mengerjakan, dan apa yang mengungkapnya

1. **Penggantian teks mengenai INSERT pembelian, bukan faktur.** Ditangkap
   typecheck (`Cannot find name 'dueDate'`), bukan oleh mata.
2. **Faktur uji smoke mengotori tenant utama** dan menggagalkan delapan asersi
   angka yang tidak ada hubungannya. Dipindahkan ke tenant Dewi yang memang
   sudah ditandai "terisolasi dari asersi angka tenant utama", memakai produk
   jasa supaya stok pun tidak bergerak.

## Validasi

- `pnpm test` — **943 lulus** (299 shared + 360 web + 284 api; naik dari 923)
- `pnpm smoke` — **1.178 cek** (naik dari 1.173)
- `node scripts/ui-sim.mjs` — **434/434** (naik dari 431)
- typecheck · lint · build · lima penyapu naskah — hijau
