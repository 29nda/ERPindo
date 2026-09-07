# Fase 55a — demo yang berubah menurut tanggal

## Bagaimana ini ditemukan

Bukan dicari. `ui-sim` memerah pada cek yang tidak disentuh perubahan apa pun
yang sedang saya kerjakan:

```
✗ F1b perusahaan demo menampilkan laba dengan margin sehat, bukan tipis atau rugi
  → terbaca "Rp 2.969.778" → 2969778 (ambang 4000000)
```

Langkah pertama: membuktikan ia bukan milik saya. `main` bersih dijalankan
ulang, dan `verifikasi-demo.mjs` — yang tidak menyentuh satu pun berkas yang
saya ubah — memberi angka yang **identik**. Bukan flake, bukan perubahan saya.

Yang membuatnya layak diusut sampai sebabnya: **penjaga berskala Fase 53a ikut
merah.**

```
✗ bulan berjalan (2026-09) untung dengan margin sehat → Rp 2.969.778 (ambang Rp 4.000.000)
✗ margin bulan berjalan sepadan dengan bulan riwayat → berjalan 2.8% vs median riwayat 5.7% (minimal 2.9%)
```

Penjaga itu ditulis persis supaya ambang rupiah tidak perlu disetel untuk
keempat kalinya. Kalau ia ikut merah, yang salah bukan ambangnya.

## Sebabnya

`seed-demo.mjs` menanggalkan pos-posnya dengan `daysAgo(n)` — `n` hari sebelum
hari ini. Untuk pos yang menentukan bulan sebuah angka laba-rugi, itu berarti
**bulannya berpindah menurut tanggal berapa demo disemai**:

| Pos | Nilai | Masuk bulan berjalan mulai tanggal |
|---|---|---|
| Beban listrik Bandung `daysAgo(6)` | Rp 1,2 jt | 7 |
| Beban listrik Jakarta `daysAgo(5)` | Rp 1,8 jt | 6 |
| Faktur ekspor USD `daysAgo(7)` | Rp 2,3 jt | 8 |
| Faktur termin proyek `daysAgo(8)` | Rp 8 jt | 9 |
| Jurnal termin proyek `daysAgo(10)` | Rp 7,5 jt | 11 |

**Bebannya masuk lebih dulu daripada pendapatannya.** Antara tanggal 6 dan 10
tiap bulan, bulan berjalan menanggung Rp 3 juta beban tanpa Rp 17,8 juta
pendapatan yang menyertainya. 7 September 2026 jatuh tepat di jendela itu.

Bukti pendukungnya ada di tabel bulanan, dan sudah lama terlihat tanpa pernah
dibaca sebagai gejala: **Agustus 2026 beromzet Rp 107,7 juta dengan laba
Rp 23,8 juta** — 22%, sementara bulan riwayat lain berkisar 4–7%. Agustus
"terlalu bagus" justru karena ia menahan pendapatan yang seharusnya milik
September.

## Kenapa ini kali keempat

`dalamBulanIni()` — helper yang menahan tanggal supaya tidak keluar dari bulan
berjalan — sudah ada sejak Fase 19b, **dan hanya dipakai blok grosir.**

| Fase | Yang dilakukan | Yang tidak |
|---|---|---|
| 19b | membuat `dalamBulanIni()`, dipakai blok grosir | pos lain tetap `daysAgo()` mentah |
| 21d | menambah faktur keempat | — |
| 51c | menambah faktur kelima + ambang rupiah di ui-sim | — |
| 53a | menaikkan omzet + penjaga berskala | — |

Tiga perbaikan terakhir menambah **uang**. Tidak satu pun menyentuh tanggalnya.
Karena itu tiap kali margin dinaikkan, cacatnya hanya menunggu pertumbuhan
berikutnya menipiskannya lagi — dan komentar Fase 53a sudah menuliskan
kesimpulan yang benar ("menambal saja sudah terbukti tidak cukup") tanpa
menemukan apa yang harus ditambal.

