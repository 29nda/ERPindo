# Peta repo untuk pemilik — apa isinya dan di mana letaknya

> Untuk **pemilik**, bukan programmer. Tujuannya satu: begitu Anda ingin
> mengubah sesuatu (harga, tulisan di halaman depan, isi demo), Anda tahu
> berkas mana yang disebut — walau yang mengetiknya nanti orang atau agen lain.
>
> Versi teknisnya, untuk siapa pun yang menyentuh kode:
> [`08-referensi-teknis-repo.md`](08-referensi-teknis-repo.md).

## Gambaran besar: satu program, dua jenis database

Seluruh ERPindo adalah **satu program** yang berjalan di jaringan Cloudflare —
tidak ada server yang Anda sewa, hidupkan, atau tambal. Program itu melayani dua
hal sekaligus: tampilan yang dilihat pengguna, dan mesin di belakangnya.

Perjalanan satu klik, misalnya pengguna menekan "Simpan Faktur":

```
Peramban pengguna
      │  (1) tampilan aplikasi — halaman React yang sudah diunduh
      ▼
Worker Cloudflare "erpindo"            ← satu-satunya "server"
      │  (2) memeriksa: sesi masih sah? perannya boleh? paketnya mencakup modul ini?
      ▼
Database KONTROL                       ← akun, perusahaan, langganan
      │  (3) "perusahaan ini pakai database yang mana?"
      ▼
Database PERUSAHAAN                    ← faktur, stok, jurnal milik SATU perusahaan
      │  (4) faktur disimpan + jurnal akuntansinya diposting
      ▼
     Laporan membaca dari jurnal itu
```

**Kenapa satu database per perusahaan?** Karena pemisahannya menjadi fisik, bukan
sekadar aturan program. Salah tulis kode paling parah tetap tidak bisa membuat
data perusahaan A muncul di layar perusahaan B — mereka ada di berkas database
yang berbeda. Konsekuensinya: jumlah perusahaan dibatasi jumlah database yang
disiapkan (sekarang 6; cara menghilangkannya ada di tutorial langkah 7).

**Jurnal adalah pusatnya.** Setiap modul — penjualan, kasir, gaji, aset — pada
akhirnya menulis jurnal akuntansi berpasangan (debit = kredit). Semua laporan
keuangan membaca dari sana, bukan dari modulnya masing-masing. Itu sebabnya
neraca selalu bisa dibuktikan seimbang.

## Isi folder, satu-dua kalimat per folder

| Folder | Isinya | Kapan Anda peduli |
| --- | --- | --- |
| `apps/web/` | Semua yang **dilihat** pengguna: halaman depan, aplikasi, halaman panduan | Mengubah tulisan, tampilan, atau menu |
| `apps/api/` | **Mesin**-nya: aturan bisnis, akuntansi, langganan, keamanan, tugas harian otomatis | Mengubah cara kerja, bukan tampilan |
| `packages/shared/` | Aturan yang dipakai **kedua** sisi (bentuk data, harga paket, perhitungan murni) | Harga paket, batas per paket |
| `packages/db/` | Bentuk tabel database dan riwayat perubahannya | Nyaris tidak pernah |
| `scripts/` | Alat operasional: mengisi demo, mengambil tangkapan layar, membersihkan perusahaan, uji browser | Mengganti demo atau gambar produk |
| `docs/` | Dokumen: rencana, status, runbook, tutorial, catatan tiap fase | Membaca status pekerjaan |
| `.github/workflows/` | Pemeriksaan otomatis tiap kali kode berubah, plus alat penyemai demo | Nyaris tidak pernah |
| `wrangler.jsonc` | Pengaturan infrastruktur: database mana saja, jadwal tugas harian, batas kapasitas | Menambah kapasitas, mengubah jadwal |

## Mau mengubah X → berkasnya ini

