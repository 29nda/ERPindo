# Fase 38s — Lembar yang meluber, ditemukan gambar dan dijaga gerbang

## Yang dikerjakan

### 1. Cacat yang ditemukan tangkapan layar, bukan gerbang

Pemilik meminta melihat hasil perombakan. Empat puluh empat tangkapan layar
diambil dari aplikasi yang benar-benar berjalan — Worker lokal, D1 lokal berisi
data setahun penuh, Chromium sungguhan — dalam varian terang, gelap, dan ponsel.

Gambar halaman Produk dengan Lembar terbuka memperlihatkan formulir yang rusak:
medan **Nama** tergencet menjadi selebar satu huruf, tombol simpan terpotong di
tepi kanan, dan keterangan satuan besar terpangkas separuh.

Penyebabnya satu baris:

```
sm:grid-cols-[8rem_1fr_5rem_9rem_9rem_8rem_auto]
```

Kisi itu benar sewaktu formulir masih berbaris mendatar di atas daftar dan punya
lebar halaman penuh. Fase 38h memindahkannya ke dalam `<Lembar>` yang hanya
selebar `max-w-3xl`, dan kisinya ikut pindah apa adanya. Lebarnya ±46rem di
dalam wadah ±42rem — meluber 79 piksel.

**Seluruh gerbang hijau saat itu, dan itulah bagian yang perlu dicatat.** Asersi
yang ada menguji medan **bisa diisi**, dan medan selebar satu huruf tetap bisa
diisi. Tidak ada satu pun yang menguji medan **bisa dibaca**. Kelas kegagalan
yang sama dengan perombakan 17a dan 18a: yang tidak diukur tidak akan ketahuan.

### 2. Penjaga dipasang di dalam `bukaLembar()`, bukan sebagai asersi terpisah

`lembarTidakMeluber()` menyusuri seluruh keturunan `[data-lembar]` dan menolak
elemen yang `scrollWidth`-nya melampaui `clientWidth` lebih dari 2 piksel —
kecuali elemen yang memang ber-`overflow-x: auto/scroll`, karena tabel lebar dan
sumur kode memang disengaja menggulir.

Ia dipanggil dari dalam `bukaLembar()` sendiri. Artinya dua puluh lima pemanggil
yang sudah ada ikut terjaga tanpa disunting satu per satu, dan setiap Lembar
yang ditulis nanti terjaga tanpa siapa pun perlu ingat menambahkannya. Kisi
lebar berikutnya akan menabrak gerbang pada hari ia ditulis.

**Penjaganya dibuktikan bisa gagal.** Kisi lama dipasang kembali sementara, dan
ui-sim menolaknya di dua tempat sekaligus:

```
✗ Lembar "Add product" tidak menggulir ke samping   div.space-y-4 lebih 77px
✗ Lembar "Tambah produk" tidak menggulir ke samping div.space-y-4 lebih 79px
```

Asersi yang tidak pernah dilihat gagal adalah asersi yang belum diketahui
berguna.

### 3. Tiga formulir yang diperbaiki

| Berkas | Sebelum | Sesudah |
| --- | --- | --- |
| `masterdata.tsx` — Produk | kisi 7 trek tetap | `sm:grid-cols-2`, aksi utama pindah ke dasar formulir |
| `masterdata.tsx` — Kontak | kisi 5 trek tetap | `sm:grid-cols-2`, urutan medan disusun ulang untuk baca tegak |
| `finance.tsx` — baris jurnal | trek `1fr` menolak menyusut | `[&>*]:min-w-0` |

Baris jurnal berbeda sebabnya, dan sebabnya halus: butir kisi berlaku
`min-width: auto`, dan lebar auto sebuah `<select>` adalah selebar **opsi
terpanjangnya** — di sini nama akun beserta kodenya. Trek `1fr` yang seharusnya
menyusut justru menolak menyusut. Memperkecil angka treknya tidak akan menolong;
yang perlu adalah mengizinkan butirnya menyusut.

Pada Produk dan Kontak, tombol simpan juga dipindah ke dasar formulir. Di
formulir mendatar ia jatuh di kolom terakhir, yang wajar; di dalam lembar yang
menggulir tegak, kolom terakhir itu berada di **tengah** daftar medan.

### 4. `scripts/audit-routes.mjs` dilengkapi

Berkas itu menyebut dirinya sumber tunggal rute — "rute baru cukup ditambah di
sini" — tetapi tujuh rute publik tidak pernah masuk: `/fitur` sejak Fase 18f,
dan enam halaman baru Fase 38d. Komentar kepalanya juga masih merujuk
`screenshots.mjs` yang dihapus di Fase 38f. Keduanya diperbaiki. 45 → 52 rute.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm test` | 917 | 917 |
| `pnpm smoke` | 1.157 | 1.157 |
| `node scripts/ui-sim.mjs` | 392 | **417** |
| `sapu-warna` | 0 / 0 | 0 / 0 |
| `sapu-istilah` | 0 | 0 |
| `sapu-gaya` | 0 / 9 / 0 / 0 / 0 | 0 / 9 / 0 / 0 / 0 |
| `sapu-i18n` | 146 | 146 |
| `periksa-tautan-dokumen` | 77 tautan / 54 berkas | 77 / 54 |

`pnpm typecheck`, `pnpm build`, dan `pnpm lint` bersih.

Neraca asersi ui-sim: **dipindah 0 · ditambah 25 · dihapus 0.** Dua puluh lima
adalah jumlah pemanggil `bukaLembar()`; tidak ada satu pun yang perlu disunting.

## Catatan kejujuran

Skrip penangkap gambar sengaja **tidak** dicommit. `screenshots.mjs` dihapus di
Fase 38f justru karena ia menulis aset produk ke `public/` yang ikut ter-deploy.
Skrip ini tujuannya berbeda — gambar untuk dilihat sekali, bukan aset yang
dikirim ke pengguna — dan menaruhnya di repo akan menghidupkan kembali hal yang
baru saja dibuang.

Tetapi itu berarti kemampuan menangkap gambar tidak tersimpan di repo, dan
tinjauan visual berikutnya akan mulai dari nol lagi. Itu pertukaran yang
disengaja, bukan kelalaian: yang tersimpan adalah **penjaganya**, dan penjaga
lebih berguna daripada skrip yang harus dijalankan orang.