## Yang dikerjakan

**23 pos dikunci ke bulan berjalan.** Aturannya: medan tanggal yang menentukan
bulan sebuah angka laba-rugi atau masa pajak — `invoiceDate`, `entryDate`,
`disposalDate`, `receiptDate` — memakai `dalamBulanIni()` bila berselang di
bawah 30 hari.

Sengaja **bukan** semua medan tanggal. `dueDate`, `validUntil`, `expectedDate`,
dan `paymentDate` menggerakkan umur piutang dan antrean, bukan bulan sebuah
angka laba-rugi; menguncinya justru akan merusak demo umur piutang yang memang
harus menyeberang bulan.

Gelung riwayat enam bulan (`back` 45→3) juga dibiarkan: sebarannya memang
melintasi bulan, dan itu yang membuat trennya terlihat.

Hasilnya:

| Bulan | Sebelum | Sesudah |
|---|---|---|
| Agustus omzet | Rp 107,7 jt | Rp 89,9 jt |
| Agustus laba | Rp 23,8 jt (22%) | Rp 7,4 jt (8%) |
| September omzet | Rp 106,4 jt | Rp 124,2 jt |
| September laba | **Rp 2,97 jt (2,8%)** | **Rp 19,3 jt (15,5%)** |

Agustus kembali sejajar dengan bulan riwayat lain, dan September berhenti
bergantung pada tanggal.

## Penjaganya

`apps/web/test/demo-bulan-stabil.test.ts` (4 uji) menutup **sebabnya**, bukan
gejalanya: pos penentu bulan tidak boleh memakai `daysAgo()` berselang di bawah
30 hari, dan `dalamBulanIni()` sendiri harus masih benar-benar mengunci —
gerbang yang menuntut pemakaian fungsi yang sudah tidak melakukan apa-apa adalah
gerbang yang mati tanpa suara.

Ambang 30 hari dipilih karena ia menjamin tanggalnya di luar bulan berjalan pada
tanggal berapa pun, termasuk Februari. Offset di bawahnya — 25 hari, misalnya —
"kelihatan seperti bulan lalu" tetapi mendarat di bulan berjalan pada tanggal 26
ke atas; itu juga ditolak.

Diuji-negatif: satu beban dikembalikan ke `daysAgo(6)`, uji memerah menyebut
posnya, lalu dipulihkan.

## Satu balapan waktu yang ikut ditemukan CI

Jalan pertama di CI memerah pada cek yang tidak berhubungan: *"F54 batas kredit
dikosongkan tersimpan NULL"*. Lokal hijau dua kali pada commit yang sama.

Sebabnya balapan sungguhan, bukan sekadar lambat: formulir sunting kontak diisi
**setelah** data kontaknya tiba, jadi "terlihat" belum berarti "siap". Bila
batas kreditnya dikosongkan lalu disimpan sebelum itu, yang terkirim adalah
formulir setengah terisi — terminnya ikut kosong. Ceknya lalu memerah pada
paruh yang salah, dan penyelidik berikutnya akan mengira penyimpanan batas
kreditlah yang rusak.

Diperbaiki dengan menunggu **nilainya**, bukan menambah jeda tetap: jeda tetap
hanya memindahkan ambangnya ke runner yang lebih lambat lagi. Satu cek baru
ditambahkan supaya kegagalan berikutnya menyebut sebab yang benar.

## Validasi

| Gerbang | Hasil |
|---|---|
| typecheck · build · lint | lulus |
| uji unit | **1.287** (dari 1.283) |
| smoke | **1.351** (tidak berubah) |
| ui-sim | **506/506** (dari 505) |
| verifikasi-demo | **DEMO MASUK AKAL ✅** (dari 2 gagal) |
| sapu-warna · istilah · gaya | 0 pelanggaran |
| tautan dokumen | lulus |
