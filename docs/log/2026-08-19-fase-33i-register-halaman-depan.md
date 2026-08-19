# Fase 33i — daftar modul di seksi Harga, dan mengapa sisanya tidak ditulis ulang

Bagian G panduan gaya meminta beranda, 22 modul `/fitur`, dan 9 FAQ ditulis
ulang seluruhnya dengan kuota keragaman dari Bagian III.

Sebelum menulis ulang apa pun, naskahnya **diukur** terhadap kuota itu.
Hasilnya mengubah isi fase ini.

## Yang diukur, dan apa yang ternyata sudah terpenuhi

| Kuota Bagian III | Terukur |
| --- | --- |
| jawaban FAQ tidak berpola sama | 9 jawaban, **7 kata pembuka berbeda** |
| panjang jawaban bervariasi | 23–50 kata (rasio 2,2×) |
| 22 modul tidak berpola sama | kata pembuka "masalah" hampir seluruhnya unik |
| tanda hubung tidak berlebih | `—` di **11%** kalimat |

Sebabnya sederhana dan sudah tercatat: **Fase 32e menulis ulang naskah landing
seluruhnya**, setelah pemilik menilai bahasanya tidak natural dan terbaca
seperti jualan jasa. Panduan gaya ditulis terhadap naskah **sebelum** itu.

Menulis ulangnya lagi berarti mengaduk naskah yang sudah menjawab keluhan
aslinya, dengan risiko memperkenalkan cacat baru — jenis pekerjaan yang repo ini
sudah putuskan tidak berharga (Fase 9d: "churn tanpa nilai").

## Yang benar-benar tertinggal

Fase 32e mengganti istilah akuntan di **bilah bukti, showcase, dan tabel
perbandingan**:

> "jurnal double-entry … neracanya dijamin seimbang" →
> "Stok langsung berkurang, laporan keuangan terisi, dan pajaknya ikut terhitung"

Tetapi satu daftar tertinggal — dan letaknya membuat itu mahal.
`SINGLE_PLAN_MODULES` ada di **seksi Harga**: layar terakhir sebelum orang
memutuskan membayar, dan satu-satunya tempat di halaman depan yang membuktikan
janji "seluruh modul terbuka".

Enam belas barisnya masih berbunyi seperti daftar untuk pengembang:

| Sebelum | Sesudah |
| --- | --- |
| Akuntansi double-entry | Pembukuan & laporan keuangan |
| Stok multi-gudang & FEFO | Stok banyak gudang & kedaluwarsa |
| Penjualan SO → Surat Jalan | Pesanan, surat jalan & faktur |
| Manufaktur, BoM & QC | Produksi, resep & pemeriksaan mutu |
| CRM pipeline & penawaran | Calon pelanggan & penawaran |
| Proyek, RAB & timesheet | Proyek, anggaran & catatan jam |
| Anggaran & rekonsiliasi bank | Anggaran & pencocokan rekening koran |

Daftar yang tidak bisa dibaca tidak membuktikan apa pun.

**Istilah yang tetap:** PPN, PPh 21, TER, BPJS, e-Faktur, Coretax, POS, CRM,
Excel — kata yang pemilik usaha Indonesia memang memakainya sehari-hari
(keputusan Fase 32e). Menghindarinya membuat daftar ini mengambang.

## `/fitur` sengaja berbeda, kecuali dua kalimat

Pembaca yang sudah menelusuri 22 modul memang sedang membandingkan produk, dan
di sana istilah teknis justru membantu. Polanya pun sudah benar di hampir semua
tempat: **hal biasanya dulu, istilahnya di dalam kurung.**

> "penjualan mengambil lot yang paling dekat kedaluwarsa lebih dulu (FEFO)"
> "Resep produk (BoM) dan perintah produksi…"

Dua kalimat memakai istilahnya **tanpa** penjelasan, dan hanya itu yang diubah:

- "otomatis membuat jurnal double-entry" → "otomatis membuat **jurnal dua sisi
  yang selalu seimbang** (double-entry)"
- "HPP rata-rata bergerak" → "**modal barang (HPP) dirata-rata ulang**"

## Penjaga baru — dan buktinya bahwa keduanya bisa gagal

Dua uji di `apps/web/test/landing-ikon.test.ts`: daftar modul seksi Harga, dan
bilah bukti + showcase + perbandingan + keamanan, harus bebas dari
`double-entry`, `FEFO`, `BoM`, `HPP`, `moving average`, `SO →`.

Sengaja **hanya halaman depan**. `/fitur` dikecualikan dengan alasan tertulis:
melarangnya di sana akan memaksa naskah yang justru sudah benar.

**Disabotase.** Satu baris daftar dikembalikan ke "Akuntansi double-entry", dan
satu baris perbandingan ke "HPP rata-rata bergerak … FEFO": kedua uji memerah,
masing-masing menyebut istilah yang ditemukannya. Lalu dipulihkan.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 621 | ✅ **623** |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 145 · 0 | ✅ 145 · 0 |
| `sapu-istilah` | 0 | ✅ 0 |
| `sapu-gaya` | 0 / 9 / 0 | ✅ 0 / 9 / 0 |

## Catatan kejujuran

Ini fase kedua dalam program ini yang temuannya adalah **klaim panduan gaya
sudah tidak berlaku** — yang pertama "89 empty state buntu" di Fase 33f, yang
ternyata menghitung string dan bukan layar.

Keduanya lahir dari kebiasaan yang sama: mengukur lebih dulu, menulis ulang
sesudahnya. Kalau urutannya dibalik, kedua fase itu akan menghasilkan perubahan
besar yang terasa produktif dan tidak memperbaiki apa pun.