| Yang ingin diubah | Berkas |
| --- | --- |
| **Harga paket** (Starter/Business/Enterprise) & batas tiap paket | `packages/shared/src/core.ts` (sekitar baris 158) |
| Tulisan & FAQ **halaman depan** | `apps/web/src/pages/landing/sections.ts` |
| Penjelasan **22 modul** di halaman `/fitur` | `apps/web/src/pages/landing/fiturDetail.ts` |
| Susunan halaman depan (urutan bagian, tombol) | `apps/web/src/pages/landing/index.tsx` |
| **Semua tulisan di dalam aplikasi** (dwibahasa ID/EN) | `apps/web/src/i18n/ui.ts` |
| **Menu/navigasi** aplikasi | `apps/web/src/pages/app.tsx` (daftar `NAV_ITEMS`) |
| Isi **email** yang dikirim otomatis | teks pesannya menyatu dengan pengirimnya — pengingat langganan di `apps/api/src/index.ts`, email akun di `apps/api/src/routes/auth.ts`; mekanisme kirimnya di `apps/api/src/lib/mailer.ts` |
| **Peragaan produk** di halaman depan | `apps/web/src/peragaan/naskah/` (naskah data; tidak ada berkas gambar) |
| **Gambar panduan** di dalam aplikasi | `apps/web/public/panduan/` (29 berkas, dari skrip yang sama) |
| Logo, favicon, ikon aplikasi | `apps/web/public/` (`favicon.png`, `pwa-192.png`, `pwa-512.png`, `og-image.png`, `brand/`) |
| **Isi demo publik** (data contoh yang dilihat calon pelanggan) | `scripts/seed-demo.mjs` |
| **Kapasitas** (jumlah perusahaan) & **jadwal tugas harian** | `wrangler.jsonc` |
| Aturan **akuntansi** (jurnal apa untuk transaksi apa) | `apps/api/src/lib/accounting.ts`, `apps/api/src/lib/commercePosting.ts` |
| **Modul mana masuk paket mana** | `apps/api/src/middleware/auth.ts` |
| Bentuk tabel database perusahaan | `packages/db/src/migrations.ts` |

> Tulisan yang muncul di dalam aplikasi **selalu** lewat `i18n/ui.ts`, tidak
> pernah diketik langsung di halamannya. Itu aturan yang dijaga alat pemeriksa
> otomatis, supaya tidak ada layar yang diam-diam kembali satu bahasa.

## Apa yang terjadi saat kode diubah

1. Perubahan didorong ke GitHub sebagai **pull request** (usulan perubahan).
2. GitHub menjalankan **pemeriksaan otomatis** — empat cek: pemeriksaan tipe +
   uji + build + skenario end-to-end, simulasi browser sungguhan, gaya penulisan
   kode, dan build Cloudflare.
3. **Cloudflare men-deploy ke Worker produksi** — dan ini yang mudah
   mengejutkan: **branch pull request pun ikut ter-deploy**, bukan hanya `main`.
   Artinya perubahan sudah tayang sebelum "digabung"; penggabungan ke `main`
   merapikan riwayat, bukan yang membuatnya hidup.
4. Setelah digabung, satu catatan ditulis di `docs/log/` dan barisnya ditambahkan
   ke `docs/STATUS.md`.

## Gerbang mutu — kenapa angkanya penting

Sebelum apa pun boleh masuk, tujuh pemeriksaan harus hijau. Angka acuannya hari
ini (14 Agustus 2026): **482 uji unit · 1.088 skenario end-to-end · 337 cek
browser sungguhan**.

Aturan repo ini: **jumlah cek hanya boleh naik, tidak boleh turun.** Fitur baru
wajib membawa pemeriksaannya sendiri, dan tiap pemeriksaan baru harus dibuktikan
**bisa merah** — dengan sengaja merusak kodenya lalu memastikan pemeriksaan itu
gagal. Uji yang tidak pernah bisa gagal tidak menjaga apa pun; ia hanya membuat
laporan terlihat hijau.

## Di mana membaca keadaan terkini

| Pertanyaan | Jawabannya di |
| --- | --- |
| Apa saja yang sudah selesai, dalam bahasa non-teknis | [`docs/STATUS.md`](STATUS.md) |
| Apa yang dikerjakan di satu fase, dan apa yang **tidak** | `docs/log/` (satu berkas per sub-fase) |
| Rencana ke depan | [`docs/03-roadmap-lanjutan.md`](03-roadmap-lanjutan.md) |
| Langkah peluncuran | [`docs/06-tutorial-peluncuran.md`](06-tutorial-peluncuran.md) |
| Detail operasional tiap kunci | [`docs/05-runbook-go-live.md`](05-runbook-go-live.md) |
| Cara kerja teknisnya | [`docs/08-referensi-teknis-repo.md`](08-referensi-teknis-repo.md) |

Berkas di `docs/log/` sengaja memuat bagian "yang **tidak** dikerjakan" dan
koreksi bila temuan awal ternyata keliru. Kalau suatu hari Anda ingin tahu
apakah sesuatu benar-benar beres atau hanya terdengar beres, di situ tempatnya.
