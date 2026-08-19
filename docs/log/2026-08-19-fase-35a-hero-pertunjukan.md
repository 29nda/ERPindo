# Fase 35a — layar pertama berhenti menjelaskan, dan mulai memperagakan

Pemilik: *"gue bosen banget liat tata letak dan teks di landing page, gue aja
gak tertarik apalagi calon pengguna."*

Ini keluhan ketiga tentang halaman yang sama. Dua jawaban saya sebelumnya —
Fase 32e (kejernihan) dan 34a (ragam baku) — memperbaiki **kalimatnya**, dan
keduanya meleset, karena keluhannya memang bukan tentang kalimat.

## Diperiksa dengan melihat, bukan membaca sumbernya

Halaman dipotret di 1440px dan 390px:

| | |
| --- | --- |
| tinggi desktop | 6.759px (**7,5 layar**) |
| tinggi mobile | 8.395px (**9,9 layar**) |
| isi layar pertama | ruang kosong 170px → badge pil → enam blok teks bertumpuk |
| gambar produk | **di bawah lipatan**, terpotong |

Dan yang paling menentukan: **judulnya deskripsi kategori.** "Pembukuan, stok,
gaji, dan pajak — beres dalam satu aplikasi" bisa dipakai dua ratus ERP lain
kata per kata.

## Yang diubah

### Judul menantang, bukan mendaftar fitur

> **"Anda mencatat satu penjualan tiga kali. Itu dua kali kebanyakan."**

Nota, lalu buku, lalu Excel. Kalimat itu menyebut hal yang pembacanya kerjakan
tadi malam, dan ia menyiapkan panggung untuk peragaannya.

### Tangkapan layar mati → peragaan hidup

Layar pertama yang lama **mengaku** "catat sekali, sisanya otomatis" dan meminta
pengunjung mempercayainya.

Padahal itu satu-satunya klaim di seluruh halaman yang **bisa diperagakan**.
Jadi diperagakan: satu faktur diposting, lalu empat kartu menyala satu per satu
— jurnal, stok, laba rugi, PPN.

**Angkanya benar, dan itu bagian dari maksudnya:**

```
Debit  : Piutang Usaha 1.665.000 + HPP 900.000                    = 2.565.000
Kredit : Pendapatan 1.500.000 + PPN 165.000 + Persediaan 900.000  = 2.565.000
```

HPP 900.000 = 10 × biaya rata-rata 90.000, dan stok turun 40 → 30. Pembeli yang
paham pembukuan akan memeriksanya — dan merekalah yang paling menentukan
keputusan membeli.

### Layar pertama dipadatkan supaya peragaan ikut terlihat

Badge pil dibuang (penanda paling khas landing SaaS, memakan 60px, dan isinya
sudah dinyatakan nama produknya). Judul turun dari 4,25rem ke 3,25rem dan dari
tiga baris jadi dua. Harga + syarat dirapatkan dari dua paragraf menjadi satu
baris di samping tombol.

Hasilnya peragaan mulai di **y≈500** (desktop) dan **y≈600** (mobile) — di dalam
layar pertama, bukan di bawahnya.

### Tombol dobel di mobile

Bilah lengket dulu tampil **sejak layar pertama**, sementara tombol yang sama
persis ada di dalam hero tepat di atasnya: empat tombol di satu layar 390px,
dua di antaranya duplikat. Kini ia muncul setelah hero terlewati.

## Tiga hal yang saya benahi karena gerbangnya memerah

**Klaim yang hilang.** Merapatkan baris harga ikut membuang "seluruh modul
terbuka, pengguna tak terbatas" dari halaman — dan itu seluruh isi argumen harga
tunggal. Asersi `F15` menangkapnya dalam satu kali jalan. Dikembalikan ke seksi
Harga, tempat yang memang benar.

**Utang warna naik 5.** Komponen baru memakai `text-brand-600 dark:text-brand-400`
lima kali. Ambang tidak dinaikkan; yang ditambahkan **tiga token semantik yang
ikut tema** — `brand-ink`, `brand-line`, `accent-ink` — persis pola yang sudah
dipakai `ink`/`surface`/`line` sejak Fase 31a. Sekarang halaman lain bisa ikut
menurunkan utangnya.

**Utang i18n naik 7.** Seluruhnya salah kenali: penyapu memindai `pages/**/*.tsx`
dan salah membaca kamus serta anotasi tipe sebagai teks layar. Polanya **tidak**
dilonggarkan — naskah dan datanya dipindah ke `pertunjukanTeks.ts`, dan kueri
`prefers-reduced-motion` ke `lib/gerak.ts`. Keduanya pemisahan yang memang benar
secara arsitektur, bukan pelintiran demi alat.

## Penjaga: yang lama tidak dihapus, tetapi diarahkan ulang

`F22` dulu memeriksa "gambar hero termuat, bukan 404". Gambarnya kini memang
tidak ada.

Penjaganya diarahkan ke hal yang sekarang memikul bukti — dan hasilnya **lebih
kuat daripada yang lama**: ia memastikan jurnal yang diperagakan benar-benar
seimbang, bukan sekadar sebuah berkas termuat.

**Disabotase.** PPN diubah 165.000 → 265.000 dan total ikut digeser: `F22`
memerah dengan `seimbang=false`. Lalu dipulihkan.

Satu asersi baru, `F47b`: bilah lengket **tidak boleh** menutupi layar pertama.

## Aksesibilitas

Seluruh isi peragaan selalu ada di DOM; animasi hanya menyingkapnya — pembaca
layar mendapat teks lengkap tanpa menunggu. `prefers-reduced-motion` menampilkan
hasil akhirnya sekaligus tanpa gerak. Tombol "Posting" peraga diberi
`aria-hidden` supaya tidak ada kontrol palsu yang bisa ditemukan Tab.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 623 | ✅ 623 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ **362** |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 145 · 0 | ✅ 145 · 0 |
| `sapu-istilah` | 0 | ✅ 0 |
| `sapu-gaya` | 0 / 9 / 0 | ✅ 0 / 9 / 0 |

## Yang belum dikerjakan

Ini baru **layar pertama**. Delapan seksi di bawahnya masih berbentuk sama
persis satu sama lain — judul + grid kartu, tanpa perubahan tempo — dan itulah
sisa keluhan "membosankan". Fase 35b.

Gambar produk di seluruh halaman juga masih menampilkan **"Hutang Belum Lunas"**:
ia diregenerasi di Fase 32d, sebelum migrasi nama akun di 33d. Fase 35d.
