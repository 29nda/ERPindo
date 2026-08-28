# Fase 44a — Komisi sales

## Yang dikerjakan

Sebelum fase ini faktur tidak menyimpan **milik siapa** penjualan itu, sehingga
komisi tidak bisa dihitung sama sekali — bukan "belum ada laporannya",
melainkan datanya memang tidak ada.

- `packages/shared/src/accounting.ts` — `dasarKomisi()`, `porsiTerpicu()`,
  `hitungKomisi()`, `bpKePersen()`.
- Migrasi `0051_komisi_sales` — `invoices.salesperson_id`,
  `invoices.cogs_amount`, tabel `commission_schemes`,
  `employees.commission_scheme_id`.
- `apps/api/src/routes/payroll.ts` — skema komisi + laporan komisi.
- `apps/web/src/pages/commerce.tsx` — pemilih sales pada faktur penjualan.
- `apps/web/src/pages/payroll.tsx` — tab Komisi.

## Keputusan yang menentukan uangnya

**Dasar omzet adalah subtotal, bukan total.** Total memuat PPN — uang yang
dititipkan negara, bukan hasil penjualan. Membayar komisi atasnya berarti
membayar sales dari kas pajak. Diuji dengan faktur berPPN 11%: komisi 2,5%
harus Rp 250.000 dari subtotal 10 juta, bukan Rp 277.500 dari total 11,1 juta.

**Tarif disimpan basis poin bilangan bulat** (250 = 2,5%), bukan persen
pecahan. Persen pecahan menyeret aritmetika uang ke bilangan pecahan, dan
selisih satu rupiah pada komisi adalah selisih yang diperdebatkan orang.
Layarnya tetap meminta persen, dan menerima koma desimal Indonesia.

**Pemicu bakunya `pelunasan`, bukan `faktur`.** Membayar komisi atas faktur
yang belum tentu tertagih adalah cara klasik kehilangan uang: salesnya sudah
dibayar, pelanggannya kabur. Pembayaran sebagian menghasilkan komisi sebagian,
proporsional — membayar penuh atas cicilan pertama menyamakan cicilan dengan
lunas.

**Retur dikurangkan, faktur batal tidak berkomisi, jual rugi tidak berkomisi
negatif.** Yang terakhir disengaja: memotong gaji sales lewat komisi minus
adalah keputusan yang harus diambil orang, bukan diam-diam oleh rumus.

**`cogs_amount` melekat pada faktur.** HPP sudah lama masuk jurnal, tetapi
hanya sebagai baris jurnal; membacanya kembali untuk tiap faktur lambat dan
rapuh, sedangkan skema berdasar laba membutuhkannya per faktur.

**Laporannya dihitung saat dibaca, bukan disimpan sebagai angka jadi.** Retur,
pelunasan, dan pembatalan terus mengubah komisi yang layak dibayar; angka jadi
akan basi begitu salah satunya terjadi. Yang disimpan hanya skemanya — aturan
mainnya, bukan hasilnya.

**Sales tanpa skema DILAPORKAN sebagai jumlah tersendiri**, bukan dihilangkan.
Menghilangkannya membuat laporan terlihat benar padahal ada penjualan yang tak
pernah dihitung siapa pun.

## Catatan kejujuran

**Penjaga batas kredit dari Fase 42a menolak faktur uji saya sendiri.** Cek
smoke pertama memakai `plgKredit` — pelanggan berbatas kredit Rp 1.000.000 —
untuk faktur Rp 11.100.000. Gerbangnya benar, ujinya yang salah tempat:
pelanggan berbatas ketat bukan tempat menguji komisi. Dibuatkan pelanggan
tersendiri. Sembilan cek gagal berantai dari satu kesalahan itu, termasuk dua
cek pembayaran yang "Data tidak valid" hanya karena `refId`-nya tak pernah ada.

**Penggantian teks nyaris mendarat di jalur PEMBELIAN lagi.** Blok `.bind(...)`
faktur dan pembelian identik sampai baris terakhir — persis jebakan yang
menjatuhkan Fase 42a. Kali ini terdeteksi sebelum ditulis (pencacahan
menghasilkan 2, bukan 1), lalu penggantiannya dijangkarkan pada **posisi**
sesudah `INSERT INTO invoices`, bukan pada teksnya.

**`sapu-i18n` sempat naik 53 → 56**, seluruhnya dari regex tanggal sebaris di
dalam `enabled:`. Kali ini penjaganya TIDAK diperluas lagi — sudah dua kali
diperluas, dan perluasan ketiga akan menjadikannya saringan serba-boleh. Yang
diperbaiki kodenya sendiri: regex yang berulang diangkat jadi `tanggalSah()`,
dan syarat rentang bertiga diberi nama `rentangSah`. Keduanya memang lebih
mudah dibaca, jadi penyapunya menunjuk hal yang benar meski dengan alasan yang
salah. Kembali ke 53.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.016 lulus** (349 shared + 366 web + 301 api; naik dari 993)
- `pnpm build` — lulus
- `pnpm smoke` — **1.230 cek** (naik dari 1.213; 17 cek komisi)
- `node scripts/ui-sim.mjs` — **449/449** (naik dari 444; 5 cek komisi)
- `pnpm lint` — bersih
- `sapu-i18n` 53 (tetap), `sapu-warna` 0, `sapu-istilah` bersih,
  `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
