# Fase 35c/35d — judul yang berpendapat, dan gambar yang berhenti berbohong

## 35c — lima judul seksi berhenti netral

Pemilik memilih nada **berani & berpendapat**. Judul seksi yang lama netral
sampai tidak berbunyi apa-apa:

| Sebelum | Sesudah |
| --- | --- |
| "Lihat cara kerjanya" | **"Ini tampilan aslinya. Bukan gambar rekaan."** |
| "Satu sistem, dari toko pertama sampai grup perusahaan" | **"Satu harga. Tidak ada paket yang lebih mahal."** |
| "Data bisnis Anda, aman di tangan Anda" | **"Data Anda tetap milik Anda, termasuk setelah Anda pergi."** |
| "Siap merapikan bisnis Anda?" | **"Jangan percaya halaman ini. Buka demonya."** |

Yang terakhir adalah ajakan terkuat yang bisa ditulis produk ini, dan ia hanya
boleh ditulis karena **demonya memang nyata**: satu perusahaan berisi data
setahun penuh, neraca saldonya seimbang, dan siapa pun bisa memeriksanya tanpa
mendaftar. Halaman yang menyuruh pembacanya tidak mempercayainya sendiri hanya
masuk akal bila ada yang bisa diperiksa.

"Masih pakai buku & Excel?" **dibiarkan** — ia sudah menantang sejak Fase 32e.

## 35d — enam gambar produk diregenerasi

Gambar landing terakhir dibuat di **Fase 32d**, sementara nama akun diseragamkan
di **Fase 33d**. Akibatnya halaman depan memajang kartu berbunyi
**"Hutang Belum Lunas"** — istilah yang sudah tidak ada di aplikasinya sendiri.

Halaman jualan yang memperlihatkan istilah yang tidak dipakai produknya adalah
bentuk paling langsung dari naskah yang berbohong, dan tidak ada gerbang yang
bisa melihatnya: gambar bukan teks.

### Diverifikasi dengan MELIHAT, bukan dengan status skrip

Skrip bisa melaporkan sukses sambil menghasilkan gambar basi — misalnya bila
`wrangler dev` menyajikan build lama. `hero-dashboard.webp` dibuka satu per satu
dan diperiksa:

| Yang dicari | Hasil |
| --- | --- |
| kartu KPI | **"Utang Belum Lunas"** ✅ (dulu "Hutang") |
| label menu | **"Pesanan Marketplace"** ✅ (perubahan Fase 33e ikut terpotret) |
| penyemaian | 400 langkah, neraca saldo seimbang: YA |

`hero-dashboard.webp` **tidak lagi dipakai di halaman depan** — peragaan hidup
menggantikannya di Fase 35a — tetapi ia masih dipakai `/fitur` pada modul
Dasbor, jadi ia tetap harus benar.

## Empat asersi diperbarui, tidak satu pun dilonggarkan

Judul seksi dipakai ui-sim sebagai **penanda posisi**, bukan sekadar teks:

- `F30b` memastikan harga muncul **sebelum** seksi harga (kalau tidak, ia
  sebenarnya masih di bawah lipatan) — penandanya kini judul yang baru.
- `F47` mencari tombol demo **di dalam** pita CTA penutup — penandanya kini
  "Buka demonya".
- `F15` dwibahasa kini menyebut `"Not a mockup"`.

Semuanya diarahkan ke bunyi barunya, bukan diubah menjadi pencocokan sebagian.

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
| `periksa-tautan-dokumen` | hijau | ✅ |
