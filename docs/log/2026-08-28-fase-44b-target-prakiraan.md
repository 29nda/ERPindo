# Fase 44b — Target & prakiraan penjualan

## Yang dikerjakan

- `packages/shared/src/crm.ts` — `PELUANG_TAHAP`, `TAHAP_BERJALAN`,
  `forecastTertimbang()`, `pencapaianTarget()`.
- Migrasi `0052_target_penjualan` — `sales_targets`, unik per
  `(salesperson_id, period)`.
- `apps/api/src/routes/crm.ts` — setel target + laporan target & prakiraan.
- `apps/web/src/pages/crm.tsx` — kartu target & prakiraan di halaman pipeline.

## Keputusan dan alasannya

**Realisasi memakai `dasarKomisi(..., "omzet")` yang sama dengan Fase 44a.**
Kalau target mengukur total berPPN sedangkan komisi mengukur subtotal, dua
angka pada layar yang sama akan mengukur hal berbeda dan tidak ada yang tahu
mana yang benar. Retur dikurangkan, faktur batal bernilai nol — di kedua
tempat, karena kodenya memang satu.

**Hanya targetnya yang disimpan; realisasi selalu dihitung dari faktur.**
Mengikuti pola anggaran (migrasi 0010). Angka jadi akan basi begitu ada retur
atau pembatalan.

**Prakiraan ditimbang per tahap, dan peluangnya DITAMPILKAN.** Menjumlahkan
seluruh nilai pipeline apa adanya selalu menghasilkan angka terlalu besar, dan
besarnya justru meyakinkan — itulah yang membuatnya berbahaya. Angka peluangnya
sendiri adalah **nilai baku yang lazim**, bukan hasil pengukuran atas data
perusahaan mana pun; karena itu layarnya memampangkannya apa adanya supaya
pemiliknya bisa menilai sendiri apakah cocok dengan pengalamannya.

**Prospek `won` tidak ikut prakiraan.** Nilainya sudah menjadi penjualan
sungguhan; menjumlahkannya lagi akan menghitung omzet yang sama dua kali.

**Target nol tidak berarti "tercapai 100%".** Sales yang belum diberi target
belum bisa dinilai, dan menampilkannya sebagai tercapai adalah kebohongan yang
menyenangkan. Barisnya tetap muncul dengan label "Belum bertarget" — bersama
realisasinya — karena sales yang menjual tanpa target adalah informasi, bukan
baris yang boleh hilang.

**Target boleh direvisi** (`ON CONFLICT DO UPDATE`), tetapi tidak boleh menjadi
dua baris: dua baris membuat pencapaian bergantung pada baris mana yang
kebetulan terbaca lebih dulu.

## Catatan kejujuran

**Saya membuat regresi dwibahasa, dan ui-sim menangkapnya.** Tabel prakiraan
saya memakai `LEAD_STAGE_LABELS` dari `packages/shared` — yang berbahasa
Indonesia saja. Cek `F0w` gagal: tahap lead tidak ikut berganti ke Inggris.
Yang memalukan, mekanisme yang benar (`LEAD_STAGE_KEY`) sudah ada di berkas
yang sama, lengkap dengan komentar sepuluh baris yang menjelaskan persis kenapa
ia ada. Saya menulis kode di bawah komentar itu tanpa membacanya.

**Uji saya sendiri lupa mengikat parameternya.** `SELECT ... WHERE
salesperson_id = ?` tanpa `.bind(sales)` — hasilnya kosong, dan ujinya gagal
menuduh skemanya. Bukan gerbang yang salah, melainkan ujinya.

**Tabrakan nama di berkas smoke.** `const fc` sudah dipakai
`stock-forecast` 700 baris di atas; Node menolak seluruh berkas dengan
`SyntaxError`, bukan hanya bagian barunya. Diganti `prakiraan`.

**`sapu-gaya` menolak judul keadaan kosong saya.** Kalimatnya sebenarnya
**tidak** buntu — langkah berikutnya ada di deskripsi tepat di bawahnya —
tetapi penyapu hanya bisa melihat satu untai sekaligus. Judulnya ditulis ulang
menjadi deskriptif, dan langkahnya tetap di deskripsi. Kaidahnya TIDAK
dilonggarkan: melemahkannya demi satu untai akan melemahkannya bagi semua.

## Validasi

- `pnpm typecheck` — lulus
- `pnpm test` — **1.035 lulus** (361 shared + 366 web + 308 api; naik dari 1.016)
- `pnpm build` — lulus
- `pnpm smoke` — **1.244 cek** (naik dari 1.230; 14 cek target & prakiraan)
- `node scripts/ui-sim.mjs` — **454/454** (naik dari 449; 5 cek)
- `pnpm lint` — bersih
- `sapu-i18n` 53 (tetap), `sapu-warna` 0, `sapu-istilah` bersih,
  `sapu-gaya` bersih, `periksa-tautan-dokumen` bersih
