# Fase 38b — beranda berhenti memotret, mulai memperagakan

## Yang dikerjakan

Enam gambar produk di halaman depan dihapus dari pemakaian dan diganti lima
peragaan beranimasi. Kerangkanya dibangun di 38a; sub-fase ini mengisinya dan
memasangnya.

### Lima naskah baru

| Naskah | Jalur | Yang dibuktikannya |
| --- | --- | --- |
| `faktur-berantai` | `/app/penjualan` | Satu faktur diposting → jurnal, stok, laba rugi, PPN terisi |
| `kasir-shift` | `/app/pos` | Penjualan tunai → jurnal kas, harga pokok, selisih kas shift |
| `laporan-tersusun` | `/app/keuangan/laba-rugi` | Laba rugi bisa ditelusuri turun sampai jurnal pembentuknya |
| `gaji-sekali-jalan` | `/app/hr/penggajian` | PPh 21 TER + BPJS terhitung, jurnal gaji ikut terbentuk |
| `stok-tepercaya` | `/app/stok` | Tiga gudang, biaya rata-rata, peringatan sebelum kejadian |

`faktur-berantai` adalah pemindahan langsung peragaan hero Fase 35a. Ia
dipindah lebih dulu justru karena SUDAH benar: mesin baru yang memainkannya
sama persis adalah mesin yang terbukti terhadap teladan yang sudah dinilai
bekerja. `pages/landing/pertunjukan.tsx` (242 baris) dan `pertunjukanTeks.ts`
(59 baris) dihapus setelahnya.

### Angkanya cocok lintas naskah, dan itu disengaja

Harga satuan Kopi Arabika (Rp 150.000) dan biaya rata-ratanya (Rp 90.000) sama
di `faktur-berantai`, `kasir-shift`, dan `stok-tepercaya`. Pengunjung yang
membandingkan ketiganya akan mendapati angkanya cocok; yang tidak
membandingkan tidak dirugikan apa pun. Tiap jurnal diuji seimbang oleh mesin:

| Naskah | Debit | Kredit |
| --- | --- | --- |
| `faktur-berantai` | 2.565.000 | 2.565.000 |
| `kasir-shift` | 513.000 | 513.000 |
| `gaji-sekali-jalan` | 50.000.000 | 50.000.000 |

### `image: string` → `peragaan: PeragaanId`

`ShowcaseItem.image` bertipe `string`, sehingga salah ketik nama berkas lolos
typecheck, lolos lint, lolos uji, dan baru terlihat sebagai gambar rusak di
halaman jualan. `PeragaanId` menutup kelas itu — peragaan tak terdaftar adalah
galat kompilasi.

Akibatnya `landing-ikon.test.ts` ikut menguat. Asersi lamanya mencocokkan
BENTUK jalur (`/^\/landing\/.+\.webp$/`) dan karena itu hanya bisa menangkap
jalur yang bentuknya salah, bukan berkas yang tidak ada. Penggantinya memeriksa
keanggotaan registri, plus satu asersi baru: lima butir showcase wajib memakai
peragaan yang BERBEDA — alasan yang sama dengan lima perisai identik yang
ditemukan di seksi keamanan pada Fase 27a.

### Dua naskah yang menjadi tidak benar, dan diperbaiki

Judul seksi Showcase berbunyi "Ini tampilan aslinya. Bukan gambar rekaan.",
sublinenya "difoto langsung dari aplikasinya". Keduanya benar selama isinya
tangkapan layar, dan langsung menjadi tidak benar begitu diganti peragaan.

Yang menggantikannya bukan klaim yang lebih lunak melainkan yang lebih kuat,
dan kali ini bisa diperiksa pembacanya sendiri di layar yang sama:
**"Jangan percaya. Periksa angkanya."**

## Koreksi: satu jebakan yang sudah tercatat di repo ini, dan terulang

Asersi F22 gagal pada percobaan pertama dengan `peragaan=false`, padahal
seluruh teksnya benar. Sebabnya `uppercase` pada judul panel: `text-transform`
ikut mengubah nilai `innerText`, sehingga "Faktur penjualan baru" terbaca
"FAKTUR PENJUALAN BARU" oleh asersi.

Pelajaran ini sudah tertulis di `components/ui.tsx` untuk `Thead` sejak Fase
18b — dan terulang persis di sini. Ia kini dicatat sebagai aturan keempat di
kepala `peragaan/panel.tsx`, karena ternyata memang layak ditulis dua kali.

## Neraca asersi ui-sim

**4 ditambah · 1 diperbarui · 0 dihapus.**

| Asersi | Perubahan |
| --- | --- |
| F49a beranda memuat peragaan | baru |
| F49a beranda tidak memuat berkas gambar produk | baru |
| F49e peragaan tanpa elemen yang bisa difokus | baru |
| F49b narasi terbaca tanpa menunggu animasi | baru |
| F15 landing 100% dwibahasa | penanda diperbarui: "Not a mockup" → "Do not take our word for it" |

Subjek F15 tidak berubah — seksi Showcase tetap yang diuji; hanya kalimat yang
dicarinya berganti, mengikuti naskah yang memang harus berganti.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | hijau | ✅ hijau |
| `pnpm test` | 644 | ✅ **681** (+37) |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 362 | ✅ **366** (+4) |
| `sapu-warna` | 83 / 320 | ✅ 83 / 320 |
| `sapu-istilah` | 0 | ✅ 0 |
| `sapu-gaya` | 0 / 9 / 0 | ✅ 0 / 9 / 0 |

## Yang belum dikerjakan

Berkas `public/landing/*.webp` **belum dihapus** — `fiturDetail.ts` masih
merujuk sebagiannya untuk halaman `/fitur`. Penghapusannya menunggu 38e dan
38f, sesuai urutan yang sudah ditetapkan: gambar hanya dihapus setelah seluruh
permukaan yang memakainya berpindah ke peragaan.
