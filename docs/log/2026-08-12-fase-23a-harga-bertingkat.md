# Fase 23a — Harga bertingkat per grup pelanggan

Butir pertama Fase 23, dan salah satu dari 46 baris roadmap yang memang belum
pernah dibangun (`docs/03-roadmap-lanjutan.md:112`, skor S/S).

Masalahnya: toko yang melayani grosir **dan** ecer hari ini hanya punya satu
`products.sell_price`. Harga grosir diingat di kepala kasir lalu diketik ulang
tiap transaksi — dan salah ketiknya baru ketahuan saat margin bulanan terlihat
aneh, karena tidak ada satu angka pun yang terlihat salah saat diketik.

## Dua keputusan pemilik yang menentukan bentuknya

**1. Grup pelanggan + harga khusus per produk**, bukan diskon persen seragam dan
bukan qty-break. Praktik grosir Indonesia menentukan harga per barang, bukan
potongan rata.

**2. Harga DISARANKAN, bukan ditegakkan.** Ini yang menentukan blast radius.
API hari ini menerima `unitPrice` apa pun dari layar — di faktur, kasir,
pesanan penjualan, penawaran, kontrak, dan API publik. Menegakkan harga berarti
menyentuh **semua** jalur tulis itu sekaligus, sekaligus mematikan harga nego.
Karena disarankan saja, **tidak ada satu pun jalur tulis yang berubah**: yang
berubah hanya angka yang diusulkan layar.

## Yang dikerjakan

- Migrasi `0046_harga_bertingkat` — `price_groups`, `price_group_items`
  (unik per grup+produk), dan `contacts.price_group_id`.
- `hargaUntukGrup()` — fungsi murni di `packages/shared/src/commerce.ts`,
  bersebelahan dengan `konversiSatuanBaris()` (Fase 21c) karena satu keluarga
  masalah: keduanya menghitung angka baris sebelum baris itu dikirim.
- `apps/api/src/routes/priceGroups.ts` — isi daftar harga + `resolve`.
  CRUD grupnya sendiri **tidak menulis kode baru**: memakai pabrik `crudRoutes()`
  yang sudah ada di `masterdata.ts`.
- Halaman baru `apps/web/src/pages/grupHarga.tsx` (Master Data › Grup Harga)
  dan pemilih grup di form Kontak.
- `pages/commerce.tsx` mode `sale`: harga terisi sendiri saat pelanggan bergrup
  dipilih, dengan lencana yang menyebut nama grupnya.

## Tiga aturan yang salahnya tidak akan terlihat di layar

**1. Rp 0 adalah harga, bukan "kosong".** Barang bonus memang berharga nol.
"Belum diatur" diwakili oleh **barisnya tidak ada**, bukan nilai 0 — karena itu
mengembalikan produk ke harga dasar memakai `DELETE`, bukan `PUT 0`. Kalau 0
diperlakukan sebagai kosong, barang bonus diam-diam tertagih harga normal dan
fakturnya terlihat sangat wajar.

**2. Arah konversi satuan.** `price_group_items.unit_price` disimpan per satuan
**dasar**; `invoice_lines.unit_price` per satuan yang **diinput** (aturan Fase
21c). Jadi resolusi **mengali** faktor — pasangan terbalik dari pembagian di
`konversiSatuanBaris()`. Salah arah membuat faktur per dus tertagih 1/24
harganya tanpa satu angka pun terlihat ganjil.

**3. Harga nego tidak boleh tertimpa.** Tiap baris melacak `hargaDisentuh`;
mengganti pelanggan hanya menghitung ulang baris yang **belum** diketik manual.
Menimpa harga yang sudah disepakati adalah kehilangan data yang tak
meninggalkan jejak apa pun. "Ubah faktur" (Fase 10c) karena itu memuat seluruh
barisnya sebagai sudah-disentuh: harga dokumen lama adalah harga yang benar-benar
disepakati, bukan harga daftar hari ini.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **450** (dari 441) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1071** (dari 1057) |
| `node scripts/ui-sim.mjs` | 0 | **329/329** (dari 325) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

