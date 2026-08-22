# Fase 38e — dua puluh dua modul, dua puluh dua peragaan, nol gambar

## Yang dikerjakan

Halaman `/fitur` adalah halaman terpanjang di situs: 22 modul, masing-masing
dengan masalah, cara, hasil, dan satu tangkapan layar. Seluruh tangkapan layar
itu diganti peragaan.

**Tujuh belas naskah baru**, bukan dua puluh dua. Lima modul terberat — faktur,
kasir, stok, penggajian, dan laporan — memakai ulang naskah yang sudah ditulis
untuk beranda. Menulis versi kedua untuk modul yang sama bukan hanya pekerjaan
ganda; ia juga membuat dua peragaan yang bisa saling bertentangan angkanya
tanpa ada yang menyadarinya.

| Naskah | Modul | Yang dibuktikannya |
| --- | --- | --- |
| `jurnal-pembalik` | Akuntansi | Koreksi meninggalkan jejak, bukan menghapusnya |
| `ppn-coretax` | Pajak | PPN masa tersusun dari faktur, bukan dari rekapitulasi |
| `konsolidasi-entitas` | Multi-entitas | Eliminasi antar-perusahaan sebelum penjumlahan |
| `peran-audit` | Keamanan | Pembatasan per dimensi + log audit berisi pelakunya |
| `dasbor-harian` | Dasbor | Yang ditampilkan menuntut keputusan, bukan sekadar kabar |
| `pembelian-utang` | Pembelian | Stok, utang usaha, dan PPN masukan dalam satu jurnal |
| `persetujuan-berjenjang` | Persetujuan | Batas wewenang dijalankan sistem |
| `kas-rekonsiliasi` | Kas & Bank | Selisih diuraikan sampai nol |
| `aset-penyusutan` | Aset Tetap | Jurnal penyusutan berjalan sendiri tiap bulan |
| `pipeline-penawaran` | CRM | Penawaran → pesanan → faktur tanpa mengetik ulang |
| `anggaran-realisasi` | Anggaran | Selisih muncul sepanjang bulan, bukan setelah tutup buku |
| `proyek-biaya` | Proyek | Laba per proyek terbaca selagi proyeknya berjalan |
| `kontrak-berulang` | Kontrak | Faktur terbit tanpa ada yang perlu mengingat |
| `manufaktur-bom` | Manufaktur | Bahan → barang jadi, modal per satuan terhitung |
| `pemeliharaan-jadwal` | Pemeliharaan | Biaya menempel pada asetnya, bukan pada beban umum |
| `helpdesk-tiket` | Helpdesk | Tiket membuka faktur dan surat jalannya sekaligus |
| `asisten-tanya` | Asisten AI | Jawaban berupa angka bertautan ke dokumen asalnya |

## Angkanya menyambung antar-naskah, dan itu disengaja

Kopi Arabika berharga Rp 150.000 dengan biaya rata-rata Rp 90.000 di setiap
naskah yang menyebutnya. Setelah `pembelian-utang` menerima 200 kg seharga
Rp 100.000, biaya rata-ratanya naik menjadi Rp 98.750 — dan `manufaktur-bom`
memakai angka itu, bukan angka lama. Pendapatan PT Berkah Jaya
Rp 4.820.000.000 sama di `laporan-tersusun` dan `konsolidasi-entitas`.

Ini bukan kerapian. Pengunjung yang membandingkan dua peragaan adalah
pengunjung yang paling serius menilai produknya, dan dialah yang paling mungkin
menemukan angka yang tidak cocok.

Empat naskah memuat jurnal, dan keempatnya diuji seimbang oleh mesin:
`jurnal-pembalik` (dua jurnal, masing-masing 12.000.000), `pembelian-utang`
(22.200.000), `aset-penyusutan` (5.000.000), `manufaktur-bom` (13.075.000).

## `gambar?: string` → `peragaan?: PeragaanId`

Sifat **opsionalnya sengaja dipertahankan**, dan alasan Fase 24c masih berlaku
kata per kata: modul yang belum punya peragaannya sendiri lebih baik tampil
tanpa peragaan daripada meminjam milik modul lain. Yang berubah tipenya —
`string` membuat salah ketik nama berkas lolos typecheck, lint, dan uji
sekaligus, lalu muncul sebagai gambar rusak di halaman jualan.

## Enam gambar beranda dihapus

`public/landing/` (592 KB, 6 berkas) kini **nol rujukan** dari seluruh repo,
diverifikasi satu per satu. Ia dihapus di sub-fase ini, bukan ditunda ke 38f:
bobot mati sebaiknya dibuang begitu ia mati.

`public/panduan/` (3,3 MB) masih dirujuk konten panduan; menyusul di 38f.

## Temuan ukuran: potongan `/fitur` justru MENGECIL

| | Sebelum | Sesudah |
| --- | --- | --- |
| `dist/assets/fitur-*.js` | 35,52 kB (gzip 13,89) | **34,22 kB** (gzip 13,62) |

Dua puluh dua peragaan data-driven lebih kecil daripada kode yang
digantikannya, dan ia menghapus 22 permintaan gambar sekaligus. Hipotesis "JS
lebih ringan daripada gambar" yang dinyatakan di 38a **terbukti untuk halaman
ini**; pengukuran menyeluruh menyusul di 38f dan 38g.

Catatan sekaligus koreksi atas asumsi 38a: angka precache PWA **tidak bisa**
dipakai mengukur penghapusan gambar. `globPatterns` di `vite.config.ts` hanya
menyapu `js,css,html,svg,png,webmanifest,wasm` — `.webp` tidak pernah masuk
precache sejak awal. Yang memang mendominasi precache adalah **2,7 MB PNG
merek**, dan itu pekerjaan 38g.

## Neraca asersi ui-sim

**4 ditambah · 0 diperbarui · 0 dihapus.**

| Asersi | Yang dijaganya |
| --- | --- |
| F49a `/fitur` memuat peragaan tiap modul | halaman tidak kehilangan buktinya diam-diam |
| F49a `/fitur` nol berkas gambar produk | tangkapan layar tidak menyelinap kembali satu per satu |
| F49c `/fitur` tidak menjalankan lebih dari dua peragaan | **antrean dua slot terbukti bekerja di peramban nyata dengan 22 peragaan** |
| F49b narasi terbaca tanpa menunggu animasi | perayap dan pembaca layar mendapat isinya |

Yang ketiga paling berharga. Sampai fase ini, batas antrean hanya diuji sebagai
fungsi; kini ia diuji sebagai perilaku yang bisa diamati pada halaman yang
memang paling mungkin melanggarnya.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 681 | ✅ **834** (+153) |
| `pnpm smoke` | 1.152 | ✅ 1.152 |
| `node scripts/ui-sim.mjs` | 378 | ✅ **382** (+4) |
| `sapu-warna` | 70 / 288 | ✅ 70 / 288 |
| `sapu-istilah` | 0 | ✅ 0 |
| `sapu-gaya` | 0/9/0/0, 2.398 entri | ✅ 0/9/0/0, **2.714 entri** |
| `apps/web/public` | 7,1 MB | ✅ **6,5 MB** |
