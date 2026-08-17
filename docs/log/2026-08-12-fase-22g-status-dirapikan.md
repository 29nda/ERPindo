# Fase 22g — STATUS.md dirapikan: bagian yang tak punya gerbang

Tanpa kode aplikasi. Satu tujuan, sama seperti Fase 21a untuk roadmap: membuat
`docs/STATUS.md` mencerminkan kenyataan, karena berkas itulah yang dipakai
pemilik untuk memutuskan apa yang dibangun berikutnya.

## Kenapa perlu

Tabel fase di `STATUS.md` (baris 1–219) terpelihara rapi sampai 22f — tiap
sub-fase menambah barisnya sendiri. **Segala sesuatu di bawah tabel itu tidak
pernah ikut diperbarui sejak sekitar Fase 3f**, kira-kira 19 fase lalu.

Akibatnya berkas ini menyuruh pemilik mengerjakan hal yang sudah selesai:
bagian "Yang dikerjakan berikutnya" masih memintanya mendaftar Midtrans untuk
Fase 2b-2 — padahal Fase 11b menuntaskan billing Midtrans lengkap dengan webhook
terverifikasi tanda tangan.

Alasannya bukan kelalaian sesaat, melainkan struktural: **menambah baris ke
tabel adalah bagian dari ritual tiap sub-fase, membaca ulang sisa berkasnya
tidak.** Dan tidak ada gerbang otomatis yang bisa menangkap dokumen basi.

## Tujuh temuan, semua diverifikasi ke kode atau log

| # | Isi lama | Bukti bahwa itu basi |
| --- | --- | --- |
| 1 | "863 end-to-end + 248 simulasi UI + 249 unit test" | hasil jalan hari ini: **1057 / 325 / 441** |
| 2 | "Yang dikerjakan berikutnya" = daftar Midtrans (±15 menit) | Fase 11b — checkout, webhook bertanda tangan, aktivasi otomatis, semua selesai |
| 3 | baris ⏸ "Fase 2b-2 — Menunggu akun gateway dari Anda" | sama seperti #2 |
| 4 | baris "Fase 2 — Peluncuran SaaS: **Belum**" | pendaftaran mandiri (Fase 0), billing (11b), PWA (2a) — ketiganya selesai |
| 5 | baris "Fase 3+ — POS, HR & Payroll: **Belum**" | POS Fase 2h, Payroll Fase 2o, seluruh Fase 3a–3f selesai |
| 6 | "pool 5 database tenant" | `apps/api/src/lib/tenantDb.ts:17` — `LOCAL_POOL` berisi **6** binding |
| 7 | dua baris ⏳ *Berlanjut* (tabel kartu-HP, cakupan dwibahasa) | ditutup Fase 18t ("tuntas") dan Fase 19u ("TUNTAS (0)") + 20m |

Ditambah satu yang ketahuan saat menyapu: "**Tujuh** butir lain menunggu
kredensial dari Anda" — jumlah sebenarnya **tiga**, dan enam dari tujuh bagian
penjelasnya sudah dihapus entah kapan tanpa memperbaiki kalimat penunjuknya.

## Yang dikerjakan

- Dua baris ⏳ diubah jadi ✅ **dengan menyebut fase yang menutupnya**. Barisnya
  sengaja **tidak dihapus**: keduanya memuat catatan kejujuran yang berharga
  sebagai jejak (7 tabel dikecualikan permanen karena dokumen cetak; cakupan
  dwibahasa yang sempat diklaim lebih jauh dari kenyataan).
- Tiga baris basi dihapus dari tabel tunggu-kredensial. Tiga yang tersisa
  (Google OAuth, `PLATFORM_ADMIN_EMAILS`, R2) memang masih menunggu pemilik.
- Angka gerbang ditulis ulang, **plus dua gerbang yang selama ini tak pernah
  disebut di bagian pemilik sama sekali**: typecheck dan lint (wajib sejak 12a).
- 5 → 6 database tenant; kalimat "tinggal diaktifkan" diselaraskan dengan Fase
  11a (jalurnya sudah diuji, tinggal saklar `TENANT_DB_MODE`).
- Bagian "Yang dikerjakan berikutnya" dibuang; `### Setelah Fase 22` yang sudah
  benar naik menjadi isinya.

## Validasi

Gerbangnya dijalankan bukan untuk membuktikan dokumen ini aman — tak ada kode
yang berubah — melainkan **untuk mendapatkan angka yang ditulis ke dokumen**.

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **441** (232 shared + 161 api + 48 web) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1057** |
| `node scripts/ui-sim.mjs` | 0 | **325/325** |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

Ketiga angka cocok persis dengan log 22f — tidak ada yang bergerak, sesuai
harapan untuk perubahan yang hanya menyentuh dokumen.

Pemeriksaan silang yang tidak ada alat otomatisnya:
`grep -n "Belum\|Menunggu\|⏳\|⏸" docs/STATUS.md`, tiap hasil dibaca satu per
satu dan dicocokkan ke baris tabel fase di atasnya. **Seluruh** hasil disapu,
bukan yang teringat — pelajaran dari 20l dan 21a. Sisa hasilnya sesudah
perbaikan: tiga baris ⏸ yang sah, dua narasi historis di dalam deskripsi fase,
dan tiga kalimat fitur yang kebetulan memakai kata "menunggu".

## Catatan kejujuran

**Temuan #1 seharusnya mustahil bertahan selama ini.** Tiap log fase sejak 12a
memuat tabel angka gerbang yang benar — 22f menulis 1057/325/441 dengan jelas.
Jadi angka yang benar selalu tersedia satu folder di sebelahnya; yang tidak
pernah terjadi adalah ada yang menyalinnya ke dokumen yang dibaca pemilik.
Ini pola yang sama persis dengan yang dicatat 19r dan 16r untuk terjemahan:
**hasilnya sudah dibuat, hanya tidak pernah disambungkan ke tempat yang
memakainya.** Kali ini korbannya dokumen, bukan layar.

**Fase ini tidak memasang penjaga apa pun.** Berkas yang sama bisa basi lagi
dalam 19 fase berikutnya dengan cara yang sama. Membuat gerbangnya bukan
pekerjaan sepele — angka gerbang bisa dicek otomatis, tetapi "apakah kalimat
ini masih benar" tidak bisa. Yang realistis adalah menjadikan pembacaan ulang
bagian bawah `STATUS.md` sebagai langkah tetap di tiap laporan akhir fase besar,
dan itu belum saya tuliskan sebagai aturan di `CLAUDE.md`. Dinyatakan apa adanya
supaya tidak terkesan masalahnya sudah tertutup.

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **Klaim "1.300+ uji otomatis" di halaman depan tidak diubah**
  (`apps/web/src/pages/landing/sections.ts:29` dan `i18n/ui.ts:2692`). Jumlah
  sebenarnya kini **1.823**. Klaimnya masih **benar** — Fase 18e sengaja
  membulatkannya ke bawah "supaya tetap benar meski jumlahnya bergerak", dan
  logika itu masih berlaku. Menaikkannya adalah keputusan penulisan iklan milik
  pemilik, bukan koreksi kesalahan, jadi tidak diambil sendiri di sini.
- **Tabel fase (baris 1–219) tidak disentuh sama sekali.** Bagian itu terbukti
  terpelihara; menyisirnya ulang tanpa alasan justru menambah risiko.
