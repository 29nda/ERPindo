# Fase 38j — lima halaman berhenti membuka dengan formulir kosong

## Yang dikerjakan

Lima halaman modul dikonversi ke pola `Halaman` + `Lembar` yang dibangun di 38h:

| Halaman | Formulir yang dipindah |
| --- | --- |
| `helpdesk.tsx` (pilot, 38h) | Tiket baru |
| `projects.tsx` | Proyek baru |
| `salesorders.tsx` | Pesanan baru |
| `grupHarga.tsx` | Grup harga baru |
| `crm.tsx` (Pipeline) | Lead baru |

Sebelumnya kelimanya membuka dengan formulir pembuatan yang selalu terpasang di
atas daftar. Kini halaman membuka dengan **datanya** — papan kanban di CRM,
daftar pesanan di Pesanan Penjualan — dan pembuatan dibuka dari aksi utama di
pojok kanan atas, tempat yang sama di setiap halaman.

## Kenapa lima, bukan dua puluh lima sekaligus

Tiap konversi menyentuh struktur JSX halaman yang berbeda, dan tiap satunya
bisa memecahkan asersi ui-sim dengan caranya sendiri. Mengerjakan lima lalu
memvalidasi memberi tahu **asersi mana** yang pecah karena **halaman mana**;
mengerjakan dua puluh lima lalu memvalidasi hanya memberi tahu bahwa sesuatu
pecah.

Ini terbukti berguna langsung: satu asersi pecah, dan sebabnya tidak terduga.

## Asersi yang pecah, dan kenapa penandanya diganti

**F0t** menguji halaman Proyek ikut berbahasa Inggris, dengan penanda
`"Create project"`. Tombol itu adalah tombol kirim di dalam formulir pembuatan —
yang kini berada di dalam Lembar dan **belum terpasang** sampai lembarnya
dibuka.

Yang tampil di halaman sekarang adalah aksi utamanya: `"New project"`.

Subjek asersi tidak berubah — ia tetap menguji bahwa halaman Proyek ikut ke
Inggris. Yang berubah adalah tombol mana yang ada di halaman, dan itu memang
akibat langsung dari keputusan sub-fase ini. Penandanya diganti beserta
alasannya, bukan dilonggarkan menjadi pencocokan sebagian.

Dua asersi lain (`#lead-name`, `#gh-nama`) diperbarui memakai `bukaLembar()` —
penolong yang dibangun 38h justru untuk ini.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 916 | ✅ 916 |
| `pnpm smoke` | 1.157 | ✅ 1.157 |
| `node scripts/ui-sim.mjs` | 392 | ✅ 392 |
| `sapu-warna` | 0 / 0 | ✅ 0 / 0 |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |

## Neraca asersi ui-sim

**0 ditambah · 3 diperbarui · 0 dihapus.**

Tidak ada asersi baru: F52 di 38h sudah menguji polanya, dan pola itu yang
direplikasi di sini. Menambah lima asersi yang menguji hal yang sama di lima
halaman berbeda akan menaikkan angka tanpa menaikkan jaminan.

## Yang belum dikerjakan

Tujuh formulir sejenis masih berada di atas daftar: `finance.tsx` (dua —
tambah akun dan jurnal manual), `commerce.tsx`, `masterdata.tsx` (dua — produk
dan kontak), `catat.tsx`, `payroll.tsx`, `approvals.tsx`, dan
`crm.tsx` (Penawaran). Polanya sudah terbukti; sisanya pekerjaan yang sama
diulang.
