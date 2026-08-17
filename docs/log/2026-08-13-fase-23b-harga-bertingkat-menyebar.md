# Fase 23b — Harga bertingkat menyebar ke kasir, pesanan, penawaran & kontrak

Fase 23a menerapkan harga grup **hanya di faktur penjualan**. Empat layar
penjualan lain masih mengambil `products.sell_price` mentah, sehingga pelanggan
grosir yang sama mendapat harga grosir di faktur tetapi harga ecer begitu
transaksinya lewat kasir atau dimulai dari penawaran. Setengah jadi seperti itu
lebih buruk daripada tidak punya fiturnya: angkanya berbeda tanpa alasan yang
terlihat.

Tidak ada endpoint API baru — `resolve` dan `/items` dari 23a sudah cukup.

## Langkah 0: ekstrak dulu, salin nanti

Logika 23a tinggal inline di `commerce.tsx`. Menyalinnya ke empat layar berarti
lima salinan aturan yang sama. Diekstrak lebih dulu ke
`apps/web/src/lib/hargaGrup.ts` (`useGrupHarga` + `hargaBaris`), dan
`commerce.tsx` ikut dipindah ke sana — **tanpa perubahan perilaku**, dibuktikan
`F45a`–`F45c` tetap hijau sebelum satu layar baru pun disentuh.

Hook itu **tidak memuat satu pun aturan harga**; semuanya tetap di
`hargaUntukGrup()` yang diuji unit. Yang diurus hook hanya pengambilan datanya.

## Kasir: temuan yang menghapus separuh risikonya

**POS tidak mengizinkan mengubah harga satuan** — hanya qty dan diskon. Jadi
masalah "harga nego tertimpa", bagian tersulit di 23a, **tidak ada di sana**, dan
mengganti grup boleh menghitung ulang seluruh keranjang. Alasannya ditulis di
kode: kalau suatu hari POS bisa menyunting harga, aturan itu wajib ikut berubah.

Tiga keputusan lain:

- **Bawaan tanpa grup.** Kasir yang lupa menurunkan mode grosir menjual sehari
  penuh di bawah harga; bawaan harus keadaan yang paling tidak merugikan.
- **Reset tiap transaksi selesai**, bukan bertahan sepanjang shift —
  `posSaleSchema` tidak menyimpan grup, jadi kesalahan tak meninggalkan jejak.
- **Transaksi ditahan dipanggil lagi TIDAK dihitung ulang.** Itu harga yang
  sudah disebutkan ke pelanggan (penalaran sama dengan "Ubah faktur", 10c).

Kartu produk juga ikut menampilkan harga grup. Sebelumnya kartunya menyebut
Rp 85.000 sementara mengkliknya memasukkan Rp 90.000 — dua angka berbeda di satu
layar, kelas cacat yang sama dengan Fase 22f.

## Tiga layar sisanya

Pola sama dengan `commerce.tsx`. Catatan per layar:

- **Pesanan Penjualan** — prefill lama memakai `l.unitPrice || …`; syarat
  "string kosong" itu **tidak cukup** sebagai penjaga harga nego. Diganti
  `hargaDisentuh`.
- **Penawaran** — konversi ke faktur tetap memakai harga penawaran.
- **Kontrak** — `hint` dropdown ikut harga grup; faktur berulang tetap memakai
  harga tersimpan di kontrak.

## Dua bug yang ditemukan sambil jalan

**1. `data-testid` pada `<Badge>` dibuang diam-diam.** Komponen itu hanya
menerima `tone` dan `children`, jadi empat `data-testid` yang saya tulis tidak
pernah ada di DOM dan ceknya mati karena timeout. Kelas cacat yang sama persis
dengan Fase 17b (96 dari 98 penimpaan tinggi tombol yang tak berpengaruh).
Dipindah ke elemen pembungkus.

**2. Hook mengaku memakai grup meski pengambilan harganya gagal.** `muat()` dan
`muatGrup()` memasang `nama` dari argumen sementara `harga` kosong, sehingga
layar menampilkan "Harga Grosir" sambil memakai harga dasar — berbohong tentang
angka yang sedang ditawarkan, dan tak terlihat oleh siapa pun. Kini kegagalan
mengembalikan keadaan kosong seluruhnya.

