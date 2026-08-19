# Fase 33f — empty state diberi langkah lanjut, dan satu angka panduan yang keliru

Bagian D panduan gaya. Yang terbesar di dalamnya: **"93 empty state, 89 di
antaranya buntu"**.

Angka pertama benar. Angka kedua tidak — dan sebabnya penting.

## Empty state: 93 benar, "89 buntu" salah

`EmptyState` di `components/ui.tsx` menerima **dua** prop: `title` dan
`description`. Dua belas empty state yang terhitung buntu ternyata judul
pendek yang **sudah berpasangan dengan penjelasan berisi langkah lanjut**:

| Judul | Penjelasan yang sudah ada di sebelahnya |
| --- | --- |
| "Belum ada aset" | "Daftarkan aset tetap (kendaraan, peralatan, dll.) untuk mulai menyusutkan otomatis." |
| "Belum ada proyek" | "Buat proyek untuk mulai melacak profitabilitas per pekerjaan/klien." |
| "Belum ada kontrak" | "Buat kontrak langganan agar faktur terbit otomatis tiap periode." |

Audit yang menghasilkan angka 89 menghitung **string**, bukan **layar**. Satu
empty state di layar bisa tersusun dari dua string, dan yang mengandung
langkahnya justru yang kedua.

### Saya sempat memperburuknya

Sapuan pertama saya menulis ulang 61 string, termasuk 12 judul itu. Hasilnya:
judul tebal berbunyi satu kalimat penuh, lalu **satu kalimat lagi** di
bawahnya yang mengatakan hal serupa. Dua paragraf untuk satu keadaan kosong.

Tertangkap saat memeriksa siapa pemakai tiap kunci — bukan oleh gerbang mana
pun, karena tidak ada gerbang yang tahu bedanya judul dan penjelasan. Kedua
belas judul dikembalikan ke bentuk pendeknya.

## Yang benar-benar dikerjakan

**49 empty state ditulis ulang** dengan langkah lanjut, dibagi menurut sebab
kosongnya — karena langkah yang benar berbeda per sebab:

| Sebab kosong | Langkah yang diberikan | Contoh |
| --- | --- | --- |
| pencarian tak menemukan | perpendek kata kunci / kosongkan | "Tidak ada produk yang cocok. Coba kata kunci lebih pendek, atau kosongkan pencarian." |
| periode/rentangnya yang kosong | ganti atau lebarkan periode | "Tidak ada faktur pada rentang tanggal ini. Lebarkan rentangnya untuk melihat yang lebih lama." |
| memang belum pernah dibuat | buat yang pertama, **beserta apa yang terbuka karenanya** | "Belum ada gudang. Tambahkan minimal satu gudang sebelum mencatat stok masuk." |
| terisi sendiri oleh sistem | katakan kapan terisinya | "Belum ada omzet pada masa ini. Angkanya terisi sendiri begitu ada faktur penjualan diposting." |

Membedakan keempatnya adalah seluruh isi fase ini. "Coba kata kunci lain" pada
layar yang memang belum punya data satu pun adalah saran yang menyesatkan.

**Empat penjelasan yang memang buntu** ikut diperbaiki — semuanya berbentuk
"akan muncul di sini", yang memberi tahu bahwa nanti terisi tanpa mengatakan
bagaimana mengisinya:

> "Tiket dukungan akan muncul di sini." →
> "Buat tiket saat pelanggan melapor, agar keluhannya tidak tercecer di chat."

## Yang sengaja TIDAK diberi langkah lanjut

Enam empty state adalah **kabar baik**, bukan kebuntuan:

- "Tidak ada piutang yang belum lunas. 🎉"
- "Tidak ada utang yang belum lunas. 🎉"
- "Tidak ada beban yang mencurigakan. 👍"
- "Tidak ada yang perlu perhatian. 👍"
- "Tidak ada tugas terbuka dengan tenggat."
- "Tidak ada produk dengan stok ≤ …"

Menambahkan langkah lanjut di sini justru merusak: ia mengubah kabar baik
menjadi tugas.

Empat lagi adalah **potongan kalimat** yang di layar disambung dengan angka
(`"Belum ada akun"` + nama tipe, `"Tidak ada produk dengan stok ≤"` + ambang).
Menambahi kalimat memecah sambungannya.

Dua sisanya — `"Tidak ada."` dan `"Tidak ada data."` — dipakai di banyak
tempat berbeda. Langkah lanjut yang spesifik akan benar di satu layar dan
salah di layar lain.

## Placeholder angka

Tiga, persis seperti disebut panduan: `mis. 5000000`, `mis. 500000`,
`mis. 10000000`. Angka contoh tanpa pemisah ribuan mengajarkan bentuk input
yang salah, padahal begitu tersimpan aplikasi menampilkannya bertitik.
Kini `mis. 5.000.000` (dan `e.g. 5,000,000` di sisi Inggris).

## Dua tombol yang lolos sapuan 33e

"Konfirmasi & Aktifkan" dan "Konfirmasi Tutup" tidak tersapu di 33e karena
sapuan itu hanya menyentuh tombol berawalan **kata kerja**, dan "Konfirmasi"
adalah kata benda. Diperbaiki dengan tangan.

## Yang ditemukan tetapi bukan milik fase ini

**Empat belas toast masih Bahasa Indonesia keras** — `crm.tsx`, `finance.tsx`,
`stok.tsx`, `pos.tsx`, `salesorders.tsx` — dirakit langsung sebagai template
string, jadi tidak pernah ikut bahasa aktif. Itu bagian dari 147 utang teks
layar yang sudah tercatat, dan penyelesaiannya ada di Fase 33h
(dwibahasakan), bukan di sini.

Dicatat, tidak dikerjakan diam-diam.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 613 | ✅ 613 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 147 · 0 | ✅ 147 · 0 |
