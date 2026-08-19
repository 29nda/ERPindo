# Fase 35b — halaman berhenti memakai satu bentuk dari atas sampai bawah

Fase 35a mengganti layar pertama. Sisa keluhan "membosankan" ada di bawahnya:
**delapan seksi berturut-turut memakai bentuk yang sama persis** — judul, lalu
grid kartu, di atas krem yang sama — dan tidak ada satu pun momen yang membuat
mata berhenti.

## 1. Bilah bukti: empat paragraf → satu bilah

`TrustBar` berisi empat kolom, masing-masing ikon + judul serif + paragraf, dan
letaknya **tepat di bawah peragaan yang baru saja membuktikan hal yang sama**.
Ia memakan hampir satu layar penuh untuk mengulang.

Kini satu bilah rapat berisi judulnya saja: *Satu harga · Pajak Indonesia ·
Kasir tetap berjalan · Data milik Anda*. Penjelasan lengkapnya tetap ada di
seksi Harga, Keamanan, dan FAQ — yang memang tempatnya.

## 2. Satu pita kontras di tengah halaman

Seksi perbandingan ("Masih pakai buku & Excel?") kini berdiri di atas
`bg-ink text-ink-invert` — gelap di tema terang, terang di tema gelap,
**tanpa satu pun kelas `dark:`** karena token itu memang membalik sendiri.

Seksi inilah tempatnya, dan bukan sembarang seksi: ia berisi **pertentangan** —
cara lama melawan cara ini — dan pertentangan pantas terlihat berbeda dari
sekelilingnya.

### Cacat yang saya buat di situ, dan hanya terlihat karena dipotret

Sel-sel tabel mewarisi `text-ink-invert` dari pitanya, sementara latar barisnya
sendiri tetap terang. Hasilnya **kolom pertama menjadi putih di atas putih** —
nama pekerjaan (Mencatat penjualan, Menghitung PPN, …) hilang seluruhnya.

Tidak ada gerbang yang bisa melihatnya: kontras bukan sesuatu yang diperiksa
asersi teks, dan `innerText` tetap memuat kata-katanya. Ia hanya ketahuan
karena halamannya dipotret dan dilihat.

Diperbaiki dengan `text-ink` pada `<table>`, memulihkan konteks warna normal di
dalam pita.

## 3. Rongga desktop dirapatkan

Empat seksi berturut-turut memakai `lg:py-32`, jadi jarak antar-seksi menumpuk
menjadi ±256px di layar besar. Fase 32e sudah memperbaiki gejala yang sama di
mobile; sisanya di desktop. Kini `py-14 sm:py-20`.

## Hasil

| | Sebelum | Sesudah |
| --- | --- | --- |
| tinggi desktop | 6.759px (7,5 layar) | **5.588px (6,2 layar)** |
| bentuk seksi berturut-turut | 8 sama | 7, dengan satu pita kontras |
| bilah bukti | 4 kolom paragraf | 1 bilah |

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 623 | ✅ 623 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 362 | ✅ 362 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 145 · 0 | ✅ 145 · 0 |
| `sapu-istilah` · `sapu-gaya` | 0 | ✅ 0 |

## Catatan

Pita kontras dibuat **satu saja**, disengaja. Dua pita menjadikannya pola lagi,
dan pola adalah persis yang membuat halaman ini membosankan sejak awal.
