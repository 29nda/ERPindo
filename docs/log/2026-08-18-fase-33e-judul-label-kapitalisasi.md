# Fase 33e — judul halaman diselaraskan dengan menunya, tombol jadi sentence case

Bagian C panduan gaya. Dua hal: ketidakcocokan judul-vs-menu, dan kapitalisasi.

## 1. Judul halaman harus diawali label menunya

Panduan menyebut **10** ketidakcocokan. Diukur ulang dengan membandingkan
`NAV_ITEMS` (`pages/app.tsx`, 45 label) dengan `PAGE_HEADINGS`
(`i18n/pageHeadings.ts`, 45 judul): benar 10.

Tetapi tidak sepuluhnya salah. Aturan yang dipakai:

> **Judul halaman harus DIAWALI label menunya.** Judul boleh lebih spesifik —
> "Dukungan" → "Dukungan & Masukan" tetap langsung dikenali karena kata yang
> diklik muncul di depan. Yang dilarang adalah judul yang **dimulai dengan kata
> lain**.

Dengan aturan itu, 6 dari 10 sudah benar (judulnya sekadar lebih panjang).
Empat yang benar-benar perlu diubah:

| Yang salah | Menjadi | Kenapa |
| --- | --- | --- |
| menu "Marketplace" → judul "Pesanan Marketplace" | menu **"Pesanan Marketplace"** | menu diselaraskan ke judul, sekalian sejajar dengan tetangganya "Pesanan Penjualan" |
| menu "Dimensi & Rekon" | menu **"Dimensi & Rekonsiliasi"** | "Rekon" bukan kata |
| judul "Migrasi & saldo awal" | **"Migrasi & Saldo Awal"** | judul halaman memakai Title Case (keputusan (c)) |
| judul "Pengadaan (Procurement)" | **"Pengadaan"** | terjemahan Inggris dalam kurung |

Sisi Inggrisnya ikut: `"Dimensions & Recon"` → `"Dimensions & Reconciliation"`,
`"Marketplace"` → `"Marketplace Orders"`.

### Tiga pengecualian, ditulis eksplisit

`Umur Piutang` dan `Umur Utang` adalah dua tampilan dari **satu** menu
"Umur Piutang/Utang" — judulnya mengikuti pilihan di layar. `Panduan` memang
tidak ada di sidebar; ia dibuka dari tombol bantuan di header.

Ketiganya terdaftar di dalam penjaganya beserta alasannya, bukan disembunyikan
lewat pelonggaran pola.

## 2. Kapitalisasi — dan kenapa sapuannya TIDAK dijalankan penuh

Keputusan (c): sentence case untuk tombol/label/kolom, Title Case hanya untuk
judul halaman dan nama modul.

Percobaan pertama menyapu **semua** entri `ui.ts` yang terlihat Title Case:
122 kandidat, 104 akan berubah. Hasilnya dibaca sebelum dipakai, dan sapuan itu
**salah pada kelas yang penting**:

| Usulan otomatis | Kenapa salah |
| --- | --- |
| "PT Pelanggan Setia" → "PT pelanggan setia" | nama perusahaan (contoh isian) |
| "SPT Masa PPN 1111" → "SPT masa PPN 1111" | nama resmi formulir DJP |
| "PPh Final 0,5%" → "PPh final 0,5%" | nama resmi skema pajak |
| "Laba Rugi" → "Laba rugi" | nama laporan — setara nama modul |
| "Asisten ERPindo" → "Asisten ERPindo" (dari "Tutup Asisten ERPindo") | nama fitur |

Sapuan itu **dibuang**, bukan ditambal. Yang dikerjakan hanya kelas yang
aturannya tidak berselisih dengan apa pun: **tombol aksi berawalan kata kerja**
— 45 entri, `Tambah`, `Buat`, `Simpan`, `Posting`, `Terima`, `Bayar`, `Tutup`,
dan seterusnya. "Simpan Perubahan" → "Simpan perubahan"; "Bayar & Cetak Struk"
→ "Bayar & cetak struk". Sisi Inggrisnya ikut ("Post Invoice" → "Post invoice").

Kata benda, nama laporan, tab, dan header kolom **belum disentuh**. Itu
menunggu `sapu-gaya.mjs` di Fase 33k, yang bisa membawa daftar nama-diri
terkurasi — sesuatu yang tidak bisa ditebak oleh pola.

### Dua kekeliruan saya sendiri di sapuan tombol, tertangkap sebelum dipakai

Daftar nama-diri saya sempat memuat "Struk" dan "Faktur". Keduanya kata benda
biasa, bukan nama diri, dan akibatnya:

- "Bayar & Cetak Struk" → "Bayar & cetak **Struk**"
- "Posting Faktur" → "Posting **Faktur**" (tidak berubah sama sekali)

Terlihat karena usulannya dicetak dan dibaca sebelum ditulis ke berkas, bukan
diterapkan langsung.

## Penjaga baru — dan buktinya bahwa keduanya bisa gagal

Dua uji di `apps/web/test/i18n.test.ts`, membaca kedua berkas sumber **sebagai
teks**. Mengimpor `app.tsx` akan menarik seluruh kerangka aplikasi ke dalam uji
yang sebenarnya hanya butuh dua daftar string.

| Uji | Isi |
| --- | --- |
| judul diawali label menu | 45 judul vs 45 label, 3 pengecualian bernama |
| judul memakai Title Case | kata bermula huruf kecil di tengah judul |

**Disabotase satu per satu.** `"Pengadaan"` diganti `"Alur Pengadaan"` → uji
pertama gagal. `"Migrasi & Saldo Awal"` dikembalikan ke `"Migrasi & saldo awal"`
→ uji kedua gagal. Keduanya dipulihkan.

Uji kedua sempat memerah pada **"Ekspor e-Faktur"**, dan itu benar-benar
menolong: `e-Faktur` memang bernama begitu, dan membesarkan huruf depannya
justru salah. Polanya diperbaiki — kata dilewati bila masih memuat huruf
kapital di dalamnya — bukan judulnya yang dipaksa ikut pola.

### Yang penjaganya BELUM tangkap, dan dikatakan apa adanya

"Pengadaan (Procurement)" **lolos** uji pertama: ia memang diawali label
menunya. Yang salah dari judul itu adalah terjemahan Inggris di dalam kurung —
kelas yang tidak dijaga apa pun saat ini. Ia diperbaiki dengan tangan di fase
ini, dan yang akan menjaganya adalah `sapu-gaya.mjs` (Fase 33k).

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 611 | ✅ **613** |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 147 · 0 | ✅ 147 · 0 |

Empat asersi ui-sim membaca label tombol apa adanya (`"Post Invoice"`,
`"Create Project"`, `"Post Entry"`, `"Export & Backup"`) dan memerah begitu
labelnya berubah. Diperbarui di commit yang sama — bukan dilonggarkan.
