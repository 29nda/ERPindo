# Fase 34a — audit tata bahasa: yang salah ternyata ragamnya, bukan ejaannya

Pemilik menegaskan: yang diminta **tata bahasa yang benar**, bukan sekadar
bahasa sehari-hari.

Itu koreksi atas arah yang saya ambil sendiri. Fase 32e menjawab keluhan
"bahasanya tidak natural dan sulit dipahami" dengan membuat naskah jernih —
dan dalam prosesnya menurunkan ragamnya ke bahasa percakapan. Jernih dan baku
bukan hal yang sama, dan saya memperlakukannya seolah sama.

## Diaudit dengan aturan, bukan dengan selera

Dibangun pemeriksa PUEBI/KBBI atas **13.074 potong naskah** di 150 berkas:
ejaan tidak baku (60 pasang kata), kata percakapan, `di-`/`ke-` sebagai awalan
vs preposisi, `pun` serangkai, `per` serangkai.

### Hasil pertama: hampir seluruhnya positif palsu

| Aturan | Dilaporkan | Sungguhan |
| --- | --- | --- |
| ejaan tidak baku | 10 | **0** — kesepuluhnya kata Inggris `standard` di sisi EN |
| `di`/`ke` awalan terpisah | 2 | **0** — "di ekspor e-Faktur" memang preposisi |
| `di`/`ke` preposisi serangkai | 17 | **0** — polanya salah menangkap kata `keluar` |
| `pun` / `per` serangkai | 0 | 0 |

**Ejaannya memang sudah bersih.** Yang meleset ada di lapisan lain, dan
pemeriksa ejaan tidak akan pernah menemukannya.

## Audit kedua: ragam dan struktur

Pemeriksa ditulis ulang untuk memindai **hanya sisi Indonesia**, mencari
ragam percakapan dan cacat struktur kalimat. Di situ baru terlihat — dan
hampir seluruhnya **di naskah yang saya tulis sendiri di Fase 32e**.

### Kata percakapan

| Sebelum | Sesudah |
| --- | --- |
| "Rekap manual tiap masa pajak, **gampang** selisih" | "Merekap manual tiap masa pajak, dan **mudah** selisih" |
| "modal barang **cuma** ditebak" | "modal barang **hanya** ditebak" |
| "Baru sadar **telat** saat kas menipis" | "Baru **menyadari keterlambatannya** saat kas menipis" |
| "**File**nya siap diunggah" | "**Berkas**nya siap diunggah" |
| "kode dari **HP** Anda" | "kode dari **ponsel** Anda" |
| "**Online** lewat Xendit … **e-wallet**" | "**Secara daring** lewat Xendit … **dompet elektronik**" |
| "**database**nya masing-masing" | "**basis data**nya masing-masing" |

### Verba kehilangan awalan

Ini yang paling sering, dan paling tidak terasa saat menulisnya:

- "Kasir tetap **jalan**" → "Kasir tetap **berjalan**"
- "slip gaji langsung **jadi**" → "slip gajinya langsung **terbentuk**"
- "PWA tetap **jalan** offline" → "PWA tetap **berjalan** saat luring"
- "bisa langsung **jadi** Permintaan Pembelian" → "dapat langsung **menjadi**"

Kalimat perintah pada tombol **tidak** kena dan memang tidak boleh kena:
"Simpan", "Tambah produk" adalah bentuk yang benar.

### Kalimat tanpa subjek, dan koma sambung

| Sebelum | Sesudah |
| --- | --- |
| "Internet mati, penjualan tetap tercatat." | "**Saat** internet mati, penjualan tetap tercatat." |
| "Tersimpan sendiri begitu koneksi kembali." | "**Datanya** tersimpan sendiri begitu koneksi kembali." |
| "Bisa diunduh kapan saja, termasuk **kalau** Anda berhenti…" | "**Data dapat** diunduh kapan saja, termasuk **setelah** Anda berhenti…" |
| "Semua fitur terbuka, jumlah karyawan tidak dibatasi." | "Seluruh fitur terbuka **dan** jumlah karyawan tidak dibatasi." |
| "Langkah disetujui, lanjut ke approver berikutnya." | "Langkah ini disetujui **dan alurnya berlanjut** ke penyetuju berikutnya." |
| "Kasir cukup melihat kasir, staf gudang cukup melihat stok." | "Kasir cukup melihat **layar** kasir, **sedangkan** staf gudang cukup melihat stok." |

