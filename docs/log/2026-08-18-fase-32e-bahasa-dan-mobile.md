# Fase 32e — bahasa landing ditulis ulang & cacat mobile diperbaiki

Pemilik menilai teks landing **tidak natural, membingungkan, dan sulit
dipahami**, sebagian terbaca seperti **jualan jasa**, serta tata letak beberapa
seksi **berantakan di mobile**.

Ketiganya benar. Dua di antaranya cacat yang **saya sendiri buat** di fase-fase
sebelumnya.

## 1. Bahasa: tiga pola yang membuatnya sulit

### Angka untuk programmer, dipajang ke pembeli

Bilah bukti teratas berbunyi **"2.000+ — uji otomatis dijalankan tiap kali kode
berubah"**. Itu metrik pengembang. Pemilik toko tidak membeli jumlah uji
otomatis, dan justru kalimat semacam itu yang membuat halaman terbaca seperti
agensi menjual keahlian ngoding — persis "jualan jasa" yang dikeluhkan.

Diganti empat hal yang benar-benar ditanyakan calon pembeli: harganya berapa,
cocok dengan pajak Indonesia atau tidak, kalau internet mati bagaimana, dan
datanya milik siapa.

### Istilah akuntan di halaman untuk pemilik toko

| Sebelum | Sesudah |
| --- | --- |
| "jurnal double-entry … neracanya dijamin seimbang" | "Stok langsung berkurang, laporan keuangan terisi, dan pajaknya ikut terhitung" |
| "1 database / perusahaan" | "Data tiap perusahaan disimpan terpisah" |
| "Seluruh lalu lintas lewat HTTPS, kredensial sensitif tersimpan terenkripsi…" | "Selain password, akun bisa dikunci dengan kode dari HP Anda" |
| "HPP rata-rata otomatis, opname & FEFO tercatat" | "Modal barang terhitung otomatis. Barang mendekati kedaluwarsa keluar lebih dulu." |

Istilah yang **dipertahankan**: PPN, PPh 21, BPJS, Coretax, e-Faktur, stok,
kasir. Itu kata yang memang dipakai pemilik usaha Indonesia sehari-hari;
menghindarinya justru membuat halaman terasa mengambang.

### Kalimat telegram dan tanda hubung berlebih

"Sekali input — jurnal, stok & piutang otomatis" bukan kalimat. Setiap butir
kini kalimat utuh dengan titik, dan `—` dipakai seperlunya saja.

## 2. Cacat mobile — dan dua di antaranya saya yang sebabkan

Diperiksa dengan memotret halaman di 390px per layar, bukan dengan menebak.
Halaman utuh 8.223px (±10 layar).

**(a) Bilah bukti tampil sebagai teks mono raksasa.** `TRUST_POINTS` dirender
dengan utilitas `num` — mono + lebar digit tetap. Utilitas itu ada untuk
**angka**, dan dulu isinya memang angka ("2.000+"). Begitu saya menggantinya
menjadi kalimat pendek di fase ini, mono berukuran `2xl` memecah "The till keeps
working" jadi **tiga baris**. Diganti serif berukuran `lg`.

Cacat ini lahir dari perubahan saya sendiri, dalam sesi yang sama — dan hanya
terlihat karena halamannya dipotret.

**(b) Rongga kosong ±450px antar-seksi.** `py-28 sm:py-36` yang saya pasang di
Fase 32c untuk melapangkan desktop **tidak diberi batas bawah**, jadi ia berlaku
penuh di 390px. Hasilnya bukan lapang melainkan berlubang. Kini
`py-16 sm:py-24 lg:py-32` — lapang naik bertahap mengikuti lebar layar.

**(c) Kolom penjual tabel perbandingan berada di luar layar.** Tabelnya
`min-w-[640px]` di dalam wadah bergulir. Halaman tidak pecah — ui-sim F26 memang
menjaga itu, dan ia hijau — tetapi **kolom "Dengan ERPindo", satu-satunya kolom
yang menjual, tidak terlihat** sampai pengunjung tahu harus menggeser tabel ke
samping. Kebanyakan tidak tahu.

Kini tiap baris menumpuk jadi kartu di bawah `md`, memakai teknik yang sama
dengan `<Table>` di `components/ui.tsx` (Fase 18d): pekerjaannya jadi judul,
keluhan manualnya di atas, jawabannya disorot di bawah.

## Yang tidak diubah, dan alasannya

**Tinggi halaman tetap ±8.200px di mobile.** Meringkasnya lagi berarti membuang
seksi, dan seksi yang tersisa (hero, bukti, showcase, perbandingan, harga,
keamanan, FAQ, CTA) masing-masing menjawab satu pertanyaan pembeli. Memotongnya
lebih jauh menghilangkan jawaban, bukan kebisingan.

**Tangkapan layar produk di hero tetap ada meski kecil di 390px.** Detailnya
memang tak terbaca, tetapi ia tetap menyampaikan "ini produk sungguhan, bukan
janji". Menyembunyikannya di mobile menghapus bukti itu dari separuh pengunjung.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 611 | ✅ 611 |
| `pnpm smoke` | 1.132 | ✅ 1.132 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 85 / 327 | ✅ **83 / 325** |
| `sapu-i18n` | 147 · 0 | ✅ 147 · 0 |

Gulir mendatar di 390px: **tidak ada** (diperiksa langsung, bukan hanya lewat
asersi).

## Catatan untuk fase berikutnya

Gambar produk di landing & panduan **belum diregenerasi** setelah perubahan ini.
Yang berubah hanya halaman publik, sedangkan gambar memotret **layar aplikasi** —
jadi keduanya tidak terpengaruh. Regenerasi baru diperlukan bila tampilan di
dalam aplikasi yang berubah.
