# Fase 22e — Kalender pajak Indonesia + notifikasi

## Yang dikerjakan

- `tenggatMasaPajak()`, `tenggatSptTahunan()`, `geserAkhirPekan()`,
  `tenggatMendatang()` — fungsi murni di `packages/shared/src/accounting.ts`.
- `GET /:tenantId/tax/calendar` (**baca-saja**) di `apps/api/src/routes/tax.ts`.
- Tab **Kalender pajak** di `apps/web/src/pages/pajak.tsx`, berikut penyetelan
  profil pajak di tempat yang sama.
- Tenggatnya ikut masuk lonceng notifikasi (`routes/tenants.ts`).

Tenggat mengikuti UU KUP & PMK: PPh 21/23 setor tanggal 10 & lapor tanggal 20
bulan berikutnya; PPh 25 dan PPh Final UMKM tanggal 15; SPT Masa PPN setor &
lapor akhir bulan berikutnya; SPT Tahunan 31 Maret (OP) / 30 April (badan).

## Yang benar-benar dijaga: PENYARINGAN, bukan tanggalnya

Tanggalnya ditutup 23 uji unit. Yang tidak bisa dijaga uji unit adalah hal yang
justru menentukan fitur ini berguna atau tidak: **apakah yang ditampilkan hanya
kewajiban yang benar-benar berlaku.** Kalender yang memuat SPT Masa PPN kepada
non-PKP melatih pemiliknya mengabaikan seluruh isinya — dan pengingat yang
diabaikan sama saja tidak ada.

Profilnya karena itu disetel eksplisit (PKP / PPh Final UMKM / badan usaha), dan
disetel **di tab kalendernya sendiri**, bukan disembunyikan di Pengaturan:
kalender yang salah paling mudah diperbaiki di tempat ia terlihat salah.

**"Punya karyawan" TIDAK ditanyakan** — itu satu-satunya dari keempat medan yang
bisa disimpulkan dengan aman, jadi dibaca dari jumlah karyawan aktif. Menebak
PKP dari adanya NPWP, atau badan usaha dari nama perusahaan, akan menampilkan
tenggat yang tidak berlaku.

## Arah kesalahan dipilih dengan sengaja

**Hari libur nasional & cuti bersama tidak diperhitungkan.** Daftarnya terbit
tiap tahun lewat SKB 3 Menteri dan berubah-ubah; menanamkannya di kode berarti
angka yang diam-diam usang tiap Januari.

Yang ditangani hanya akhir pekan, dan **selalu maju** — sama seperti aturan KUP,
yang juga menggeser tenggat maju bila jatuh pada hari libur. Konsekuensinya:
tenggat yang ditampilkan **tidak pernah lebih lambat** daripada tenggat
sesungguhnya. Paling buruk pemilik menyetor beberapa hari lebih awal;
kebalikannya adalah denda. Batas ini ditulis di layar, bukan disembunyikan.

## Validasi

| Gerbang | Hasil | Jumlah cek |
| --- | --- | --- |
| `pnpm typecheck` | 0 | — |
| `pnpm lint` | 0 | — |
| `pnpm test` | 0 | **427** (dari 404) |
| `pnpm build` | 0 | — |
| `pnpm smoke` | 0 | **1048** (dari 1036) |
| `node scripts/ui-sim.mjs` | 0 | **322/322** (dari 316) |
| `sapu-i18n` | 0 | utang atribut tetap **0** |

23 uji unit baru, 12 cek smoke (blok `11n3`), 6 cek ui-sim (`F43a`–`F43f`).

**Dibuktikan bisa gagal**, dikembalikan: penyaringan PKP dilepas
(`if (profil.pkp)` → `if (true)`) → `F43b` merah karena SPT Masa PPN muncul di
kalender perusahaan demo yang bukan PKP, sementara `F43a`, `F43c`, `F43d`,
`F43e` **tetap hijau**.

## Dua temuan pemeriksaan mata

**1. Daftarnya dibuka dengan tembok tunggakan.** Versi pertama memakai jendela
−60 s/d +120 hari dan mengurutkan menaik dari `sisaHari`, sehingga perusahaan
yang belum pernah melapor — persis perusahaan demo — membuka layar dengan
**14 baris "Terlambat" berturut-turut**. Itu bukan cuma jelek dipandang: daftar
pengingat yang dibuka dengan tunggakan melatih orang menutupnya, yaitu kerusakan
yang fitur ini ada untuk mencegah.

Jendelanya dipersempit ke −30 s/d +60 hari dan urutannya dibalik secara
bertingkat: yang **belum lewat** lebih dulu (paling dekat di atas), baru yang
terlambat (yang **paling baru** terlewat di atas — dendanya paling kecil dan
paling masuk akal dikejar hari ini). Yang lewat tidak disembunyikan, hanya
dipindah. Dijaga `F43e`.

**2. Tab kalender belum tersentuh cek dwibahasa.** Blok `F43` berjalan di mode
Indonesia, jadi sisi Inggrisnya tidak terjaga sama sekali. Ditambah `F43f` di
blok mode Inggris.

## Catatan kejujuran

Cek `F43b` versi pertama memeriksa **seluruh badan halaman** untuk teks
"SPT Masa PPN" — dan merah, padahal fiturnya benar: halaman Pajak punya **tab
bernama "SPT Masa PPN"**, jadi yang tertangkap adalah label tabnya, bukan isi
kalender. Kelas yang sama dengan pelajaran Fase 16e: **penanda yang menyentuh
sesuatu selain yang dimaksud**. Diperbaiki dengan memeriksa di dalam
`[data-uji="kp-tabel"]` saja.

## Yang TIDAK dikerjakan, dinyatakan apa adanya

- **Tidak ada pengingat lewat email/WhatsApp.** Tenggatnya muncul di lonceng
  notifikasi dan di halaman Pajak; mengirimkannya keluar aplikasi adalah
  pekerjaan tersendiri yang menyentuh `getMailer` dan preferensi per pengguna.
- **Tidak ada penandaan "sudah lapor".** Kalender menghitung tenggat, bukan
  memantau kepatuhan — ia tidak tahu apakah SPT-nya sudah dikirim. Menandainya
  butuh pencatatan bukti lapor, dan mengarang statusnya lebih berbahaya
  daripada menampilkan tenggat apa adanya.
- **PPh 21 muncul begitu ada karyawan aktif**, tanpa memeriksa apakah gajinya di
  atas PTKP. Perusahaan yang seluruh karyawannya di bawah PTKP tetap melihat
  pengingatnya — memilih sisi aman.
