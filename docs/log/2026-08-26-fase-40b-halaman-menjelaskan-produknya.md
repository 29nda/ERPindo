# Fase 40b — beranda akhirnya menjelaskan produknya

## Temuan pemilik

> "Kalau orang Indonesia baca kalimat yang aneh, gimana mau langganan?
> Informasinya saja susah dipahami."

Fase 40a membetulkan bentuk kalimat. Keluhan ini tentang hal lain, dan lebih
mendasar.

## Yang diukur lebih dulu

Dugaan pertama — kalimatnya kepanjangan — **salah**, dan itu bagus diketahui
sebelum menulis ulang apa pun:

| Ukuran | Hasil |
| --- | --- |
| Kalimat prosa di beranda | 93 |
| Rata-rata kata per kalimat | **10,7** |
| Kalimat di atas 20 kata | 5 (5%) |

Naskahnya pendek-pendek. Jadi kesulitannya bukan panjang kalimat.

## Yang sebenarnya salah

Halaman dibaca ulang persis seperti pengunjung membacanya (`innerText` dari
peramban sungguhan, bukan dari berkas sumber). Urutan yang diterima pembaca:

1. Posisi produk: "ERP siap pakai, tanpa proyek pemasangan."
2. Daftar istilah pajak: "Bagan akun standar Indonesia, tarif PPN, PPh 21
   metode TER, dan BPJS…"
3. Statistik kegagalan industri: "68% proyek ERP gagal… 189%…"
4. Jurnal double-entry: Piutang Usaha, PPN Keluaran, Harga Pokok Penjualan.
5. "Jangan percaya. Periksa angkanya."
6. Taksonomi empat sebab kegagalan: 34%, 35%, 38%.

**Tidak satu pun dari enam blok itu menyebutkan aplikasinya bisa dipakai untuk
apa.** Pengunjung datang bertanya "ini aplikasi apa", dan halaman menjawab "ini
alasan proyek ERP gagal".

Halaman ini berupa ARGUMEN, bukan PENJELASAN. Itu naluri B2B Inggris: buka
dengan posisi dan bukti, anggap pembaca sudah tahu kategorinya. Pembaca
Indonesia menunggu produknya disebut lebih dulu.

Cacat kedua yang menyertainya: pembaca yang belum tahu arti "bagan akun" sudah
hilang di kalimat pertama — padahal dialah yang menandatangani langganan.

## Yang dikerjakan

- **Kalimat pertama sekarang memakai kata kerja yang dipahami siapa pun di
  perusahaan**: "Catat penjualan, kelola stok, hitung gaji, dan susun laporan
  keuangan perusahaan Anda dalam satu aplikasi." Istilah pajaknya menyusul di
  kalimat kedua, tempat ia menjadi bukti alih-alih sambutan.
- **Statistik kegagalan dipindahkan keluar dari hero**, bukan dibuang. Ia
  tampil lengkap beserta sumbernya di seksi "Empat sebab proyek ERP gagal",
  tempat keempat persentasenya memang diuraikan. Menyebutnya dua kali membuat
  halaman terbaca seperti ceramah tentang kegagalan.
- **Sembilan tanda pisah ala Inggris** dibersihkan dari naskah peragaan (pola
  "— sehingga", "— jadi", "— bukan"). Tanda pisah yang memisahkan label dari
  nilainya ("Di bawah Rp 10.000.000 — langsung diposting") **dipertahankan**:
  itu pemakaian yang sah, dan mengubahnya akan merusak yang benar.
- **Jargon di narasi langkah disederhanakan**: "Jurnal double-entry terbentuk
  sendiri" → "Jurnalnya terbentuk sendiri, dan debit sama dengan kredit".
  Istilahnya tetap ada di FAQ, `/fitur`, dan JSON-LD; yang berubah hanya
  kalimat yang dipindai sekilas.
- "berstatus posted" (Inggris di tengah kalimat Indonesia, glosarium §4) →
  "yang sudah diposting".

## Validasi

Satu asersi ui-sim (F49b) mengunci frasa yang disederhanakan. **Diperbarui
menyebut bunyi barunya**, bukan dilonggarkan.

- `pnpm typecheck` · `pnpm lint` · `pnpm build` — lulus
- `pnpm test` — 923 lulus, termasuk 255 uji naskah peragaan
- `pnpm smoke` — 1.173 cek · `node scripts/ui-sim.mjs` — 431/431
- Lima penyapu naskah hijau