### Kolom tabel perbandingan disejajarkan

Kolom topiknya berbentuk gerund ("Mencatat penjualan", "Menghitung PPN"),
sementara kolom cara manualnya berbentuk perintah ("Tulis nota", "Hitung PPh
21"). Dua bentuk berbeda dibaca berdampingan sebagai satu baris.

Diseragamkan ke gerund: "Menulis nota, menyalinnya ke buku, lalu menghitung
ulang di Excel".

### Satu kata yang hilang dan mengubah arti

"Atur siapa boleh melihat apa" → "Atur siapa **yang** boleh melihat apa".

## Yang sengaja TIDAK diubah

**`bisa` — 78 kemunculan.** Ia baku menurut KBBI; ia hanya lebih santai
daripada `dapat`. Mengganti seluruhnya adalah churn tanpa nilai. Yang diganti
hanya di naskah penjualan dan keamanan, tempat ragamnya memang menentukan.

**`kalau` pada pertanyaan FAQ.** "Bagaimana kalau internet mati saat sedang
melayani pembeli?" ditulis dengan suara pembacanya sendiri, dan di situ
`kalau` justru bentuk yang tepat. Yang diganti hanya `kalau` dalam kalimat
berita.

**Aturan `kalimat-tanpa-predikat` dibuang.** Ia melaporkan 154 pelanggaran,
dan hampir seluruhnya kalimat perintah ("Pantau…", "Tetapkan…", "Catat…") yang
memang berpredikat — heuristiknya tidak mengenali verba dasar imperatif. Uji
yang salah 95% bukan uji.

**24 dari 28 "koma sambung" ternyata benar.** Yang setelah komanya frasa
keterangan atau aposisi, bukan klausa kedua. Hanya empat yang sungguhan.

## Penjaga baru di `sapu-istilah.mjs`

Dua aturan, keduanya berambang nol:

| Aturan | Isi |
| --- | --- |
| `ragam-percakapan` | 19 kata: cuma, gampang, telat, bikin, kayak, banget, … |
| `awalan-verba-hilang` | `(tetap\|masih\|sudah\|bisa\|dapat\|akan\|langsung) + (jalan\|kerja\|jadi)` |

**Disabotase.** "Kasir tetap berjalan" dikembalikan ke "tetap jalan", dan
"mudah selisih" ke "gampang selisih": kedua aturan memerah. Lalu dipulihkan.

Aturan kedua sengaja menuntut kata keterangan di depannya, supaya tombol
"Simpan"/"Jalankan" tidak ikut kena — larangan yang salah lebih mahal daripada
tidak ada larangan.

## Validasi

| Gerbang | Sebelum | Sesudah |
| --- | --- | --- |
| `typecheck` · `lint` · `build` | hijau | ✅ hijau |
| `pnpm test` | 623 | ✅ 623 |
| `pnpm smoke` | 1.139 | ✅ 1.139 |
| `node scripts/ui-sim.mjs` | 361 | ✅ 361 |
| `sapu-warna` | 83 / 325 | ✅ 83 / 325 |
| `sapu-i18n` | 145 · 0 | ✅ 145 · 0 |
| `sapu-istilah` | 4 aturan | ✅ **6 aturan**, semuanya 0 |
| `sapu-gaya` | 0 / 9 / 0 | ✅ 0 / 9 / 0 |

## Catatan kejujuran

Cacat ini saya yang buat, di fase yang justru dimaksudkan memperbaiki bahasa.
Keluhan aslinya benar dan perbaikannya benar arah — tetapi "mudah dipahami"
saya perlakukan sebagai satu-satunya ukuran, padahal ragam bahasa adalah ukuran
kedua yang berdiri sendiri.

Naskah bisa jernih dan tetap salah ragam. Sejak sekarang keduanya dijaga
terpisah: `sapu-gaya.mjs` untuk kejernihan, `sapu-istilah.mjs` untuk ragam.
