# Fase 27a — audit halaman depan

Pemilik meminta halaman depan ditinjau menyeluruh: teks yang kurang informatif,
tata letak, ikon. Dugaannya benar di hampir semua titik — tetapi temuan
terpentingnya bukan salah satu dari ketiganya.

## Temuan utama: janji masa coba masih tayang di tempat yang paling menentukan

Kerangka `apps/web/index.html` masih menjanjikan masa coba gratis di **tiga**
tempat:

| Baris | Tag | Siapa yang membacanya |
| --- | --- | --- |
| 16 | `<meta name="description">` | **Cuplikan hasil pencarian Google** |
| 27 | `og:description` | **Pratinjau saat tautan dibagikan di WhatsApp** |
| 38 | `twitter:description` | Pratinjau di X/Twitter |

Masa coba dihapus **Fase 24a**. **Fase 24d** menyapu janjinya dari halaman dan
blog, lalu memasang penjaga smoke — tetapi penjaga itu hanya membaca HTML
`/blog`. Kerangka SPA tidak pernah ikut diperiksa, jadi janji yang sudah tidak
berlaku bertahan **di teks yang dibaca orang sebelum mereka mengeklik apa pun**.

Ini kelas cacat yang sama persis dengan Fase 24d, di lapisan yang terlewat.
Pelajarannya bukan "kurang teliti", melainkan: penjaga yang hanya melihat satu
lapisan rendering akan melewatkan lapisan lain, dan lapisan yang terlewat
kebetulan yang paling dekat dengan calon pelanggan.

Penggantinya menyebut yang benar-benar ada dan justru lebih kuat: demo berisi 6
bulan data yang bisa ditelusuri tanpa mendaftar.

## Temuan konversi

1. **Hero tidak punya tombol utama.** `DemoButton` dan "Daftar & Berlangganan"
   dua-duanya `variant="secondary"` — dua kotak putih identik. Fase 24 memutuskan
   demo menjadi ajakan utama; keputusan itu tidak pernah terlihat di layar.
2. **Pita CTA menjanjikan A, tombolnya melakukan B.** Kalimatnya "telusuri demo
   tanpa mendaftar", tombolnya "Mulai Sekarang" → `/daftar`.
3. **CTA lengket mobile tanpa jalan ke demo** — isinya "Daftar & Berlangganan" +
   "Hubungi" (ke formulir). Di layar kecil, ajakan utama tidak terjangkau sama
   sekali, dan "Hubungi" tidak memberi tahu apa yang akan terjadi.
4. **Pilihan paket hangus.** Ketiga tombol "Pilih Paket Ini" menuju `/daftar`
   polos; pengunjung yang memilih Enterprise memilih ulang nanti.

## Temuan ikon

5. **Lima kartu keamanan memakai ikon yang sama persis** — `ShieldCheck`
   di-hardcode lima kali. Tidak satu pun ikonnya menjelaskan butirnya.
6. **Badge integrasi tanpa ikon sama sekali** — enam pil teks polos.
7. **Bilah kepercayaan tanpa ikon**, dan **3 dari 4 "angka"-nya bukan angka**
   tetapi bergaya angka mono-tabular.
8. **FAQ memakai karakter `+`**, satu-satunya tempat di halaman yang tidak
   memakai lucide.

## Temuan teks

9. **Merek ditulis campur dalam satu halaman**: "Dengan erpindo" (header tabel)
   vs "ERPindo" (tabel kategori, kalkulator) vs "erpindo adalah PWA" (FAQ).
   Diseragamkan menjadi **ERPindo** (keputusan pemilik) — dipakai juga oleh
   judul dokumen, meta tag, dan JSON-LD.
10. **Kalkulator berdebat melawan dirinya sendiri**: di bawah titik impas ia
    menampilkan "Hemat sekitar **Rp 0**". Sekarang menyebut mulai berapa pengguna
    ERPindo lebih murah — dihitung dari fungsi biaya yang sama, bukan angka yang
    ditulis tangan lalu basi saat harga bergeser.
11. **Klaim "1.300+ uji otomatis" tertinggal jauh** — hitungan hari ini 2.005.
    Diperbarui menjadi "2.000+", tetap dibulatkan ke bawah.
12. **`id="fitur"` mati** — navigasi menunjuk halaman `/fitur`; jangkar dibersihkan.

## Penjaga yang ditambahkan — dan satu yang harus diperbaiki lebih dulu

Cek janji trial dipasang di lapisan yang **benar-benar gagal**: HTML yang
dilayani server, bukan komponen React.

Versi pertamanya meniru regex Fase 24d (`/Coba Gratis/i`) dan **langsung merah**
— bukan karena ada janji, melainkan karena blok SEO memuat pertanyaan *"Apakah
ada masa coba gratis?"* yang jawabannya justru *"Tidak ada masa coba, dan itu
disengaja."* Penjaganya yang diperbaiki, bukan kalimatnya: polanya kini menyasar
janji (`gratis 30 hari`), ditambah cek kebalikannya — blok SEO **harus** tetap
menyangkal masa coba secara eksplisit. Penjaga yang menandai kalimat yang
menyangkal masa coba adalah penjaga yang akan dimatikan orang berikutnya.

Komentar penjelas di `index.html` juga sengaja **tidak** mengutip frasa lamanya:
penjaga memindai seluruh berkas, termasuk komentar — jebakan yang sama pernah
kena di Fase 25b lewat kata `[probe]` di badan pesan commit.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` · `pnpm lint` · `pnpm build` | 0 | — |
| `pnpm test` | 0 | **561** (dari 555) |
| `pnpm smoke` | 0 | **1.118** (dari 1.113) |
| `node scripts/ui-sim.mjs` | 0 | **343/343** (dari 337) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

**Dibuktikan bisa gagal** — tiga sabotase, seluruhnya dipulihkan:

| Penjaga dilumpuhkan | Cek yang merah |
| --- | --- |
| Satu meta tag dikembalikan ke janji masa coba | 2 cek smoke: kerangka SPA + deskripsi pencarian |
| `DemoButton` dikembalikan `secondary` (keadaan sebelum fase ini) | 2 cek ui-sim: **"0 tombol utama"** di hero |
| Dua butir keamanan diberi ikon yang sama | uji unit: `expected 4 to be 5` |

Sabotase kedua mengembalikan kode ke keadaan **sebelum** fase ini, jadi "0 tombol
utama" itu bukan simulasi — itu keadaan halaman depan sampai hari ini.

## Yang TIDAK dikerjakan

- **Urutan seksi tidak diubah** (pilihan pemilik). Catatan yang tetap disimpan:
  badge integrasi berada di posisi ketiga dari atas — mahal untuk pita selemah itu.
- **Judul & pengantar seksi tidak ditulis ulang** — hanya teks yang terbukti
  keliru atau tidak konsisten yang disentuh.
- **Formulir "Jadwalkan demo" tidak didesain ulang.** Ia hanya memakai
  `placeholder` tanpa label terlihat, sehingga labelnya hilang begitu pengguna
  mengetik. `aria-label` sudah ada, jadi pembaca layar aman — tetapi ini tetap
  utang kegunaan yang dinyatakan, bukan disembunyikan.
- **Tidak ada testimoni atau logo pelanggan ditambahkan.** Halaman ini memakai
  bukti faktual, dan mengarang bukti sosial adalah garis yang tidak dilewati.