## Catatan kejujuran — cek Fase 23a lulus atas produk yang salah

Ini temuan terpenting fase ini, dan ia mengoreksi klaim fase sebelumnya.

`F45` mengisi pencarian produk dengan kata **"Kopi"** lalu mengklik hasil
pertama. Data demo punya **dua** produk yang cocok: `KOPI-250 Kopi Arabika Gayo
250g` dan `MSN-SANGRAI Mesin Sangrai Kopi 3kg`. Keduanya di-seed dalam detik
yang sama, sehingga urutan `created_at DESC` **seri** dan pemenangnya
berubah-ubah antar-jalan.

Akibatnya harga khusus 90.000 kadang tersimpan pada Mesin Sangrai (harga dasar
Rp 18.500.000), dan `F45b` tetap hijau karena ia hanya membandingkan angka
90.000 — bukan produk mana yang dihargai. **Cek itu lulus, tetapi bukan atas
hal yang namanya klaim.** Ia baru ketahuan di sini karena `F46a` memeriksa
produk yang disebut namanya secara spesifik (`pos-harga-KOPI-250`) dan merah
berselang-seling.

Diperbaiki dengan mencari lewat **SKU**, bukan kata umum. Sesudahnya ui-sim
dijalankan **empat kali berturut-turut** dengan hasil 336/336 identik.

Pelajarannya melengkapi 22f: di sana sabotase yang salah sasaran memberi rasa
aman palsu; di sini **cek yang benar-benar hijau pun bisa memberi rasa aman
palsu bila sasarannya ambigu.**

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **450** (tetap) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1075** (dari 1071) |
| `node scripts/ui-sim.mjs` | 0 | **336/336** (dari 329) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Uji unit sengaja tidak bertambah: aturannya tidak berubah, hanya penyebarannya.
Bertambahnya uji unit justru akan menjadi tanda ada aturan yang tersalin ke layar.

**Utang teks layar 142 → 146**, dan itu **bukan** teks yang lupa diterjemahkan:
keempatnya potongan kode (`hargaBaris(grupHarga.harga,` dsb.) yang salah dibaca
alat penyapu — kelas positif-palsu yang sama dengan 138 entri sebelumnya.
Halaman baru `grupHarga.tsx` sendiri dilaporkan **BERSIH (LAYAR=0)**. Dinyatakan
di sini karena angkanya naik, dan angka yang naik tanpa penjelasan adalah persis
yang membuat orang berhenti membaca laporan gerbang.

**Dibuktikan bisa gagal**, semuanya dikembalikan — dan tiap sabotase mengenai
bentuk cacat aslinya, bukan sekadar mengubah angka:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| faktur berulang kontrak mencari harga dari `price_group_items` (bukan harga tersimpan) | smoke `11n6` (`→ [400000,950000]` — tagihan kedua ikut naik) |
| `setGrupId("")` dihapus dari `onSuccess` penjualan POS | ui-sim `F46e` (`→ c4f594c2-…`, grup masih terpilih) |
| panggil-ulang transaksi ditahan ikut menghitung ulang harga | ui-sim `F46d` |

## Yang TIDAK dikerjakan

- **Harga tetap disarankan, bukan ditegakkan**; tidak ada jejak audit saat harga
  ditimpa. Keduanya keputusan pemilik di 23a, tidak berubah.
- **API publik & impor marketplace** tidak diberi harga grup — keduanya menerima
  harga dari sistem lain dan harus memakainya apa adanya.
- **Kasir masih memakai kontak tetap "Pelanggan Umum".** Yang dipilih di sana
  grup, bukan pelanggan; siapa pembelinya tetap tidak tercatat per transaksi.
- **Grup yang dipilih di kasir tidak ikut tersimpan di transaksinya.** Karena
  itu tidak ada laporan "berapa omzet pada harga grosir" — butuh kolom baru di
  `pos_sales`, di luar lingkup fase ini.