9 uji unit baru (`packages/shared/test/hargaGrup.test.ts`), 14 cek smoke
(blok `11n5`), 4 cek ui-sim (`F45a`–`F45c` + bebas-galat).

**Dibuktikan bisa gagal**, semuanya dikembalikan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| aturan 1 di fungsi murni (`hargaGrup === 0` dianggap kosong) | uji unit `harga grup Rp 0 SAH (barang bonus)` |
| aturan 1 di sisi API (`if (r.unit_price)` saat menyusun peta harga) | **dua** cek smoke: `23a harga Rp 0 IKUT TERBAWA di resolve` (`→ {…:9500}`) dan `23a menghapus satu harga TIDAK menyentuh harga produk lain` (`→ {}`) |
| aturan 2 (dibagi faktor, bukan dikali) | **tiga** uji unit, termasuk uji bolak-balik dengan `konversiSatuanBaris()` |
| aturan 3 (`hargaDisentuh` diabaikan saat ganti pelanggan) | cek ui-sim `F45c` (`→ 85000`, harga ketikan 77777 tertimpa harga dasar) |

Sabotase aturan 2 sengaja diuji lewat **perjalanan bolak-balik**: harga daftar
(per pcs) → harga baris (per dus) → kembali ke per pcs lewat
`konversiSatuanBaris()`, fungsi yang dipakai mesin posting sungguhan. Uji yang
hanya membandingkan satu angka harapan masih bisa hijau kalau arah DAN angka
harapannya sama-sama dibalik; uji bolak-balik tidak bisa. Ini pelajaran 22f
diterapkan di muka: **sabotase yang salah sasaran memberi rasa aman yang sama
persis dengan penjaga yang bekerja.**

## Cek lama yang ikut berubah, dan kenapa itu benar

`F14 melipat 'Master Data' menyembunyikan 3 menu` → **4 menu**. Seksi Master
Data memang bertambah satu (Grup Harga). Angkanya diperbarui, bukan ceknya
dilonggarkan menjadi "lebih dari 0" — cek yang menghitung persis itulah yang
membuat penambahan menu tak bisa lewat tanpa terlihat.

## Catatan kejujuran

**Uji ui-sim F45c pertama saya salah tulis dan gagal karena alasan yang keliru.**
Ia mencari pelanggan `"Pembeli Ecer 23a"` — kontak yang dibuat blok **smoke**
`11n5`. Smoke dan ui-sim memakai database berbeda, jadi kontak itu tak pernah
ada di sana dan ceknya mati karena timeout, bukan karena penjaganya bobol.
Kalau saya membacanya sepintas sebagai "F45c merah", saya akan menyimpulkan
penjaganya bekerja padahal ia belum pernah benar-benar dijalankan. Diperbaiki
dengan membuat kontak pembandingnya di dalam alur ui-sim sendiri.

**Sabotase sisi API menjatuhkan dua cek, bukan satu**, dan yang kedua tidak saya
rencanakan: cek "menghapus satu harga tidak menyentuh harga produk lain"
kebetulan bersandar pada produk bonus berharga 0. Itu keberuntungan, bukan
desain — dan artinya cek kedua itu sebenarnya menguji dua hal sekaligus tanpa
saya sadari saat menulisnya.

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **Kasir (POS), pesanan penjualan, penawaran CRM, dan kontrak berulang belum
  memakai harga grup** — Fase 23b. POS bahkan belum punya pemilih pelanggan
  sama sekali (`routes/pos.ts` memakai kontak tetap "Pelanggan Umum"), jadi ia
  butuh pemilih grup tersendiri, bukan sekadar pemasangan ulang.
- **Harga tidak ditegakkan server.** Kasir tetap bisa menjual di bawah harga
  grosir. Itu keputusan pemilik, bukan kelalaian.
- **Tidak ada jejak audit saat harga ditimpa.** Opsi ini ditawarkan ke pemilik
  dan tidak dipilih.
- **Harga bertingkat untuk pembelian tidak dibuat** — harga dari pemasok datang
  dari negosiasi, bukan daftar harga milik kita.
- **Tanpa masa berlaku harga** (promo per periode). Satu harga per grup per
  produk, berlaku sampai diubah.
